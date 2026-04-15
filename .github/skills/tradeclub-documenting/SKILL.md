---
name: tradeclub-documenting
description: Write and maintain high-quality documentation for the TradeClub codebase. Use when creating or updating READMEs, API docs, inline code comments, skill references, architecture decision records, or any explanatory text that helps current and future developers understand the system.
---

# TradeClub Documenting

## Principle

Documentation is code. It should be correct, concise, and located as close as possible to the thing it describes.

## Documentation Types

### 1. Inline Code Comments
- Explain **why**, not what
- Document non-obvious business logic, math, or assumptions
- Use JSDoc/TSDoc for exported functions, hooks, and services
- Keep comments current; outdated comments are worse than none

Good:
```ts
// LMSR spot price can underflow for large q_i/b ratios.
// We use the log-sum-exp trick with max-offset for stability.
```

Bad:
```ts
// This function calculates the price
```

### 2. READMEs
- `README.md` at project root: human-facing quick start, overview, contribution guide
- `backend/README.md`: API overview, env vars, common scripts
- Keep READMEs short; move deep detail to `AGENTS.md` or skill references

### 3. AGENTS.md
- Agent-facing knowledge: build steps, conventions, module maps, gotchas
- Update whenever build steps, env vars, or architecture change
- Project root `AGENTS.md` governs everything; nested ones override for their subtree

### 4. API Documentation
- Backend uses `@nestjs/swagger`; keep DTOs and controllers decorated
- Swagger available at `/docs` in dev
- For external consumers, maintain endpoint tables in `backend/README.md`

### 5. Skill References
- Located in `.github/skills/*/references/`
- Update when patterns stabilize or change
- Keep concise; use code snippets and file paths

### 6. Architecture Decision Records (ADRs)
If a decision is non-obvious and has lasting impact, write a brief ADR:
```
docs/adrs/001-lmsr-over-constant-product.md
```
Include: context, decision, consequences, date

## Writing Rules

1. **Be correct first** — run the code or check the schema before documenting behavior
2. **Be concise** — delete fluff; every sentence should earn its place
3. **Use imperative mood** — "Commit changes" not "You should commit changes"
4. **Include file paths** — when referencing code, give exact paths
5. **Show examples** — a 3-line code snippet beats a paragraph
6. **Version carefully** — if documenting a temporary state, mark it `(Deprecated)` or `(Experimental)`

## What to Document

| Trigger | What to write |
|---------|---------------|
| New module/service | Brief purpose, key public methods, file location |
| New queue/job | Job type, payload shape, processor location |
| New contract | Deployed addresses, ABI location, main functions |
| Env var added | Purpose, default, required/optional |
| Complex math | Formula, why it's needed, where it's implemented |
| Breaking change | Migration steps, what changed, why |

## What NOT to Document

- Do not write user manuals in the repo (README is quickstart only)
- Do not duplicate information that lives in generated docs (Swagger, Prisma Client)
- Do not document obvious code (`i++` increments `i`)

## Maintenance

When editing code, check if related documentation is stale:
- `AGENTS.md` mentions the file?
- A skill reference describes the pattern?
- A README lists the endpoint or env var?

If yes, update the doc in the same PR — or immediately after as a `docs()` commit.
