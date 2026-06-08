# Reddit Posts -- Final (Ready to Copy-Paste)

Three posts, one per subreddit. Each is tailored to its audience. Do not
crosspost. Copy the body text inside the fenced block, paste into Reddit's
markdown editor. The GIF URL renders inline on Reddit without uploading.

---

## Post 1: r/ClaudeCode

**Title:** I built a pixel-art office that shows your Claude Code agents
working in real-time

**Flair:** Tools & Projects

**When:** Tuesday or Wednesday, 9-10 AM US Eastern (14:00-15:00 UTC)

**Body (copy everything below):**

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

## Post 2: r/ChatGPTCoding

**Title:** gruai -- open-source AI agent framework with a pixel-art office
(comparison with Devin, CrewAI, AutoGen)

**Flair:** Tool / Resource

**When:** Two days after Post 1. Tuesday or Wednesday, 9-10 AM US Eastern
(14:00-15:00 UTC)

**Body (copy everything below):**

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

## Post 3: r/SideProject

**Title:** I built an AI company framework with a pixel-art office where
you watch your agents work

**Flair:** Show Off

**When:** Two days after Post 2. Tuesday or Wednesday, 10-11 AM US Eastern
(15:00-16:00 UTC)

**Body (copy everything below):**

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

## Change Log (from original drafts)

1. **GIF URL**: Replaced `[GIF of the office in action](docs/assets/demo.gif)`
   with `![demo](https://raw.githubusercontent.com/andrew-yangy/gruai/main/docs/assets/demo.gif)`
   -- uses `![]()` image syntax so Reddit renders it inline, and absolute raw
   GitHub URL so it loads without upload.

2. **Install command**: Changed `npm install -g gru-ai && gru-ai` to
   `npx gru-ai init` (scaffold) and `npx gru-ai start` (launch) to match the
   actual README and published package behavior.

3. **Voice cleanup**: Removed polished phrases ("genuinely useful,"
   "non-trivial," "the audience is developers who already use Claude Code
   daily"). Shortened sentences. Added more casual connectors ("figured I'd
   share," "the idea started from," "I'd genuinely like to hear"). Cut
   marketing-adjacent language ("fills a gap those frameworks don't address").

4. **r/SideProject post**: Added the "45 minutes a week" detail (key
   differentiator from CEO brief). Simplified the "what I learned" section.
   Made the closing question more direct.

5. **r/ChatGPTCoding post**: Trimmed the comparison table (removed "Setup"
   row redundancy since install is already listed). Shortened the "what's
   different" bullets. Dropped the hedging paragraph about Claude ecosystem
   relevance.

6. **Titles**: Shortened all three. Removed "gruai:" prefix from Post 1
   (r/ClaudeCode cares about what it does, not what it's called). Kept name
   in Post 2 title since it's a comparison post. Simplified Post 3 title.
