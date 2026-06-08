# Pipeline Lean Redesign — Brainstorm Synthesis

## External Research Summary

### Sources
- Anthropic: [Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), [Writing tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents), [Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system), [Long-running agent harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- OpenAI: [Harness engineering](https://openai.com/index/harness-engineering/), [Codex harness](https://openai.com/index/unlocking-the-codex-harness/)
- Research: [Context Rot (Chroma)](https://research.trychroma.com/context-rot), [Maximum Effective Context Window](https://arxiv.org/abs/2509.21361), [GitHub agents.md analysis](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)

### Key Findings

1. **Context rot is real and measurable.** Performance degrades 15-30% at 8K-16K instruction tokens. After 10 tool calls (~80K tokens), agents forget earlier instructions. n² attention relationships mean every added token dilutes all others.

2. **Harness engineering > context engineering.** The fix isn't always "better instructions" — it's mechanical enforcement. OpenAI built a million-line system with 3 engineers using: custom linters + structural validation at step boundaries, not more docs.

3. **3-7 examples > 20 rules.** GitHub's analysis of 2,500+ repos: successful agent files use concrete examples, unsuccessful ones list rules without examples. Rule lists lose effectiveness after 3-4 rules.

4. **Context stratification.** Successful systems use 4 layers: working context (~300-600 tokens), session (recent results), memory (persistent files), artifacts (by reference). Our pipeline dumps everything into one layer.

5. **Tool descriptions are the #1 improvement lever.** Anthropic found prompt-engineering tool descriptions is the single most effective improvement method. Brief, specific, with examples.

## Internal Gap Analysis Summary

### Pipeline Stats
- **Total docs:** 40 files, 29,389 words
- **Signal ratio:** 81% (surprisingly good)
- **Biggest file:** 09-execute-projects.md at 6,222 words (21% of all pipeline docs)

### The Real Problem
The docs are well-written but **enforcement is missing**. All gates are in prose. Agents read prose while executing and default to the next task. Missing checkpoints don't produce errors — they're silently skipped.

### 7 Conflicts Found
1. **Lightweight routing contradiction** (HIGH) — triage says "spawn COO", project-brainstorm says "no COO plan"
2. **Brainstorm timing undefined** (MEDIUM) — before or after COO plan?
3. **Status lifecycle undefined** (MEDIUM) — no explicit state machine
4. **DOD self-verification** (MEDIUM) — builder marks own DOD as met, no reviewer loop
5. **Code-review fail doesn't block** (MEDIUM) — no blocking logic defined
6. **Audit after plan** (MEDIUM) — COO plans blind, audit reveals complexity, needs re-planning
7. **Project.json update buried** (HIGH) — instruction at line 397 of 6,222-word doc

### 5 Missing Enforcement Gates
1. Project.json update after each task (CRITICAL)
2. Browser test verification (CRITICAL)
3. Code-review failure blocking (HIGH)
4. Directive status updates during execute (MEDIUM)
5. Reviewer DOD verification feedback loop (MEDIUM)

## CEO Clarifying Questions

Q1: Weight classes — keep all 4 or simplify?
Q2: How aggressive should the trim be? (surgical/moderate/aggressive)
Q3: Split 09-execute-projects.md or trim in place?
Q4: Move audit before COO planning?
Q5: Scope of "skills-creator" verification?
