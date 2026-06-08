# Build Report -- Reddit Launch Execution

**Builder:** Taylor Chen
**Date:** 2026-03-11
**Status:** Both tasks complete, ready for review

---

## What Was Built

### Task 1: reddit-posts-final.md

Polished all 3 draft posts from the existing reddit-launch-guide.md.

**Changes from the original drafts:**

1. **GIF embedding fixed.** Original used `[GIF of the office in action](docs/assets/demo.gif)` -- a relative link-style reference that would not render on Reddit. Replaced with `![demo](https://raw.githubusercontent.com/andrew-yangy/gruai/main/docs/assets/demo.gif)` -- absolute raw GitHub URL with `![]()` image syntax so Reddit renders it inline.

2. **Install command corrected.** Original said `npm install -g gru-ai && gru-ai`. The actual README documents `npx gru-ai init` (scaffold) and `npx gru-ai start` (launch). Updated all posts to match.

3. **Voice pass.** Removed polished/marketing phrases: "genuinely useful," "fills a gap those frameworks don't address," "specifically for developers who already use Claude Code daily." Shortened sentences. Added casual connectors ("figured I'd share," "the idea started from a real problem"). Cut hedging paragraphs.

4. **Titles shortened.** Original r/ClaudeCode title was 78 characters. Shortened to focus on what it does rather than the project name (r/ClaudeCode audience cares about utility, not brand). Kept `gruai` in r/ChatGPTCoding title since it's a comparison post. Simplified r/SideProject title.

5. **r/SideProject: added "45 minutes a week" detail.** This is a key differentiator from the CEO brief that was missing from the original draft.

### Task 2: reddit-execution-package.md

Created a single self-contained file with 8 sections:

1. Pre-flight checklist (7 items, all actionable)
2. Posting sequence table (Day 1/3/5 with times)
3. Copy-paste-ready post bodies (duplicated from task 1 so the CEO never needs to open a second file)
4. First-hour engagement script with minute-by-minute breakdown and example builder-note comments tailored per subreddit
5. 7 comment response templates (Devin, CrewAI/AutoGen, wrapper criticism, model lock-in, gimmick pushback, "how long," "why Claude Code")
6. 48-hour monitoring checklist with metric tracking and escalation triggers
7. Quick reference table (all URLs, commands, package info)
8. Do-not-do list (10 items from original strategy)

**Added beyond original strategy:**

- Two extra response templates ("How long did this take?" and "Why Claude Code and not X?") -- these came up as likely questions based on the subreddit analysis
- Escalation triggers section (post removed, hostile threads, bug reports, organic crossposts, zero engagement)
- Per-subreddit builder-note comments (original strategy had one generic example)
- Metrics tracking template with blanks to fill in (upvotes, comments, ratio, GitHub stars, npm downloads)

---

## Proposed Improvements

1. **Reddit markdown rendering test.** The GIF URL should render inline on Reddit, but Reddit's markdown parser has quirks. Before Day 1, the CEO should paste the r/ClaudeCode post body into Reddit's markdown editor in draft mode and confirm the GIF actually displays. This is in the pre-flight checklist but worth highlighting.

2. **Video alternative.** The demo GIF is 1.6MB at 520x360, 10fps. If Reddit's inline rendering is flaky, consider uploading the demo.mp4 (7.5MB) directly to Reddit as a video post instead of a text post for r/SideProject specifically, since that subreddit favors visual demos. This would require changing Post 3 from text to video format.

3. **Account warm-up timeline.** The pre-flight checklist requires "2+ weeks of genuine activity in r/ClaudeCode." If the CEO's Reddit account does not already have this, the entire launch timeline needs to shift. Worth confirming this early.
