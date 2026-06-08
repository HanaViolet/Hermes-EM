# Pipeline Lean Redesign

## Problem

The pipeline has accumulated bloat through repeated "improvements" that add new instructions without removing old, conflicting ones. Symptoms:
- Buggy pipeline status updating (directive.json and project.json not updated correctly)
- Quality dropping, especially on larger directives
- Missing requirements, early premature completion
- Too much context = no context — agents drown in instructions and miss obvious issues
- Conflicting instructions from successive pipeline updates not cleaned up

## CEO Observations
- "Less is more" — the pipeline over-instructs and agents lose focus
- Problem worse with bigger directives (more context = more confusion)
- Previous `pipeline-quality-and-trim` directive (R4: Context Trim) was scoped out

## Requirements

### R1: Research Context Engineering Best Practices
Read latest articles from OpenAI and Anthropic on context engineering, harness engineering, and agentic engineering. Extract actionable patterns for our pipeline.

### R2: Internal Gap Analysis
Audit the current pipeline docs for:
- Conflicting instructions (old vs new)
- Redundant content (same thing said multiple ways)
- Missing enforcement (instructions that agents ignore because they're buried)
- Context volume vs signal ratio

### R3: CEO Clarification
Before making changes, clarify with the CEO:
- What's still needed vs what's cruft
- Current expectations for the pipeline
- Which features matter vs which were experimental

### R4: Lean Pipeline Implementation
Based on research + clarification, trim and restructure the pipeline docs. Target: dramatically less context with better signal.

## Out of Scope
- New pipeline features (this is about trimming, not adding)
- Dashboard changes
- Game/product work
