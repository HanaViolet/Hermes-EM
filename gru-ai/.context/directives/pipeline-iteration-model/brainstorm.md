# Brainstorm: Pipeline Iteration Model

## Participants
- Sarah Chen (CTO) — pipeline architecture
- Marcus Rivera (CPO) — CEO experience design
- Morgan Park (COO) — orchestration patterns
- Online research — industry patterns survey
- CEO — direction, feedback, clarification

---

## Phase 1: How to Make Iteration Cheaper

### CEO's Problem Statement

> Currently our pipeline is designed in a very autonomous way, aiming for the case that CEO gives directives, subagents plan/brainstorm/audit/build/review. In a very ideal way. But in reality, it rarely works out like the ideal way. In most cases, the result of the first time doesn't meet my requirements, or not working. Sometimes, even if the project outcomes are good, CEO might want to add new requirements. Currently the pipeline is linear, but in reality might not be good enough.

### Sarah (CTO) — Amendment Loops

**Core idea:** Introduce a single new primitive — the "amendment" — that lets the CEO inject scoped feedback at the completion gate without restarting the plan-audit-approve cycle. Amendments create new tasks within existing projects, not new projects.

**Architecture:**
- Two feedback loops at two granularities:
  - LOOP 1 (Completion Amendment): At completion gate, add third option "amend." CEO feedback → CTO decomposes into 1-N tasks → execute just those → back to completion gate. Directive stays in "execute," does NOT reset to "plan."
  - LOOP 2 (Mid-Execution, deferred to v2): CEO injects amendment while execute is active. Significantly harder, deferred.
- State changes: `amendments[]` array at directive level, "amended" status at completion gate, `amendment_id` on tasks for traceability
- No new pipeline steps — reuse existing project-brainstorm and execute
- Max 3 amendments per directive (forces CEO to either accept or acknowledge plan was wrong)
- Ghost field discovery: `iterations[]` and `revision` referenced in 11-completion-gate.md but never defined in schema

**Key insight:** The pipeline already has all the execution machinery. What's missing is a lightweight re-entry point that skips the 8 steps of overhead when CEO feedback is scoped refinement, not a plan change.

### Marcus (CPO) — Tiered CEO Engagement

**Core idea:** Replace the binary completion-gate-or-reopen cycle with three distinct CEO response types (approve, amend, redirect) that trigger proportionally-sized iteration loops, keeping CEO effort under 5 minutes per feedback cycle.

**CEO workflows:**
- **Quick feedback (amend):** One-sentence instruction → single new task → same builder → build+review → back to completion. Skips re-planning entirely. The 80% case.
- **Requirement additions (extend):** Preserves completed work, COO plans only NEW projects for the delta. Key UX: CEO told "these 3 tasks are done and locked, we're planning 2 new tasks." Extending feels like progress; reopening feels like failure.
- **Rejection flow:** Two sub-cases — "the approach is wrong" (redirect: COO re-plans from scratch) vs "the implementation is sloppy" (quality fix: re-spawn builder with complaints). System asks: "Is the problem WHAT was built, or HOW it was built?"
- **Checkpoint strategy:** Default completion-only. Opt-in `checkpoint_after_each_project: true` for heavyweight. Auto-escalate to CEO if task fails code-review twice.

**UX principles:**
- Feedback proportional to loop size (small feedback → small loop)
- Completed work is sacred — amend/extend never touch finished tasks
- System categorizes, not CEO — default to lightest-weight interpretation
- Every CEO touchpoint actionable in under 2 minutes
- Iteration history visible in directive.json

**Key insight:** CEO feedback is not binary (approve/reject) — it exists on a spectrum from "tweak this detail" to "start over." The pipeline must match that spectrum with proportional responses. Today, every piece of feedback pays the full pipeline tax, so the CEO either approves something imperfect or pays a huge cost to improve it. That's why first-pass quality feels so painful — not because quality is uniquely bad, but because the cost of iteration is uniquely high.

### Morgan (COO) — Refinement Loops

**Core idea:** Add a lightweight "refinement loop" primitive that runs WITHIN the execute step — build, CEO feedback, targeted rebuild — without restarting the full pipeline. The current reopen-to-plan path becomes the "major iteration" path.

**Design:**
- Two tiers:
  - TIER 1 (Refinement Loop, inner, cheap): After build+review within execute, CEO provides targeted feedback → scoped rebuild (same builder, same files) → re-review → done. Max 2 cycles per task. NOT a new step — extension of per-task build→review loop. ~20K tokens.
  - TIER 2 (Reopen, outer, existing): CEO reopens from completion gate. COO plans new projects only. ~140K tokens.
- State: `refinements[]` and `refinement_count` per task in project.json. No directive-level state changes.
- Refinement loops are 7x cheaper than reopens (~20K vs ~140K tokens)
- Auto-escalation: if CEO feedback references files outside task's active_files → Tier 2

**Key insight:** The pipeline doesn't need a new iteration model — it needs to make the EXISTING per-task build→review loop interruptible by CEO feedback. Refinement is an execution concept, not a pipeline concept.

### Online Research — Industry Patterns

**Key patterns found:**

| Pattern | Description | Who Uses It |
|---------|-------------|-------------|
| Evaluator-Optimizer | Generator + evaluator in separate context windows, loop until pass or max iterations | Anthropic (canonical pattern), AWS, Google ADK, LangGraph |
| Reflexion | Agent self-critiques, writes verbal feedback to memory, retries with critique in context | LangChain, academic (Shinn et al. 2023) |
| Handoff Chains | Agents complete scope and explicitly hand off to next specialist with context | OpenAI Swarm, Devin |
| Event-Sourced Loop | Every action appended to immutable log, one action per iteration | Manus AI, OpenHands |
| Human-as-Tool | Agent treats human as callable tool — routes questions when uncertain | CAMEL-AI, Microsoft Magentic-UI |
| Escalation on Stall | After N attempts with no progress, escalate to human with structured artifact | Devin, Manus |
| Inner Loop (test-iterate) | Tight cycle: write code → run tests → observe failures → fix → repeat | Devin, OpenHands, Claude Code |
| Checkpoint-Based State | Save full state after each node, enables "time-travel" rollback | LangGraph |
| Git-as-State | Git commits as checkpoints, descriptive messages, recovery via revert | Anthropic harness |
| Dual-Threshold | Warning threshold (nudge agent) + hard threshold (force termination) | Production deployments |
| Repetition Detection | Monitor for semantically similar outputs across iterations → force different approach | LangGraph, Manus |
| Failure Memory | Track what was tried/failed, require different approach on retry | Best practice across frameworks |
| Durable Execution | Workflow state persisted by orchestration engine, resume exactly where left off | Temporal, Restate, DBOS |

**Key numbers:**
- 72.7% — Claude Sonnet 4 SWE-bench resolution rate (with self-test loop)
- 90% — Multi-agent outperformance over single-agent (Anthropic research system)
- 60.1% — Multi-agent code review F1 score (Qodo, best measured)
- 3 — Max recommended autonomous fix iterations (Anthropic cookbook default)
- 15x — Token cost multiplier for multi-agent vs single-agent

**Sources:** Anthropic (Building Effective Agents, Context Engineering, Long-Running Harness), AWS Prescriptive Guidance, Google ADK, OpenAI Swarm, Devin/Cognition, OpenHands, Manus, LangGraph, Temporal, Qodo, Addy Osmani, IT Revolution Three Loops Framework.

---

## CEO Rejects Phase 1

> Your proposals don't sound too promising. My dream is fire-and-forget — I give a directive and it comes back done right. The reason I started this brainstorming is it doesn't work well. The first-pass quality problem is BOTH quality issues (sloppy/broken) AND direction issues (not what I asked for). All of them.

**CEO's reframe:** Stop making iteration cheaper. Make fire-and-forget actually work. Better first-pass quality, not cheaper loops.

---

## Phase 2: How to Make Fire-and-Forget Work

### Sarah (CTO) — Intent-Preserving Autonomous Quality (IPAQ)

**Root cause analysis:** First-pass quality fails at five specific points:
1. **CEO Brief → COO Plan handoff (highest intent loss):** CEO's WHY gets compressed into generic scope_summary. Specificity evaporates.
2. **COO Plan → CTO Task Decomposition:** DOD criteria are two handoffs from CEO's intent. Describe WHAT but not WHY or to WHAT STANDARD.
3. **Build phase has no inner verification loop:** Builder codes until DOD "seems met." No self-test, no self-critique. Micro-loop gap.
4. **Code-review 1-fix-cycle cap prevents convergence:** Known bugs get shipped after 1 failed fix.
5. **Direction drift invisible until completion:** Nothing checks "is this still aligned with CEO intent?" between planning and completion.

**Core changes:**
1. **CEO Intent Document** — structured fields (success_looks_like, failure_looks_like, quality_bar) travel VERBATIM through every handoff. ~200 tokens, eliminates telephone game.
2. **Builder Inner Loop** — before producing build report, builder re-reads CEO intent, traces code against each acceptance scenario, writes evidence statements, fixes gaps. Micro-loop.
3. **Evaluator-Optimizer with Convergence** — code-review gets 3 cycles (not 1). Convergence test: same bugs = escalate, new bugs = keep fixing.
4. **Intent-Continuity Check in Review** — reviewer receives CEO's original success/failure scenarios verbatim, checks alignment beyond DOD.
5. **Failure Memory Across Retries** — `previous_attempts` field prevents repeating same mistakes.
6. **Builder Receives CEO Brief Verbatim** — CEO's actual words in every builder prompt. Zero-cost (~200 tokens), high-value.

**Key insight:** The CEO's actual words never reach the builder. Intent passes through 3 paraphrasing layers. The single highest-leverage change: ensure the CEO's original intent document travels VERBATIM to every agent. Costs ~200 tokens per prompt. The alternative is 140K tokens to reopen.

### Marcus (CPO) — Intent-Preserving Pipeline with Acceptance Scenarios

**Root cause analysis (user perspective):**
1. **Intent degradation through translation layers** — CEO's brief gets through 3 paraphrases, arrives at builder as specification that lost the WHY.
2. **"Done" defined from builder's perspective** — DOD describes engineering completion ("type-check passes"), not user satisfaction.
3. **No agent can do what the CEO does in 10 seconds** — CEO tests as USER with real intent. Builders test as ENGINEERS (compile? types pass?). Reviewers test as CODE READERS (data flow? null checks?). Nobody USES the thing.
4. **Builders satisfice** — hit "done" at first plausible completion without exploring edge cases.

**Core changes:**
1. **CEO Brief flows to every agent verbatim** — ~200-500 extra tokens per spawn, eliminates telephone game.
2. **Acceptance Scenarios replace abstract DOD** — concrete step-by-step walkthrough ("Open dashboard → Click Agents tab → See 5 agent names with colored status dots → Click agent → Detail panel slides in"). Written in CEO's language.
3. **Builder Self-Test Protocol** — re-read CEO brief, walk each acceptance scenario against code, write what would ACTUALLY happen, identify gaps, fix, repeat.
4. **Reviewer Scenario Execution** — reviewer MUST trace each scenario through actual code paths. Dead-end trace = hard fail.
5. **First-10-Seconds Checklist** — "If CEO opened this with no instructions, what would they see/click/experience?"
6. **Directive-Level Acceptance Test** — top-level "done when CEO can [workflow]" checked at completion gate.

**Key insight:** The CEO's brief disappears after planning. By the time a builder starts, they work from a fourth-generation abstraction. The fix is not a new state machine — it's a context engineering fix: include the CEO's words in every agent prompt (~250 tokens) vs 140K tokens to reopen.

### Morgan (COO) — Autonomous Quality Loops

**Root cause analysis (operational):**
1. **Intent degradation across handoffs** — 3 translation layers, builder never sees CEO's words.
2. **No failure memory** — builders repeat same category of mistake every directive.
3. **No autonomous verification loop** — only 1 fix cycle after code-review, standard review findings are "non-fatal."
4. **DOD too abstract for autonomous verification** — "Name labels visible above every character" is verifiable by human, not agent.
5. **Review catches but doesn't fix** — diagnostic tool, not treatment tool.

**Core changes:**
1. **Pass CEO's original words to every agent** — ~200-500 extra tokens.
2. **Executable DOD** — each criterion gets a verify field (bash command, grep pattern, or MANUAL tag).
3. **Evaluator-Optimizer Loop (max 3 cycles)** — independent evaluator checks DOD after build. If fail → findings back to builder → rebuild → re-evaluate.
4. **Failure Pattern Injection** — after each directive, extract top 3 bug patterns → `lessons/failure-patterns.md` → inject into builder context as "KNOWN PITFALLS."
5. **Review Findings Trigger Fix Cycles** — standard review "fail" = re-spawn builder + re-review. Max 2 cycles. "Partial" = one focused fix.
6. **Standing Corrections as Hard Constraints** — structured corrections.json checked mechanically.

**Cost model:**
- Refinement (in-execute): ~20K tokens
- Amendment (at completion): ~40K tokens
- Extend (new projects): ~80K tokens
- Reopen (full re-plan): ~140K tokens
- Autonomous quality loops per task: +5-20K typical, +140K worst case
- Break-even: preventing ONE CEO reopen saves 40-140K tokens + hours of CEO time

**Key insight:** The pipeline has NO mechanism for builders to verify their own work against concrete criteria before declaring done. Adding executable verification + evaluator loop is the missing micro-loop.

### Online Research — Phase 2 (First-Pass Quality)

**Five Pillars for First-Pass Quality (ranked by impact):**

1. **Precise, machine-verifiable specs** — intent engineering with `done_when` criteria that include verification commands. "Without acceptance criteria, agents default to plausible completion. With criteria, they aim at verifiable completion."
2. **Self-testing loops** — builder must run tests/lint/build before declaring done. 72.7% SWE-bench resolution with self-test loop.
3. **Context minimalism** — every unnecessary token degrades output. Just-in-time loading, tool result clearing, fresh context per agent. Infrastructure config alone can swing benchmarks by percentage points.
4. **Fresh-context review** — reviewer gets code + diff + rubric, no builder reasoning. Multi-agent specialist review: 60.1% F1, 11% over single-agent.
5. **Bounded evaluator-optimizer** — cap at 2-3 iterations with deterministic checks first, LLM review second. Diminishing returns beyond 3.

**Key research finding (Addy Osmani):** "AI easily does the first 80%, but the final 20% (integration, subtle bugs, performance) requires deep understanding. If you check out mentally during the first 80%, that final 20% becomes an insurmountable wall."

**Key research finding (Anthropic):** "Every unnecessary token actively degrades performance." Context rot is an architectural property of transformers. 37% token reduction observed from tool result clearing. 85-95% reduction from just-in-time tool loading.

---

## CEO Clarification (interactive back-and-forth)

### On Evaluator-Optimizer vs Reviewer

> I love the Evaluator-Optimizer loop, but isn't it how reviewer should do? I expect the review step doing the same thing.

**Resolution:** Don't add a separate evaluator agent. Make the existing reviewer more effective by giving them CEO acceptance scenarios + fix cycles on fail. The reviewer IS the evaluator. Changes: (1) reviewer gets CEO intent + acceptance scenarios (they don't today), (2) review "fail" triggers fix cycle (today it's just a warning), (3) max 2-3 cycles for standard review (today: 0).

### On Directive Structure

> Would this be 1 directive multiple projects or multiple directives?

**Resolution:** 1 directive, multiple projects. Aligned with CEO preference for fewer, longer-running directives. Also remove "single project is the default" from planning docs — it biases the COO toward lumping everything together.

### On Completion Gate

> At the end, when giving me to review, it should contain the checklist of my ask (DODs).

**Resolution:** Completion gate shows acceptance scenario checklist with pass/fail per scenario + evidence.

### On Sarah's Intent Fields vs DOD

> Is success_looks_like, failure_looks_like, quality_bar better than DOD? quality_bar looks interesting.

**Resolution:** They're DIFFERENT levels — directive-level DOD (intent: success/failure/quality_bar/examples) sets the standard, task-level DOD operationalizes it into testable scenarios. Both travel to every agent. `quality_bar` is what DOD can't capture — the CEO's implicit standard made explicit.

### On Intent Extraction

> The directive intent should not be from me typing verbatim, should be doing a summary from my prompt and verify with me piece by piece. In many cases I don't even know what I should intent... some good ideas are from brainstorming.

**Resolution:** Intent is extracted AFTER audit+brainstorm (not before). System generates intent from CEO brief + audit + brainstorm findings, CEO verifies piece by piece. Sometimes audit+brainstorm reveal possibilities the CEO didn't initially consider.

### On Verify Commands

> I don't trust verify commands, is it gonna be the npm run typecheck kinda shit?

**Resolution:** Drop bash verify commands. Quality comes from reviewers testing against acceptance scenarios, not automated commands. Technical hygiene (typecheck, build) still runs but is NOT DOD.

### On Builder Self-Verify Reliability

> Is builder self-verify reliable? Should we have a separate reviewer with new context, testing from CEO requirements?

**Resolution:** Builder self-verify is unreliable (marking own homework). The better version: reviewer with fresh context tests against CEO acceptance scenarios. Same reviewer for all fix cycles of a task (builds understanding), different from builder, fresh context each cycle.

### On DOD Examples

> I think examples are good for agents to understand. Would workflow examples also be part of intent/DOD?

**Resolution:** Yes — examples go in DOD at both levels. Full workflow examples (not just one-liners) help agents understand expectations concretely. The "before/after pipeline" walkthrough shown during this discussion is an example of the detail level needed.

### On Reuse Existing Concepts

> Try to use existing concepts and fields, like dod and reviewers. If you have to introduce new ones, do some cleanups.

**Resolution:** Enhance `dod` (don't invent `intent`), properly define ghost `iterations[]`/`revision` (don't replace with `amendments[]`), use existing `reviewers[]`. Clean up ghost fields and dead references.

---

## Final Synthesis

### Two-Layer Architecture

**Layer 1 — First-Pass Quality (prevent iteration):**
- CEO intent (success_looks_like, failure_looks_like, quality_bar, examples) added to `dod` at directive level
- Intent extracted AFTER audit+brainstorm, CEO verifies piece by piece
- CEO brief + intent flow verbatim to every agent (builder, reviewer, CTO, COO)
- Task-level DOD = user-centric acceptance scenarios derived from directive DOD
- Review "fail" triggers fix cycles (max 3 for code-review, max 2 for standard review) with convergence detection
- Failure patterns from prior directives injected into builder context

**Layer 2 — Iteration Fallback (when Layer 1 isn't enough):**
- Completion gate adds amend (~40K) + extend (~80K) alongside approve/reopen
- Completion gate shows acceptance checklist with pass/fail evidence per scenario
- `iterations[]` and `revision` properly defined in schema
- Intent versioning when amend/extend changes scope

### Concrete Before/After Workflow

**Today:**
```
CEO writes directive.md (free-form brief)
  ↓
COO reads brief → outputs plan with scope_summary (brief disappears here)
  ↓
CTO decomposes into tasks with DOD like:
  - "Idle indicator shows 3 tiers"
  - "Type-check passes"
  ↓
Builder gets: task scope + DOD + audit findings (never sees CEO's words)
  ↓
Builder codes until DOD seems met → marks done
  ↓
Code-review: pass → done. Fail → 1 fix attempt → proceed regardless
  ↓
Standard review: finds issues → logged as "non-fatal warnings" → no fix
  ↓
Completion gate: CEO sees digest summary → approve or reopen (full restart)
  ↓
If CEO says "not right": reopen → back to COO planning (~140K tokens, hours)
If CEO says "also do X": same reopen flow, no lighter option
```

**After:**
```
CEO writes directive.md (free-form brief, same as today)
  ↓
Audit + Brainstorm run (grounded in codebase + industry patterns)
  ↓
NEW: System extracts intent from brief + audit + brainstorm:
  - success_looks_like: [list of concrete scenarios]
  - failure_looks_like: [list of anti-patterns]
  - quality_bar: "the standard"
  - examples: [references, comparisons, workflow walkthroughs]
  CEO reviews piece by piece: "yes / no, change X / add Y"
  ↓
COO reads brief + CEO-verified intent → outputs plan
  (scope_summary still exists, but CEO's words travel alongside, never replaced)
  ↓
CTO decomposes into tasks with USER-CENTRIC acceptance scenarios:
  BEFORE: "Idle indicator shows 3 tiers"
  AFTER:  "Open game → leave agent idle 10 min → see indicator change
           from green to yellow. Wait 30 min → see it change to orange."
  (Technical checks like typecheck still run but are not DOD — just hygiene)
  ↓
Builder gets: CEO brief (verbatim) + CEO intent (verbatim) +
  acceptance scenarios + audit findings + failure patterns from past directives
  ↓
Builder codes → before marking done, walks through each acceptance scenario
  against their code ("does my code actually do this?")
  ↓
Code-review: up to 3 fix cycles (not 1), with convergence detection
  (same bug twice = escalate, new bugs = keep fixing)
  ↓
CHANGED: Standard review gets CEO intent + acceptance scenarios.
  Reviewer tests each scenario: "can the CEO actually do this?"
  Review "fail" → builder fixes → re-review (up to 2 cycles)
  (Today: findings are logged as warnings and shipped. No fix cycle.)
  ↓
Completion gate: CEO sees acceptance scenario checklist:
  [x] "Open game → idle 10 min → indicator changes" — PASS (evidence: ...)
  [x] "Wait 30 min → indicator changes again" — PASS (evidence: ...)
  [ ] "Click agent → detail panel shows idle duration" — FAIL (reason: ...)

  CEO chooses:
  - Approve: done
  - Amend: "fix the detail panel" → 1-3 fix tasks, skip re-planning (~40K)
  - Extend: "also add wandering" → COO plans just new scope (~80K)
  - Redirect: "wrong approach" → full reopen (~140K, existing flow)
```
