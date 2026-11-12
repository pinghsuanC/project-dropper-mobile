#!/usr/bin/env bash
# Bring local main up to date and delete local branches that are already merged.
#
# Exit codes:
#   0  done (see DELETED / KEPT lines)
#   2  uncommitted changes to tracked files; nothing was touched
#   1  a git command failed
#
# Output lines start with a tag so the skill can read them:
#   DIRTY <git status line>
#   DELETED <branch> (<reason>)
#   KEPT <branch> (<reason>)

set -uo pipefail

main=main

dirty=$(git status --porcelain --untracked-files=no)
if [ -n "$dirty" ]; then
  while IFS= read -r line; do echo "DIRTY $line"; done <<< "$dirty"
  exit 2
fi

git checkout -q "$main" || exit 1
git fetch -q --prune origin || exit 1
git pull -q --ff-only origin "$main" || exit 1

has_gh=0
command -v gh >/dev/null 2>&1 && has_gh=1

while IFS='|' read -r branch track; do
  [ "$branch" = "$main" ] && continue

  if git merge-base --is-ancestor "$branch" "$main"; then
    git branch -q -d "$branch" && echo "DELETED $branch (merged into $main)"
    continue
  fi

  if [ "$track" = "[gone]" ]; then
    # Squash-merged PRs leave the branch looking unmerged; ask GitHub instead.
    if [ "$has_gh" -eq 0 ]; then
      echo "KEPT $branch (remote gone, gh not available to check its PR)"
    elif [ -n "$(gh pr list --state merged --head "$branch" --json number --jq '.[].number' 2>/dev/null)" ]; then
      git branch -q -D "$branch" && echo "DELETED $branch (PR merged, remote gone)"
    else
      echo "KEPT $branch (remote gone, no merged PR)"
    fi
    continue
  fi

  if [ -z "$track" ] && ! git rev-parse -q --verify "refs/remotes/origin/$branch" >/dev/null; then
    echo "KEPT $branch (local only, not merged)"
  else
    echo "KEPT $branch (not merged)"
  fi
done < <(git for-each-ref --format='%(refname:short)|%(upstream:track)' refs/heads)

exit 0
