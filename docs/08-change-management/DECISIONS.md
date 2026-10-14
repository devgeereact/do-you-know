# Decision Log

| ID | Date | Decision | Context | Alternatives | Consequences | Owner | Evidence |
|---|---|---|---|---|---|---|---|
| ADR-001 | `UNKNOWN` | Project scaffold adopted | New project | Blank setup | Full controls available from discovery | `UNKNOWN` | GEE OS blueprint |
| ADR-002 | 2026-10-14 | Static build targets the app's dedicated docroot root with absolute asset base | Direct `/play/...` loads requested missing `/play/assets/...` under relative base | Relative base, explicit subdirectory build | Direct links/refresh work; subdirectory deployment requires a separate base/router configuration | Codex, existing dedicated-docroot contract | Local static browser failure and recheck |
