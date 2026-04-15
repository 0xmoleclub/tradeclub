---
name: git-collaboration-resolve
description: Resolve merge conflicts and collaborate safely with other developers using Git. Use when pulling remote changes, rebasing, merging branches, resolving conflicts, or working in a shared repository with other contributors.
---

# Git Collaboration & Conflict Resolution

## Safety First

You are working in a shared repository. Avoid destructive operations on shared history.

### Forbidden on Shared Branches
- `git push --force` or `git push --force-with-lease` without explicit user confirmation
- `git reset --hard` on branches others may depend on
- rewriting history of `main`, `master`, `develop`, or any active team branch

## Conflict Resolution Workflow

### 1. Detect Conflicts
```bash
git status
```

### 2. Understand the Conflict
Open each conflicted file and identify:
- `<<<<<<< HEAD` — your changes
- `=======` — separator
- `>>>>>>> branch-name` — incoming changes

Read the surrounding code to understand intent. Do not blindly accept one side.

### 3. Resolve
- Pick the best integration of both changes
- Remove all conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
- Ensure the file compiles/tests pass afterward
- If a conflict spans a function signature and its call sites, update all references consistently

### 4. Verify
```bash
grep -r "<<<<<<<" . --include="*.*" || echo "No conflict markers remaining"
```

### 5. Stage and Commit
```bash
git add <resolved-files>
git commit -m "resolve merge conflict in <scope>"
```

Use a descriptive message:
```
resolve(auth): merge conflict between jwt refresh and role guard

Keeps the new role guard logic while adopting the shorter token
lifetime from the jwt refresh branch.
```

## Rebase vs Merge

### Prefer Merge When
- Working on a long-lived feature branch with many contributors
- You want to preserve branch topology and PR history

### Prefer Rebase When
- You are the sole author of a local feature branch
- You want a linear history before opening a PR

### Safe Rebase Workflow
```bash
git fetch origin
git rebase origin/main
# resolve conflicts iteratively
git rebase --continue
```

If rebase goes wrong:
```bash
git rebase --abort
```

## Collaboration Etiquette

- Pull before you push: `git pull --rebase origin main` (if local-only changes)
- Keep PRs small and focused
- Run tests before pushing
- Do not commit secrets, `.env` files, or generated build artifacts
- Update skills/docs if your change alters a documented pattern

## Handling Stale Branches

If a branch is far behind `main`:
1. `git fetch origin`
2. `git merge origin/main` or `git rebase origin/main`
3. Resolve conflicts
4. Run tests
5. Push (force only if you are the sole user of the branch and have confirmed)
