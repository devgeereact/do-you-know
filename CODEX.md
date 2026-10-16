# Codex adapter

Read `AGENTS.md`. Use project skills and MCPs only when relevant and within the current user's authority. Keep tool-specific mappings here, not shared requirements.

Codex does not run the Claude hook in `.claude/settings.json`. Apply the same rules by
hand: never open `.env*`, keys or `config.php`, ask before destructive or remote commands,
and run `python3 scripts/guard.py` after `git add`. Enable the Git guard once per clone:
`git config core.hooksPath .githooks`.
