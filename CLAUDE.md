# Claude Code — Do You Know

Read AGENTS.md and docs/00-foundation/CLAUDE-CODE-HANDOFF.md. Work in this folder, not the archived source or the reusable kit. Canonical domain: https://doyouknow.space. Repository target: gsakinz/do-you-know (private, not yet connected at baseline).

Use the established React/TypeScript/Tailwind/PHP/MariaDB architecture, npm lockfile and dev port 5202. Keep grading and permissions server-side, children’s data protected, real configuration outside Git/public roots and applied migrations immutable. Existing agent_guard.py hooks remain in effect; a block is not permission to bypass safeguards.

This handoff is for continued development after a local rebrand. Do not assume historical release evidence, old auth, server directories, cron jobs or database records apply to the new domain. Finish the scoped GitHub/FTPS/foundation checklist before release. No global GEE OS installation or other computer is required to read this project's own rules.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
