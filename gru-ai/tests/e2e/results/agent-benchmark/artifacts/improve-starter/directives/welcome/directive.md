# Welcome to gruai

Hey -- you just set up your AI dev team. Here's what happened and what to do next.

## What gruai Did

`gruai init` created a `.context/` directory in your repo. This is where your
team organizes its work:

- **Directives** -- units of work. Each directive is a brief (like this one)
  that your agents pick up, plan, build, review, and deliver.
- **Agent roles** -- defined in `.claude/agents/`. Each role has a personality,
  specialization, and set of skills.
- **Lessons** -- a shared knowledge base your agents build up over time as they
  learn patterns in your codebase.

## Your Team

gruai ships with a default team:

| Role | What They Do |
|------|-------------|
| **Morgan** (Planner) | Reads directives, decomposes into projects and tasks |
| **Devon** (Builder) | Writes code, runs tests, ships features |
| **Sarah** (Reviewer) | Reviews code, checks quality, catches bugs |
| **Priya** (Auditor) | Assesses technical risk before work begins |
| **Taylor** (Content) | Writes docs, templates, and structured content |

You can customize these or add your own in `.claude/agents/`.

## Try It

1. Open the dashboard at [http://localhost:5173](http://localhost:5173)
2. Run your first directive:
   ```bash
   gruai directive welcome
   ```
3. Watch your agents in the pixel-art office as they process this directive
4. When they finish, you'll be asked to approve the result

## What's Next

- **Create a real directive**: Write a brief in `.context/directives/my-feature/directive.md`
  describing what you want built. Add a `directive.json` with the metadata.
- **Customize your team**: Edit the agent files in `.claude/agents/` to match
  your workflow.
- **Read the docs**: Check `gruai --help` for all available commands.

This directive is lightweight -- it skips the heavy planning steps and runs fast.
Your agents will read this file, understand the project structure, and report
back with a summary of what they found.

Welcome aboard.
