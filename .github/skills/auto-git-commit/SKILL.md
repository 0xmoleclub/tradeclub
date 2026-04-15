---
name: auto-git-commit
description: Automatically commit work in small, logical chunks with properly styled conventional commit messages. Use whenever making code changes to ensure progress is saved incrementally rather than bulk-committed at the end. Trigger after completing a coherent unit of work (feature slice, bug fix, refactor, test addition, or configuration update).
---

# Auto Git Commit

## Principle

Never let changes accumulate into a giant uncommitted blob. Commit incrementally as soon as a coherent unit of work is complete. This keeps history readable, makes rollbacks safe, and preserves progress.

## When to Commit

Commit immediately after any of the following:
- A single feature slice works (e.g., "add DTO", "implement service method", "wire up controller")
- A bug fix is verified
- A refactor is complete and tests pass
- A new test or test suite is added
- Configuration, schema, or dependency changes are applied
- Documentation or skills are updated
- A code review comment is addressed

If more than ~15 minutes have passed with uncommitted changes spanning multiple concerns, pause and split them into separate commits.

## Commit Message Format

Use **Conventional Commits**:

```
<type>(<scope>): <subject>

<body>
```

### Types
- `feat` — new feature
- `fix` — bug fix
- `refactor` — code change that neither fixes a bug nor adds a feature
- `test` — adding or correcting tests
- `docs` — documentation and skill updates
- `chore` — tooling, deps, config, build
- `style` — formatting only (no logic change)

### Scope
Optional but encouraged. Examples: `battle`, `prediction`, `hypercore`, `indexer`, `contracts`, `frontend`, `auth`, `prisma`, `skills`.

### Subject Rules
- Imperative mood ("add" not "added")
- No period at the end
- Max 72 characters
- Describe what and why, not how

### Body Rules
- Add a blank line after subject
- Explain motivation and contrast with previous behavior
- Wrap at 72 characters

## Examples

```
feat(battle): enqueue market creation after match found

Creates the default prediction question and outcomes per player
slot, then pushes a CREATE_MARKET job to the contract queue.
```

```
fix(lmsr): prevent negative delta in bid level calculation

Adds a 1e-12 epsilon guard so lmsrBidLevel returns null instead
of invalid negative proceeds when price is already at floor.
```

```
refactor(frontend): extract useQuoteBuy from BettingPanel

Isolates wagmi contract read logic into a reusable hook for
upcoming sell flow.
```

```
docs(skills): add self-evolve-product skill

Documents how to track product vision and update agent knowledge
as the codebase grows.
```

## Chunking Strategy

If multiple files changed, stage and commit by logical group:

```bash
git add backend/src/modules/battle/services/battle.service.ts
git commit -m "feat(battle): deploy prediction market on battle creation"

git add backend/prisma/schema.prisma
git commit -m "chore(prisma): add bScore to BattlePredictionQuestion"

git add frontend/src/hooks/useBuyShares.ts frontend/src/lib/contracts/prediction-market.ts
git commit -m "feat(frontend): implement USDC approve-and-buy flow"
```

## What NOT to Do

- Do NOT bulk-commit everything at the end of a session with a message like "various changes" or "wip".
- Do NOT mix unrelated concerns in one commit (e.g., a bug fix + dependency bump + unrelated refactor).
- Do NOT commit broken code intentionally.
