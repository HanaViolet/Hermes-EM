## Repo-Scoped Sessions

Scope the server to only track sessions and directives from the agent-conductor repo, not globally across all repos (no more sw repo info).

### Requirements
- Session scanning should only discover/track sessions belonging to the agent-conductor project
- Remove any multi-repo scanning logic
- Simplify server code that was handling multiple projects/repos
- Sessions still come from `~/.claude/projects/` but filter to only the project dir matching agent-conductor
- Dashboard should only show agent-conductor sessions, not sessions from other repos

### CEO Questions Answered
- "Do we still need to go to global ~/.claude?" — Yes, Claude Code stores all sessions there. But we filter by project path.
- "This simplifies our server massively?" — Yes, removes multi-project scanning, multi-repo aggregation, project grouping logic.
