# Lessons: Failure Patterns

> Recurring failure modes observed across directive execution. Each pattern
> has a name, observable symptom, root cause, mitigation, and a concrete
> example. This is a living document -- add new patterns as they emerge.
> Relevant to: ALL agents (especially COO, CTO, reviewers)

## Intent Degradation

**Pattern:** The CEO's original words never reach the builder. Each pipeline
layer paraphrases, abstracts, or drops detail until the builder works from
a summary-of-a-summary that no longer reflects what the CEO wanted.

**Symptom:** The build compiles and passes code review, but the CEO looks at
the result and says "that's not what I asked for." Review and DOD were both
met -- the DOD itself was wrong because it was derived from degraded intent.

**Root cause:** Multiple layers of summarization without anchoring to the
source. The CEO writes a brief. The brainstorm team paraphrases it. The COO
paraphrases the paraphrase into a plan. The project-brainstorm step derives
tasks from the plan (not the brief). The builder reads the task scope (not
the brief). Each layer loses nuance, tone, and context that carried the
CEO's actual intent.

**Mitigation:**
- The clarification step synthesizes intent from the original brief and
  verifies it with the CEO before planning starts
- Builder prompts include the CEO brief verbatim (not a summary) alongside
  the task scope -- the brief is the ground truth, the scope is the lens
- DOD derivation in project-brainstorm traces every DOD item back to a
  `success_looks_like` entry from the directive-level DOD, which itself
  was verified by the CEO in the clarification step
- Reviewers check `user_scenario` against the CEO brief, not just against
  the task scope

**Example:** CEO writes "agents ignore the brainstorm output -- I want
brainstorm alignment tracked and enforced." COO plan says "add brainstorm
integration." Task scope says "update prompts." Builder adds a paragraph
to a template. Reviewer approves because the prompt was updated. CEO
sees the result: no enforcement, no tracking, no alignment section in
build reports. The brief's "tracked and enforced" became "mentioned."

## Technical DOD Misses User Need

**Pattern:** The DOD criteria are all technically correct and verifiable,
but they describe implementation details rather than user-observable
outcomes. The build passes every criterion while delivering a broken or
useless experience.

**Symptom:** All DOD items are `met: true`. Type-check passes. Code review
passes. The CEO opens the feature and it does not work, looks wrong, or
is missing the thing they actually care about. The DOD never asked about
what matters.

**Root cause:** DOD criteria are written from the builder's perspective
("component renders without errors", "type-check passes", "API returns
200") rather than the user's perspective ("name labels visible above every
character at default zoom", "settings panel shows all 5 categories without
horizontal scroll"). Technical criteria verify the mechanism. User criteria
verify the outcome.

**Mitigation:**
- Project-brainstorm enforces user-observable DOD for UI/visual tasks:
  "describe what the USER SEES at default state, not the implementation
  technique"
- The directive-level DOD includes `failure_looks_like` entries that
  describe what broken looks like from the user's perspective
- Reviewers run a user-scenario walkthrough BEFORE code quality review --
  a build that passes code review but fails the user scenario is a "fail"
- Browser testing (UX verification) is mandatory for any task touching
  UI files -- type-check passing is necessary but not sufficient

**Example:** A game visual task has DOD: "Canvas renders without console
errors", "Character sprites load from sprite sheet", "z-index sorting
function passes unit test." All met. CEO opens the game: characters float
above furniture, sprites are 4x too large, nameplate text overlaps. The
DOD never asked "characters appear behind desks when seated" or "sprites
render at correct pixel scale." Every criterion was met; the feature was
broken.

## Unfixed Review Findings

**Pattern:** The review step finds real bugs, but the findings get logged
as "non-fatal" or "documented" and the pipeline continues without fixing
them. The bugs ship.

**Symptom:** The digest contains a findings section with known issues.
The review outcome is "pass" or "pass with notes." The bugs exist in
production. Nobody re-reads the digest findings section.

**Root cause:** Two forces combine. First, the review-then-fix cycle
has a maximum iteration count (2 standard review cycles, 3 code-review
cycles). When cycles are exhausted, remaining findings are logged and the
pipeline proceeds -- by design, to prevent infinite loops. Second, agents
self-triage review findings: they classify bugs as "low severity" or
"non-blocking" and skip them. The instruction said "fix ALL bugs" but the
agent decided some were not worth fixing.

**Mitigation:**
- Code-review failures block the pipeline -- `fail` or `critical` outcome
  triggers a fix cycle before standard review can run
- Convergence detection (same bug in 2 consecutive cycles) escalates to
  a senior engineer rather than silently proceeding
- Agents are instructed: "If the instruction says 'all,' it means all" --
  agents must not downgrade instructions by classifying findings as
  low-severity and skipping them
- The orchestrator pushes back on partial compliance: when an agent returns
  "found N issues, fixed M, skipped K," the orchestrator challenges the
  skipped K immediately
- The digest includes all unresolved findings with severity, so the CEO
  has visibility -- but the mitigation goal is to fix before shipping, not
  to document after shipping

**Example:** Code-review finds a null pointer in an error handler and an
off-by-one in pagination. Builder fixes the null pointer but classifies
pagination as "edge case, low severity -- documented." Standard review
does not re-check code-review findings (different scope). Digest says
"1 known issue: pagination edge case." Three weeks later, a user hits
the edge case. The fix was 2 lines. The cost was a CEO escalation.
