# Changelog

## Unreleased

### Added

- Initial GEE OS project contracts, specifications and evidence structure.

### Changed

- None.

### Fixed

- None.

### Build batch 1 (2026-10-14)

- Recorded the inspected baseline, ordered Milestone 1 batches and remaining work.
- Made the scratch database runner stop on migration failures, reject remote hosts and restrict disposable database names.
- Recorded dependency advisories, private REST caching and the missing resumed-question deadline as separate follow-up work.

### Build batch 2 (2026-10-14)

- Added pinned, repeatable local Supabase startup with loopback binding checks and preserved machine-owned env files.
- Added an original development-only quiz covering choice, true/false and slider questions.
- Added API integrity smoke checks and private Mac access instructions. Mac-origin access remains untested.

### Build batch 3 (2026-10-14)

- Added published quiz discovery, categories, age-group/curriculum filtering and quiz details with explicit loading, empty, retry and offline states.
- Public discovery queries select metadata without author IDs. Browsing does not create an auth session; filter choices stay in page state.
- Centralised new player copy for future translation. Preserved existing login/dashboard routes.
- Verified the catalogue against the local backend in portrait, landscape and at 320px. Gameplay is the next batch.

### Gameplay foundation batch (2026-10-14)

- Added migration 0005 with a server question deadline for refresh-safe countdown display. Existing grading is unchanged.
- Added three matching database checks (64 total).
- Restricted REST caching to public catalogue queries, removed the old broad cache and suppressed update prompts on play routes.

### Guest/game services batch (2026-10-14)

- Added deduplicated anonymous session creation, typed start/answer/next/finish services and the attempt lifecycle hook.
- Added display-only countdown driven by the server deadline, with a preserved clock on resume.
- Verified one guest/start under StrictMode, uncertain answer recovery, lost finish recovery and double-click suppression through the local game UI.
