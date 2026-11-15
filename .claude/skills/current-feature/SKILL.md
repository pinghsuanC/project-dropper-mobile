---
name: current-feature
description: Track one feature at a time, split into parts when it's large, through load, start, review, complete-part and complete, and append planned features with future, using context/tracker/current-feature.md and current-feature-parts.md as the source of truth. Use when the user runs /current-feature with one of those actions.
argument-hint: load [prompt-file | description] | start | review | complete-part | complete | future <description>
disable-model-invocation: true
---

# Current feature tracking

Manage the feature that is being worked on in this repo. Only one feature is tracked at a
time. Two files hold its state:

- `context/tracker/current-feature.md`: the feature's **Scope**, the part being worked on,
  its details, the history and the planned features.
- `context/tracker/current-feature-parts.md`: the feature's parts, the ones still to do
  and the ones done.

Action: `$ARGUMENTS`

The first word is the action (`load`, `start`, `review`, `complete-part`, `complete`,
`future`). Anything after it is the action's input. If the action is missing or unknown,
list the six actions with one line each and stop.

## Features, parts and branches

- A **feature** is what `## Scope` names. A small one is done in a single part; a large one
  is split into **parts**, each loaded, built, reviewed and merged on its own.
- A **part** is one `load` → `start` → `review` → `complete-part` cycle: one part branch
  `feature/<kebab-case-name>`, one commit, one PR.
- A split feature has a **feature branch** `feature-branch-<kebab-case-name>`. Every part
  branch starts from it and its PR merges into it. Once all parts are in, `complete` opens
  one PR into `main`, from a wrap-up branch cut from the feature branch (the feature
  branch only takes changes through PRs).
- **Base branch**: the tracker's `Feature branch:` when it's set, otherwise `main`. Part
  branches start from it, `review` compares against it, and part PRs target it.

`## Scope` **persists until the whole feature is in `main`**. Only `load` (when Scope is
empty) and `complete` change it. In particular, finishing a part never clears it.

## Tracker file format

Keep `current-feature.md` in exactly this shape. `## Details` is empty between parts.
`## Scope` is empty only between features.

```markdown
# Current Feature

## Scope

- Feature: <the whole feature, or empty>
- Feature branch: <feature-branch-<name>, or empty when the feature is a single part>
- Parts: [current-feature-parts.md](current-feature-parts.md)

## Current part

- Status: Not Started | In Progress
- Branch: <part branch, or empty>

## Details

<implementation details of the current part, written by load>

# History

- YYYY-MM-DD: <details>

# Future Features

<!-- Only change this section when the user asks, through /current-feature future. -->

<planned features, grouped by app section>
```

Keep `current-feature-parts.md` in this shape:

```markdown
# Feature Parts

<one-paragraph note: what this file is>

## Next

### Part N: <title>

<notes worked out so far: source, goal, requirements, open questions>

## Done

- YYYY-MM-DD: Part N: <title> (#<PR number, when known>)
```

`## Next` is in the order the parts will be built; `## Done` is newest first.

History is newest first and gets one entry per part. Never edit or remove existing history
entries.

`# Future Features` belongs to the user. Only the `future` action changes it, and only by
appending. No other action edits it or removes an item because it was built. Edit or remove
an existing item only when the user asks for that change in words.

## Shared steps

### Local branch cleanup

Run the script in this skill's folder, passing the tracker's `Feature branch:` when it's set:

```bash
bash .claude/skills/current-feature/cleanup-branches.sh [feature-branch]
```

It checks out `main`, fetches with prune, fast-forwards `main`, then deletes local branches
that are merged into `main`, or whose remote is gone and whose PR GitHub shows as merged.
It never deletes `main`, the feature branch it was given, or unmerged work. With a feature
branch, it then checks that branch out and fast-forwards it. The last line, `ON <branch>`,
says where it left you.

Read its exit code:

- **0**: report the `DELETED` and `KEPT` lines to the user in a short list. Don't delete any
  `KEPT` branch unless the user asks. A `MISSING <branch>` line means the feature branch
  doesn't exist yet; `start` creates it.
- **2**: tracked files have uncommitted changes, and the script changed nothing. Show the
  `DIRTY` lines and ask the user what to do with them. Never stash, reset or discard changes
  on your own. Run the script again once the tree is clean.
- **1**: a git command failed (often a network problem or a branch that can't
  fast-forward). Show the error and stop.

### Commit messages

Each part is one commit, made by `complete-part` (or by `complete` for a feature with no
feature branch). Its message is written for a person reading `git log`:

- Subject: under 60 characters, plain English, saying what changed for the app or the
  user. For example "Add QR scanner to the pairing screen", not "update files" or
  "fix(pair): impl useScan hook + refactor".
- No file lists, hashes, step numbers or internal shorthand in the subject.
- Add a short body only when the reason for the change isn't obvious from the subject.
- No attribution: no `Co-Authored-By` line, no "Generated with Claude Code".

### Checks

Run all of these and report each result:

```bash
npm test
npx jest --coverage
npx tsc --noEmit
npm run lint
```

These match the CI workflow (`.github/workflows/ci.yml`). `npm run lint` fails on any
warning (`--max-warnings 0`), as CI does.

If any of these can't run (for example a missing `test` script), report it and stop. Don't
install or configure tooling as part of a feature.

### Open a PR

`git push -u origin <head>` (never force-push), then
`gh pr create --base <base> --head <head>`. Title: plain English. Body: what changed, the
requirements met, and the check results. No attribution line in the body. Give the user the
PR link. Don't merge it yourself: CI runs lint, type check and unit tests, then
squash-merges the PR into its base and deletes its head branch once all three pass. If a
check fails, report it; fix it on the branch only when the user asks, and never force-push.

## load

Plan the next part into `## Details`.

1. If the current part's status is `In Progress`, stop. Tell the user which part is in
   progress and ask whether to finish it first or replace it.
2. Run **Local branch cleanup**.
3. Work out what to load:
   - **Prompt file given**: find it. Try the path as given, then search
     `context/requirements/`, then the rest of `context/`. If several files match, ask which
     one. If none match, say so and stop.
   - **Description given**: use it.
   - **Nothing given**: take the first part under `## Next` in the parts file. If that's
     empty too, ask what the feature is and stop.
4. Set up the scope:
   - **Scope already set** (a feature is under way): the new work is the feature's next
     part. If it doesn't belong to that feature, say so and ask whether to finish the
     feature first (`complete`) or add it as a part anyway.
   - **Scope empty**: fill in `Feature:`. If the work is too large for one reviewable
     commit, or the user asks for parts, propose a split into parts and a feature branch
     name `feature-branch-<kebab-case-name>`; after the user agrees, set
     `Feature branch:`. Otherwise leave `Feature branch:` empty: the single part merges
     into `main`.
5. Read the related material:
   - matching screenshots in `context/prototypes/`
   - the "How the app works", API contract, crypto and UI rules in `CLAUDE.md`
   - existing code the part touches
6. Write `## Details` for **this part only**, with these sections. Where the source is
   unclear, write the question under **Open questions** instead of guessing.
   - **Source**: the prompt file path, "user description", or "parts file: Part N"
   - **Goal**: one or two sentences
   - **Requirements**: a checklist, one item per testable behavior
   - **Out of scope**: what this part does not include (name the later parts)
   - **API routes**: each server route used, with request and response fields from the
     contract in `CLAUDE.md`
   - **Screens and components**: Expo Router screens in `src/app/` and components to
     add or reuse
   - **Test plan**: the unit tests to write first, per requirement, per API route and per
     screen
   - **Implementation steps**: ordered, small steps
   - **Open questions**
7. Store the later parts: write each one as a `### Part N: <title>` block at the end of
   `## Next` in the parts file, with what's known so far. If this part came from `## Next`,
   remove its block there (it now lives in `## Details`).
8. Set `Status: Not Started` and leave `Branch:` empty.
9. Show the user a short summary: the scope, this part, the parts stored for later, and the
   open questions. Do not create a branch or write code.

## start

1. Read the tracker. If `## Details` is empty, stop and ask the user to run `load` first.
   If the status is already `In Progress`, check out the recorded branch, skip steps 2–4,
   and continue from where the work left off.
2. Run **Local branch cleanup**.
3. Make sure the base branch exists and is current:
   - No feature branch: you're on the updated `main`.
   - Feature branch on `origin`: the script left you on it, fast-forwarded.
   - Feature branch `MISSING`: create it from the updated `main`
     (`git checkout -b <feature-branch>`) and push it (`git push -u origin <feature-branch>`)
     so part PRs can target it.
4. Create the part branch from the base branch: `git checkout -b feature/<kebab-case-name>`.
5. Set `Status: In Progress` and `Branch: feature/<kebab-case-name>`.
6. Write tests before the code, following the **Test plan**:
   - Write the tests from the requirements, not from an implementation.
   - Run them and confirm each one fails on its assertion, not on an import or syntax error.
   - For each API route the part uses, add tests for the `api/client.ts` call: the exact
     snake_case request body, the auth header, envelope unwrapping, and every error status
     the contract lists for that route.
   - For each screen added or changed, add a `@testing-library/react-native` test for what
     it renders and how it responds to user actions.
   - Mock `expo-secure-store` and `fetch`. Tests never reach a real server.
7. Implement until the tests pass. Then briefly break each behavior and confirm its test
   fails, and restore it.
8. Do not commit. Leave all changes uncommitted on the part branch; `complete-part` (or
   `complete`, for a single-part feature) makes its single commit. If the work grows too
   large for one reviewable commit, stop and suggest how to split it; the split-off parts
   go under `## Next` in the parts file.

## review

Do not change code during review. Report findings and ask before fixing anything.

1. Confirm you're on the tracker's `Branch:`. If not, stop and say so.
2. Run **Checks**. Report failures in full.
3. Coverage. Show it to the user as tables, not just flagged problems.
   - Find the part's source files: `git diff --name-only <base>` plus new files from
     `git ls-files --others --exclude-standard`. Keep `.ts`/`.tsx` files and leave out test
     files.
   - Run Jest with coverage collected from exactly those files, so a file no test imports
     shows as 0% instead of being left out:
     `npx jest --coverage --coverageReporters=text --coverageReporters=json-summary
     --collectCoverageFrom=<file>` (one `--collectCoverageFrom` per file).
   - Show a table of the part's files, using the numbers from
     `coverage/coverage-summary.json`:

     | File | Statements | Branches | Functions | Lines | Uncovered lines |
     |---|---|---|---|---|---|

     Mark any number below 80% with ⚠️. Add a final row with the totals for these files.
   - Then run `npx jest --coverage --coverageReporters=text-summary` and show the
     whole project's totals as a second, one-row table, so the part's effect on overall
     coverage is visible.
   - Under the tables, for each ⚠️ file, name the untested behavior in plain words (for
     example "the 409 retry path in `register()`"), not just line numbers.
4. Review the uncommitted changes against the base branch (`git diff <base>`, and read the
   new files in full):
   - **Scope**: changes not covered by **Requirements**, or items listed under
     **Out of scope** (including later parts) that were built anyway.
   - **Quality**: the rules in `CLAUDE.md`: no `fetch` outside `api/client.ts`, no `any` in
     API types, crypto only in `lib/crypto.ts`, storage only in `lib/storage.ts`, colors only
     from `theme.ts`, nothing logs the private key, tokens or presigned URLs. Also dead
     code, missing error handling and unclear names.
   - **Reusability**: repeated UI or styles that belong in `components/`, duplicated logic
     that belongs in `lib/`, and screens not built from the shared components.
   - **Exposed environment variables**: run check 0, "Exposed secrets and environment
     variables", from `.claude/skills/code-reviewer/SKILL.md`, following its rules,
     including never printing a secret's value. Any finding is a must fix, and the part is
     not ready to complete until it's resolved.
5. Tick off the **Requirements** checklist items that the code and tests cover.
6. Give a report in this order: check results, the coverage tables, then findings grouped
   as must fix, should fix, suggestions. End with whether the part is ready for
   `complete-part` (or `complete`, for a single-part feature).

## complete-part

Finish the current part and merge it into the **feature branch**. Scope stays as it is.

1. Confirm `Feature branch:` is set, and you're on the tracker's `Branch:` with
   `Status: In Progress`. With no feature branch, stop and use `complete` instead.
2. Run **Checks**. If tests, type check or lint fail, stop and report. Do not open a PR.
3. Draft, but don't write or commit yet:
   - The history entry: `- YYYY-MM-DD: <details>`, using today's date and a one-line,
     plain-English summary of what the part added (for example
     `2026-11-11: Pair with the desktop by scanning its QR code`).
   - The commit message, following **Commit messages**.
4. Show the user, and wait for approval:
   - The history entry.
   - The commit message.
   - The files that will go into the commit (`git status --short`). Point out any that look
     unrelated to the part.
   - The PR target: the feature branch.

   Apply any changes the user asks for. Continue only after the user approves.
5. Update the tracker files:
   - `current-feature.md`: add the approved history entry at the top of `# History`, clear
     `## Details`, set `Status: Not Started` and empty `Branch:`. Leave `## Scope` alone.
   - `current-feature-parts.md`: add `- YYYY-MM-DD: Part N: <title>` at the top of
     `## Done`.
6. Stage the approved files and both tracker files, and make one commit with the approved
   message.
7. **Open a PR** with head = the part branch, base = the feature branch.
8. Say what's next: the first part under `## Next`, or, when `## Next` is empty, that the
   feature is ready for `complete`.

## complete

Finish the **whole feature** and merge it into `main`.

### Feature with no feature branch (a single part)

Do `complete-part` steps 2–6 on the part branch, except that step 5 also clears `## Scope`
(empty `Feature:` and `Feature branch:`) and empties both sections of the parts file. Then
**Open a PR** with head = the part branch, base = `main`.

### Feature with a feature branch

1. Confirm no part is in progress: `Status: Not Started`, `Branch:` empty, `## Details`
   empty. If a part is in progress, stop and ask the user to `complete-part` it first.
2. Check `## Next` in the parts file. If it still lists parts, show them and ask whether to
   build them first or finish the feature without them. Parts left out are dropped from the
   parts file; mention them to the user so they can add them with `future`.
3. Run **Local branch cleanup**, so you're on the feature branch, up to date with `origin`,
   with every part PR merged. If a part PR is still open, stop and say which.
4. Run **Checks** on the feature branch. If tests, type check or lint fail, stop and report.
5. Draft, but don't write or commit yet:
   - The history entry for the whole feature: `- YYYY-MM-DD: <details>`, one line saying
     what the feature added as a whole.
   - The PR title (plain English, under 60 characters; it becomes the squash commit on
     `main`) and body: the feature in a few lines, then each part from `## Done` with its
     PR, then the check results.
   - The message for the wrap-up commit that records this in the tracker (for example
     `Wrap up the routes and basic pages feature`).
6. Show the user all three and the PR target (`main`), and wait for approval. Apply any
   changes they ask for.
7. Update the tracker files: add the history entry at the top of `# History`; clear
   `## Scope` (empty `Feature:` and `Feature branch:`); empty `## Next` and `## Done` in the
   parts file, keeping its headings and note.
8. Create a wrap-up branch from the feature branch
   (`git checkout -b feature/wrap-up-<kebab-case-name>`), commit only the two tracker files
   on it with the approved wrap-up message, and push it
   (`git push -u origin feature/wrap-up-<kebab-case-name>`, never force).
   **Never push to the feature branch itself.** A repository rule requires all 3 CI checks
   on `feature-branch-*` branches, so a direct push is refused (`GH013`). And don't open
   the PR from the feature branch either: its commits have all passed CI, so CI would
   merge that PR into `main` before the wrap-up commit could reach it.
9. **Open a PR** with head = the wrap-up branch, base = `main`. It holds every part plus
   the wrap-up commit. CI squash-merges it into `main` and deletes the wrap-up branch.
10. The feature branch stays on `origin` after the merge. Tell the user, and delete it
    (`git push origin --delete <feature-branch>`, then `git branch -D <feature-branch>`)
    only if they ask. Its commits are in `main` as one squash commit, so git won't see the
    local branch as merged.

## future

Append planned features to `# Future Features`. Works at any time, including while a
feature or part is in progress, because it never touches `## Scope`, `## Current part`,
`## Details` or the parts file.

1. Take the description after `future`. It may hold several items. If there is none, ask
   what to add and stop.
2. For each item, pick its group from the section's headings (the prototype's dev-menu
   sections, plus `Whole app`). If none fits or the choice is unclear, ask: offer the closest
   group or a new heading.
3. Write each item as one plain-English line. Keep the user's meaning and details; don't add
   requirements they didn't give.
4. Append each line at the end of its group. Don't reorder, reword or remove existing items.
5. Show the user the lines added and their groups. Don't commit.
