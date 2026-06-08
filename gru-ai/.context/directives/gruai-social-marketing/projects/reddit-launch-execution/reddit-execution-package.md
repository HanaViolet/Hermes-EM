# Reddit Launch -- Execution Package

Everything you need to post gruai across three subreddits. Follow this file
step by step. No other document required.

---

## 1. Pre-Flight Checklist

Complete every item before posting. If any item fails, fix it first.

- [ ] **Reddit account**: Has 2+ weeks of genuine activity in r/ClaudeCode
      (comments on others' posts, not just lurking)
- [ ] **Reddit account**: Also has some activity in r/ChatGPTCoding and
      r/SideProject (at least a few comments each)
- [ ] **Demo GIF**: Open this URL in a browser and confirm it loads:
      `https://raw.githubusercontent.com/andrew-yangy/gruai/main/docs/assets/demo.gif`
- [ ] **GitHub repo**: Open https://github.com/andrew-yangy/gruai and
      confirm the repo is public, README is current, and the demo video plays
- [ ] **npm package**: Run `npx gru-ai init` in a temp directory and
      confirm it scaffolds correctly. Run `npx gru-ai start` and confirm the
      dashboard opens at localhost:4444
- [ ] **Post preview**: Paste the r/ClaudeCode post body into Reddit's
      markdown editor (do NOT submit). Confirm the GIF renders inline, links
      are clickable, and table formatting is correct
- [ ] **Title check**: Read each title out loud. Confirm no typos. Reddit
      does not allow title edits after posting

---

## 2. Posting Sequence

| Day | Subreddit | Time (US Eastern) | Time (UTC) |
|-----|-----------|-------------------|------------|
| Day 1 (Tue/Wed) | r/ClaudeCode | 9-10 AM | 14:00-15:00 |
| Day 3 (Thu/Fri) | r/ChatGPTCoding | 9-10 AM | 14:00-15:00 |
| Day 5 (Sat/Mon) | r/SideProject | 10-11 AM | 15:00-16:00 |

**Rules:**
- Start on a Tuesday or Wednesday. Never Friday or weekend.
- Each post is a **text post** (not link post). Text posts signal effort
  and get higher engagement on developer subreddits.
- Do NOT crosspost. Each subreddit gets its own tailored post.
- Wait the full 2 days between posts. Use r/ClaudeCode feedback to refine
  the later posts if needed.

---

## 3. Post Bodies (Copy-Paste Ready)

### 3A. r/ClaudeCode

**Title:** I built a pixel-art office that shows your Claude Code agents
working in real-time

**Flair:** Tools & Projects

**Body:**

```
I've been running multi-agent Claude Code setups for a few months now --
a CTO agent, builder agents, reviewer agents, all working on the same
codebase. The problem was I had no idea what was going on without tailing
a bunch of terminal windows.

So I built gruai. It watches your Claude Code session files and turns them
into characters in a pixel-art isometric office. When an agent starts
coding, they sit at a desk and type. When they kick off a review, they
walk over to the reviewer's desk. Brainstorming? They gather at the
whiteboard.

![demo](https://raw.githubusercontent.com/andrew-yangy/gruai/main/docs/assets/demo.gif)

**What it does:**
- Watches `~/.claude/projects/` for active sessions
- Maps agents to pixel-art characters with idle, walking, and working
  animations
- Shows real-time status: which agent is active, what they're working on,
  what pipeline stage they're in
- Install: `npx gru-ai init` to scaffold, `npx gru-ai start` to launch

**Tech:** React 19, TypeScript, Canvas 2D (no game engine), Vite, Express
for the session watcher.

There's also a directive pipeline baked in -- triage, planning, build,
review, and completion stages with actual review gates. You define agents
as markdown files in `.claude/agents/` and the pipeline handles
decomposition and reviews.

MIT-licensed, on npm as `gru-ai`. Happy to answer questions about the
architecture or how the session watcher works.

GitHub: https://github.com/andrew-yangy/gruai
```

---

### 3B. r/ChatGPTCoding

**Title:** gruai -- open-source AI agent framework with a pixel-art office
(comparison with Devin, CrewAI, AutoGen)

**Flair:** Tool / Resource

**Body:**

```
I've been working on an AI agent framework called gruai and figured I'd
share how it stacks up against Devin, CrewAI, AutoGen, and similar tools.

**Short version:** gruai gives you a team of AI agents (planner, builder,
reviewer) that work through a structured pipeline. You watch them do it in
a pixel-art isometric office where each agent is a character with
animations tied to real session state.

![demo](https://raw.githubusercontent.com/andrew-yangy/gruai/main/docs/assets/demo.gif)

**How it compares:**

| Feature | gruai | Devin | CrewAI | AutoGen |
|---------|-------|-------|--------|---------|
| Visualization | Pixel-art office (real-time) | Web dashboard | None | None |
| Pipeline | Directive > Project > Task with review gates | Autonomous | Role-based chains | Conversation patterns |
| Model | Claude Code | Proprietary | Any LLM | Any LLM |
| Price | Free / MIT | $500/mo | Free | Free |
| Install | `npx gru-ai init` | Cloud service | pip install | pip install |
| Code review | Built-in (separate reviewer agent) | Limited | Manual | Manual |

**What's actually different:**

1. **You can see your agents work.** Not in a log viewer -- in a pixel-art
   office where characters walk to desks, type, and gather at whiteboards.
   Nothing else in this space has anything like it.

2. **Structured pipeline, not free-form.** Work goes through triage,
   planning, build, review, and completion. Lightweight stuff skips the
   heavy steps automatically. Reviews are mandatory, not optional.

3. **Agents are markdown files.** Define a CTO in
   `.claude/agents/sarah-cto.md` with specific review standards and she
   enforces them. Edit the file, change the behavior.

Built on Claude Code right now, so most relevant if you're in that
ecosystem. MIT-licensed, open source.

GitHub: https://github.com/andrew-yangy/gruai
npm: `gru-ai`
```

---

### 3C. r/SideProject

**Title:** I built an AI company framework with a pixel-art office where
you watch your agents work

**Flair:** Show Off

**Body:**

```
I've been building gruai for the past few months -- it's a framework that
turns AI coding agents into a visible, structured team.

The idea started from a real problem: I was running multiple Claude Code
sessions for different tasks (planning features, building code, reviewing
PRs) and had zero visibility into what was happening. Five terminal windows
scrolling logs. No way to know if one agent was stuck waiting on another's
review.

**What I built:**

gruai watches your AI coding sessions and renders them as characters in a
pixel-art isometric office. Each agent -- CTO, builder, reviewer, planner
-- has their own desk, animations, and real-time status. When a builder
starts coding, they sit down and type. When a reviewer starts looking at
code, they walk over to the builder's desk.

![demo](https://raw.githubusercontent.com/andrew-yangy/gruai/main/docs/assets/demo.gif)

But it's not just a visualization. Under the hood there's a full directive
pipeline:

1. **Triage** -- work gets classified by complexity
2. **Planning** -- a planner agent breaks work into projects and tasks
3. **Build** -- builder agents execute with structured context
4. **Review** -- reviewer agents check against acceptance criteria
5. **Completion** -- nothing ships without passing review gates

**Some details:**
- React 19 + TypeScript, Canvas 2D (no game engine), Express for session
  watching
- Agents are defined as markdown files -- swap personalities by editing
  text
- MIT license, open source, `npx gru-ai init` to try it
- I spend about 45 minutes a week on this now -- the agents handle the
  rest

**What I learned building it:**
- Pixel art generated by AI is possible but needs a lot of manual fixing
  -- proportions and animation frames especially
- The pipeline was harder than the visualization -- getting agents to
  follow a multi-step process without losing context is the real challenge
- Canvas 2D handles isometric rendering surprisingly well -- no need for
  Phaser or PixiJS

I'd genuinely like to hear what you think. Is the visualization useful or
just eye candy? Does the pipeline concept make sense?

GitHub: https://github.com/andrew-yangy/gruai
```

---

## 4. First-Hour Engagement Script

Follow this timeline for EACH post. The first hour determines whether the
post gets surfaced by Reddit's algorithm.

### Minute 0-5: Verify

- [ ] Open the post in a browser (not the Reddit app)
- [ ] Confirm the GIF loads and animates
- [ ] Confirm all links are clickable and go to the right pages
- [ ] Confirm table formatting rendered correctly (r/ChatGPTCoding post)
- [ ] Confirm the flair is set

### Minute 5-15: Post Your Builder Note

Add a comment on your own post. This adds context the body did not cover
and gives the post an early comment (signals engagement to the algorithm).

**For r/ClaudeCode, use something like:**

> One thing I didn't mention in the post -- the agent animations are
> driven by actual session file state, not mocked. The server watches
> `~/.claude/projects/` with chokidar and pushes updates over WebSocket.
> If you kill a Claude session, the character literally stands up and walks
> away from their desk. It's a small detail but it makes the whole thing
> feel alive.

**For r/ChatGPTCoding, use something like:**

> Should have mentioned -- the comparison table is a snapshot. CrewAI and
> AutoGen are both excellent at what they do. The main difference is that
> gruai is specifically built around Claude Code's session file format, so
> the visualization is native, not bolted on. If you're using GPT or
> Gemini for coding, those other frameworks are probably a better fit
> today.

**For r/SideProject, use something like:**

> Forgot to mention the "45 minutes a week" part in more detail. That's
> not an exaggeration -- I hand down a directive like "add dark mode to the
> dashboard" and the agents handle triage, planning, building, and
> reviewing. I come back to approve the result or request changes. The
> pipeline does the project management part that used to eat all my time.

### Minute 15-60: Monitor and Reply

- Reply to every comment within 10 minutes
- **Technical questions**: Give detailed, specific answers. Include file
  paths, architecture details, or code snippets where relevant
- **Skeptical comments**: Respond with substance, not defensiveness. See
  the response templates in Section 5
- **"Nice project" comments**: Say thanks, then ask a follow-up question
  to start a conversation: "Thanks -- are you running multi-agent setups?
  Curious what visibility you have into them today."
- **Do NOT leave Reddit for 2 hours after posting.** Early engagement
  velocity is the strongest signal for Reddit's ranking algorithm

---

## 5. Comment Response Templates

Use these as starting points. Adapt the tone to match the specific comment
and subreddit. Do not paste them verbatim -- that looks robotic.

### "How is this different from Devin?"

> Devin is a cloud-hosted autonomous agent -- you give it a task and come
> back later. gruai is a different model: local agents you watch work in
> real-time. Devin is a black box at $500/mo. gruai is MIT-licensed, runs
> locally, and the whole point is visibility into what the agents are doing.
> gruai uses Claude Code under the hood, so you get Anthropic's models
> rather than a proprietary system. Different trade-offs -- Devin is "fire
> and forget," gruai is "watch and steer."

### "How is this different from CrewAI / AutoGen / LangGraph?"

> CrewAI and AutoGen are solid multi-agent frameworks, but they're
> Python-first and focused on orchestration -- defining roles, chains, and
> conversation patterns. gruai is TypeScript/Node, built on Claude Code,
> and adds two things they don't have: a pixel-art office where you see
> agents work in real-time, and a structured pipeline with built-in review
> gates. If you're in the Claude Code ecosystem and want visibility into
> multi-agent work, that's the gap gruai fills. If you're using GPT or
> open models, CrewAI or AutoGen are probably a better starting point.

### "Isn't this just a wrapper around Claude Code?"

> The session watcher is a thin layer over Claude Code's session files,
> yeah. But the pipeline and review system are where the real work is --
> they enforce structured workflows that raw Claude Code doesn't have.
> Every task gets reviewed by a different agent than the one that built it,
> and bash scripts verify the reviews actually happened. The visualization
> is also a fair amount of work: pixel-art characters, isometric layout,
> animation state machines, all in Canvas 2D. "Wrapper" undersells it, but
> I get the skepticism -- best way to judge is to try it.

### "Does it work with GPT / Gemini / other models?"

> Right now it's Claude Code only. The session watcher reads Anthropic's
> session file format, so supporting other providers would need adapters.
> The visualization layer itself is model-agnostic -- it just reads session
> state -- so adding Codex or Gemini CLI support is possible. Not on the
> immediate roadmap, but if there's real demand I'd prioritize it.

### "The pixel-art office is a gimmick."

> Fair criticism. The office is the visual hook, but the actual value is
> the information it encodes: which agent is active, what pipeline stage
> they're in, and whether they're blocked. Without it, you're tailing log
> files or checking session dirs manually. With it, you glance at a window
> and see your team's status. Whether that justifies calling it a "gimmick"
> depends on whether you run enough concurrent agents to care about
> at-a-glance visibility. I run 3-5 agents at a time and it saves me from
> a lot of tab-switching.

### "How long did this take?"

> A few months of evenings and weekends. The hardest part was the pipeline
> -- getting agents to reliably follow a multi-step process without losing
> context or skipping review steps. The game rendering was actually the
> easier part. Canvas 2D is more capable than most people expect for
> isometric pixel art.

### "Why Claude Code and not [other tool]?"

> I was already using Claude Code daily and wanted better visibility into
> what my agents were doing. The framework grew from there. Claude Code's
> session files are well-structured and easy to watch, which made the
> real-time visualization possible. No philosophical objection to other
> tools -- Claude Code was just the one I was using when the problem hit.

---

## 6. 48-Hour Monitoring Checklist (Per Subreddit)

Run this checklist for each post. Start when the post goes live.

### Hours 0-2: Active Monitoring

- [ ] Reply to every comment within 10 minutes
- [ ] If post is removed by automod: message the subreddit mods with a
      polite note explaining the post. Do NOT repost
- [ ] Track: upvote count, comment count, upvote ratio (visible on desktop)
- [ ] If upvote ratio drops below 50%: review comments for criticism you
      haven't addressed. Respond to negative comments with substance

### Hours 2-12: Check-Ins

- [ ] Check post every 2-3 hours
- [ ] Reply to any new comments (aim for within 30 minutes)
- [ ] Note which comments got the most engagement -- these indicate what
      the audience cares about. Use these insights for the next subreddit's
      post

### Hours 12-24: First Day Wrap

- [ ] Record metrics: final upvote count, total comments, upvote ratio
- [ ] List top 3 questions/themes from comments
- [ ] Decide if the next subreddit's post needs any adjustments based on
      feedback
- [ ] If any comment asks a question you could not answer: note it and
      prepare an answer before the next post

### Hours 24-48: Second Day

- [ ] Check post once in the morning, once in the evening
- [ ] Reply to any remaining comments (even late ones -- shows you care)
- [ ] Final metrics snapshot:
  - Upvotes: ___
  - Comments: ___
  - Upvote ratio: ___%
  - GitHub stars gained (check repo insights): ___
  - npm downloads (check npmjs.com): ___
  - Most common question/theme: ___

### Escalation Triggers

Act immediately if any of these happen:

- **Post removed**: Message subreddit mods. Do not repost or create a new
  account. Be polite and ask what rule was violated.
- **Hostile comment thread forming**: Respond once with substance. Do not
  get into arguments. If it continues, stop replying -- other community
  members will often defend you if your responses were reasonable.
- **Bug report in comments**: Fix it or acknowledge it immediately. "Good
  catch, I'll fix that today" is a strong credibility signal. Follow up
  when it's fixed.
- **Someone shares the post to another subreddit**: Let it happen
  organically. Do not engage with the crosspost yourself.
- **Zero engagement after 2 hours**: The post probably did not get picked
  up by the algorithm. Do not delete and repost (Reddit penalizes this).
  Wait a full week, then consider reposting with a different title and
  angle.

---

## 7. Quick Reference

| Item | Value |
|------|-------|
| GitHub repo | https://github.com/andrew-yangy/gruai |
| npm package | `gru-ai` |
| Install (scaffold) | `npx gru-ai init` |
| Install (dashboard) | `npx gru-ai start` |
| Demo GIF (raw URL) | `https://raw.githubusercontent.com/andrew-yangy/gruai/main/docs/assets/demo.gif` |
| License | MIT |
| Tech stack | React 19, TypeScript, Canvas 2D, Vite, Express, Node.js |
| Dashboard URL | localhost:4444 |

---

## 8. Do-Not-Do List

1. Do not crosspost between subreddits
2. Do not use a fresh Reddit account with no prior activity
3. Do not use alt accounts to upvote or comment on your own post
4. Do not post and leave -- stay active for 2 hours minimum
5. Do not edit the title after posting (Reddit does not allow this anyway)
6. Do not use link posts -- text posts only
7. Do not ask for upvotes or GitHub stars directly
8. Do not post to r/artificial or r/LocalLLaMA (wrong audience)
9. Do not use engagement pods or coordinated upvoting
10. Do not repost if the first attempt gets low engagement -- wait a week
