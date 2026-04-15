---
name: self-evolve-product
description: Continuously learn from the codebase, track evolving product patterns, and update agent knowledge as the product grows. Use after completing significant features, discovering new architectural patterns, or when the product vision/shape becomes clearer through implementation.
---

# Self-Evolve Product

## Principle

The codebase is the source of truth for product behavior. As you build, observe patterns, infer intent, and update your own knowledge so future work is faster and more aligned with the product vision.

## What to Learn

While working, pay attention to:
- **New abstractions** — new hooks, services, modules, or utilities that become reusable
- **Naming conventions** — how the team names things (battles vs matches, shares vs size, etc.)
- **Data flows** — where state lives, how events propagate, how onchain and offchain sync
- **Product rules** — business logic that appears repeatedly (ELO calculation, fee routing, status transitions)
- **Visual language** — UI patterns, colors, spacing, animation conventions
- **Tech choices** — why specific libraries or patterns are preferred

## Capture Knowledge

### 1. Update Project Skills
When you discover a new stable pattern, update the relevant skill in `.github/skills/`:
- Add a new reference file if the topic is large
- Append a concise section to an existing reference
- Update `SKILL.md` if the high-level workflow changes

Example triggers:
- New contract is added → update `tradeclub-prediction-markets/references/contracts.md`
- New queue/job type is added → update `tradeclub-backend-patterns/references/bullmq.md`
- New frontend hook pattern emerges → update `tradeclub-frontend-patterns/references/wagmi.md`

### 2. Update AGENTS.md
If the project root or a subdirectory has an `AGENTS.md`, keep it current:
- New build steps
- Changed environment variables
- Updated architecture decisions
- Deprecated paths or modules

### 3. Document Inferred Vision
If repeated requests reveal a coherent product direction, write it down:
- Create or update `references/product-vision.md` inside this skill
- Note the user’s priorities, preferred tradeoffs, and long-term goals

## Vision Tracking Checklist

After every significant chunk of work, ask:
- [ ] Did I encounter a pattern I had not seen before?
- [ ] Is there a skill that should reflect this pattern?
- [ ] Did any `AGENTS.md` become outdated?
- [ ] Can I now describe the product’s next likely evolution?

If yes to any, make a small `docs(skills)` or `docs(agents)` commit.

## Behavioral Rules

- Do not wait for the user to ask you to update skills. Do it proactively.
- Keep skill updates concise. Prefer adding a reference file over bloating `SKILL.md`.
- If a pattern turns out to be temporary or experimental, note it as such rather than canonizing it.
- When conflicting patterns exist (e.g., old Drift code vs new Hyperliquid code), document the active path and mark the old path as deprecated.
