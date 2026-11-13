---
name: current-feature
description: Track one feature at a time through load, start, review and complete, and append planned features with future, using context/tracker/current-feature.md as the source of truth. Use when the user runs /current-feature with one of those actions.
argument-hint: load [prompt-file | description] | start | review | complete | future <description>
disable-model-invocation: true
---

# Current feature tracking

Manage the feature that is being worked on in this repo. The tracker file is
`context/tracker/current-feature.md`. Only one feature is tracked at a time.

Action: `$ARGUMENTS`

The first word is the action (`load`, `start`, `review`, `complete`, `future`). Anything after
it is the action's input. If the action is missing or unknown, list the five actions with one
line each and stop.

## Tracker file format

Keep the tracker in exactly this shape. `## Details` is empty between features.

```markdown
# Current Feature

- Status: Not Started | In Progress
- Branch: <feature branch, or empty>

## Details

<implementation details, written by load>

# History

- YYYY-MM-DD: <details>

# Future Features

<!-- Only change this section when the user asks, through /current-feature future. -->

<planned features, grouped by app section>
```

History is newest first. Never edit or remove existing history entries.

`# Future Features` belongs to the user. Only the `future` action changes it, and only by
appending. `load`, `start`, `review` and `complete` never edit it, and never remove an item
because it was built. Edit or remove an existing item only when the user asks for that
change in words.

## Shared steps

### Local branch cleanup

Run the script in this skill's folder:

```bash
bash .claude/skills/current-feature/cleanup-branches.sh
```

It checks out `main`, fetches with prune, fast-forwards `main`, then deletes local branches
that are merged into `main`, or whose remote is gone and whose PR GitHub shows as merged.
It never deletes `main` or unmerged work.

Read its exit code:

- **0**: report the `DELETED` and `KEPT` lines to the user in a short list. Don't delete any
  `KEPT` branch unless the user asks.
- **2**: tracked files have uncommitted changes, and the script changed nothing. Show the
  `DIRTY` lines and ask the user what to do with them. Never stash, reset or discard changes
  on your own. Run the script again once the tree is clean.
- **1**: a git command failed (often a network problem or a `main` that can't fast-forward).
  Show the error and stop.

### Commit messages

Each feature is one commit, made by `complete`. Its message is written for a person reading
`git log`:

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
npx expo lint
```

If any of these can't run (for example a missing `test` script), report it and stop. Don't
install or configure tooling as part of a feature.

## load

1. If the tracker's status is `In Progress`, stop. Tell the user which feature is in progress
   and ask whether to finish it first or replace it.
2. Run **Local branch cleanup**.
3. Work out the feature:
   - **Prompt file given**: find it. Try the path as given, then search `context/requirements/`,
     then the rest of `context/`. If several files match, ask which one. If none match, say so
     and stop.
   - **No prompt file**: use the description the user gave after `load`. If there is no
     description either, ask what the feature is and stop.
4. Read the related material:
   - matching screenshots in `context/prototypes/`
   - the "How the app works", API contract, crypto and UI rules in `CLAUDE.md`
   - existing code the feature touches
5. Write `## Details` with these sections. Where the source is unclear, write the question
   under **Open questions** instead of guessing.
   - **Source**: the prompt file path, or "user description"
   - **Goal**: one or two sentences
   - **Requirements**: a checklist, one item per testable behavior
   - **Out of scope**: what this feature does not include
   - **API routes**: each server route used, with request and response fields from the
     contract in `CLAUDE.md`
   - **Screens and components**: Expo Router screens in `src/app/` and components to
     add or reuse
   - **Test plan**: the unit tests to write first, per requirement, per API route and per screen
   - **Implementation steps**: ordered, small steps
   - **Open questions**
6. Set `Status: Not Started` and leave `Branch:` empty.
7. Show the user a short summary and the open questions. Do not create a branch or write code.

## start

1. Read the tracker. If `## Details` is empty, stop and ask the user to run `load` first.
   If the status is already `In Progress`, check out the recorded branch, skip steps 2–4,
   and continue from where the work left off.
2. Run **Local branch cleanup**.
3. Create the feature branch from the updated `main`: `git checkout -b feature/<kebab-case-name>`.
4. Set `Status: In Progress` and `Branch: feature/<kebab-case-name>`.
5. Write tests before the code, following the **Test plan**:
   - Write the tests from the requirements, not from an implementation.
   - Run them and confirm each one fails on its assertion, not on an import or syntax error.
   - For each API route the feature uses, add tests for the `api/client.ts` call: the exact
     snake_case request body, the auth header, envelope unwrapping, and every error status
     the contract lists for that route.
   - For each screen added or changed, add a `@testing-library/react-native` test for what
     it renders and how it responds to user actions.
   - Mock `expo-secure-store` and `fetch`. Tests never reach a real server.
6. Implement until the tests pass. Then briefly break each behavior and confirm its test
   fails, and restore it.
7. Do not commit. Leave all changes uncommitted on the feature branch; `complete` makes the
   feature's single commit. If the work grows too large for one reviewable commit, stop and
   suggest how to split it into smaller features.

## review

Do not change code during review. Report findings and ask before fixing anything.

1. Confirm you're on the tracker's `Branch:`. If not, stop and say so.
2. Run **Checks**. Report failures in full.
3. Coverage. Show it to the user as tables, not just flagged problems.
   - Find the feature's source files: `git diff --name-only main` plus new files from
     `git ls-files --others --exclude-standard`. Keep `.ts`/`.tsx` files and leave out test
     files.
   - Run Jest with coverage collected from exactly those files, so a file no test imports
     shows as 0% instead of being left out:
     `npx jest --coverage --coverageReporters=text --coverageReporters=json-summary
     --collectCoverageFrom=<file>` (one `--collectCoverageFrom` per file).
   - Show a table of the feature's files, using the numbers from
     `coverage/coverage-summary.json`:

     | File | Statements | Branches | Functions | Lines | Uncovered lines |
     |---|---|---|---|---|---|

     Mark any number below 80% with ⚠️. Add a final row with the totals for these files.
   - Then run `npx jest --coverage --coverageReporters=text-summary` and show the
     whole project's totals as a second, one-row table, so the feature's effect on overall
     coverage is visible.
   - Under the tables, for each ⚠️ file, name the untested behavior in plain words (for
     example "the 409 retry path in `register()`"), not just line numbers.
4. Review the uncommitted changes against `main` (`git diff main`, and read the new files in
   full):
   - **Scope**: changes not covered by **Requirements**, or items listed under
     **Out of scope** that were built anyway.
   - **Quality**: the rules in `CLAUDE.md`: no `fetch` outside `api/client.ts`, no `any` in
     API types, crypto only in `lib/crypto.ts`, storage only in `lib/storage.ts`, colors only
     from `theme.ts`, nothing logs the private key, tokens or presigned URLs. Also dead
     code, missing error handling and unclear names.
   - **Reusability**: repeated UI or styles that belong in `components/`, duplicated logic
     that belongs in `lib/`, and screens not built from the shared components.
   - **Exposed environment variables**: run check 0, "Exposed secrets and environment
     variables", from `.claude/skills/code-reviewer/SKILL.md`, following its rules,
     including never printing a secret's value. Any finding is a must fix, and the feature
     is not ready for `complete` until it's resolved.
5. Tick off the **Requirements** checklist items that the code and tests cover.
6. Give a report in this order: check results, the coverage tables, then findings grouped
   as must fix, should fix, suggestions. End with whether the feature is ready for `complete`.

## complete

1. Confirm you're on the tracker's `Branch:` with `Status: In Progress`. If not, stop.
2. Run **Checks**. If tests, type check or lint fail, stop and report. Do not open a PR.
3. Draft, but don't write or commit yet:
   - The history entry: `- YYYY-MM-DD: <details>`, using today's date and a one-line,
     plain-English summary of what the feature added (for example
     `2026-11-11: Pair with the desktop by scanning its QR code`).
   - The commit message, following **Commit messages**.
4. Show the user, and wait for approval:
   - The history entry.
   - The commit message.
   - The files that will go into the commit (`git status --short`). Point out any that look
     unrelated to the feature.

   Apply any changes the user asks for. Continue only after the user approves.
5. Update the tracker:
   - Add the approved history entry at the top of `# History`.
   - Clear `## Details`.
   - Set `Status: Not Started` and empty `Branch:`.
6. Stage the approved files and the tracker, and make one commit with the approved message.
7. `git push -u origin <branch>`. Never force-push.
8. Open the PR: `gh pr create --base main --head <branch>`. Title: the feature summary
   in plain English. Body: what changed, the requirements met, and the check results. No
   attribution line in the body.
9. Give the user the PR link. Do not merge it or enable auto-merge. CI will handle merging
   once it is set up.

## future

Append planned features to `# Future Features`. Works at any time, including while a
feature is in progress, because it never touches `Status`, `Branch` or `## Details`.

1. Take the description after `future`. It may hold several items. If there is none, ask
   what to add and stop.
2. For each item, pick its group from the section's headings (the prototype's dev-menu
   sections, plus `Whole app`). If none fits or the choice is unclear, ask: offer the closest
   group or a new heading.
3. Write each item as one plain-English line. Keep the user's meaning and details; don't add
   requirements they didn't give.
4. Append each line at the end of its group. Don't reorder, reword or remove existing items.
5. Show the user the lines added and their groups. Don't commit.
