---
name: deep-tech-research
description: Investigate novel, cutting-edge, or poorly-documented technologies where standard search yields few results. Use when exploring new protocols, bleeding-edge SDKs, alpha-stage tools, or niche blockchain systems where documentation is sparse, fragmented, or nonexistent.
---

# Deep Tech Research

## Core Principle

When surface-level search fails, go deeper. Read source code, trace transactions, analyze bytecode, and synthesize from fragments. Never hallucinate missing details. If the answer truly isn't available, state that clearly and document what you found.

## When to Use This Skill

- Integrating a protocol with no docs or only a litepaper
- Debugging an alpha SDK where GitHub issues are the primary support channel
- Understanding a blockchain feature that launched last week
- Reverse-engineering a smart contract with no verified source
- Evaluating a new cryptography primitive or consensus mechanism

## The Anti-Pattern: Infinite Search Loop

**If you find yourself running the same query more than 3 times with no new signal, stop.**

Instead:
1. Change the research vector (source code, block explorer, raw tx data)
2. Reduce the scope of the question
3. Formulate a testable hypothesis
4. Accept that some information may be intentionally opaque

## Research Vectors

### 1. Read the Source Code
Docs lie. Code doesn't.

**Where to look:**
- GitHub repo (especially `/packages`, `/src`, `/contracts`, `/proto`)
- npm package source in `node_modules/`
- Foundry/Hardhat build artifacts
- Generated protobuf/GraphQL schemas

**How:**
- Find the entry point (the function the user asked about)
- Trace its call graph 2-3 levels deep
- Look for comments, TODOs, and revert strings
- Check tests — they often reveal intended behavior better than docs

### 2. Search by Code, Not Keywords
If docs don't exist, search for function signatures, event topics, or error selectors.

Examples:
- Search GitHub for `function buy(uint8 outcome` instead of "prediction market buy"
- Search for the exact error string: `"InvalidBScore()"`
- Search Etherscan verified contracts for a unique function signature

### 3. Onchain Archaeology
For blockchain tech:
- **Etherscan/BscScan/Solscan** — read verified contracts, trace transactions
- **Tenderly** — simulate transactions, inspect state changes
- **Blockscout** — trace internal calls
- **Explorer event logs** — filter by topic0 to see how a contract is actually used
- **MEV searchers / Dune dashboards** — reveal economic behavior the docs omit

### 4. Academic & Technical Papers
For cryptography, consensus, or game theory:
- arXiv, ePrint (IACR), Google Scholar
- Protocol whitepapers (but treat as marketing + lite math)
- Reference implementations in Python/Rust/Go

### 5. Community Archaeology
- **GitHub Issues/PRs** — search closed issues with `is:issue <error>`
- **Discord search** (if you have access) — search message history for error strings
- **Twitter/X advanced search** — `from:core_dev <feature>` or `"exact error"`
- **Reddit** — r/ethdev, r/solana, protocol-specific subs
- **Mirror / Paragraph** — protocol announcements and deep dives
- **YouTube / Twitch** — conference talks, live coding streams

### 6. Run Experiments
If you can't read it, run it.

- Spin up a local fork (`anvil`, `hardhat node`, `solana-test-validator`)
- Write a minimal reproduction script
- Call the function and log the result
- Fuzz inputs to find boundary behavior

## Research Protocol

### Phase 1: Scoped Search (5 min)
Run 2-3 targeted web searches. If you get signal, great. If not, move to Phase 2.

### Phase 2: Source Code Deep Dive (10 min)
Find the repository. Read the relevant files. Run tests. Trace the execution path.

### Phase 3: Onchain / Runtime Inspection (10 min)
If it's deployed, inspect live state. If it's a library, write a test script.

### Phase 4: Synthesis or Surrender (5 min)
- **If you found enough:** Summarize with confidence levels. Cite file paths, tx hashes, or line numbers.
- **If you found fragments:** State what is known, what is inferred, and what remains unclear.
- **If you found nothing after 30 min:** Report that public information is insufficient. Suggest how to get the answer (ask a core dev, read private docs, run a specific experiment).

## Confidence Levels

Always label your conclusions:
- **Certain** — read directly from source code or verified onchain data
- **Highly likely** — inferred from multiple consistent sources
- **Speculative** — educated guess based on partial information; may be wrong
- **Unknown** — no reliable information found

## Documentation Debt

If the research reveals something reusable, **pay it forward**:
1. Update the relevant skill in `.github/skills/`
2. Add a note to `AGENTS.md` if it's a build/config gotcha
3. Write a brief reference file documenting the finding
4. Commit as `docs(skills): ...`

This prevents the next agent (or future you) from repeating the same 30-minute archaeology.

## What NOT to Do

- Do not trust ChatGPT summaries of unknown protocols as primary sources.
- Do not guess parameter meanings when you can read the type definitions.
- Do not continue running the same search query with tiny variations.
- Do not present speculation as fact.
- Do not ignore contradictory evidence.
