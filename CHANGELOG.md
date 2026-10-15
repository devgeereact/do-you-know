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

### Player UI and progress batch (2026-10-14)

- Enabled guest play with all three answer controls, server feedback, explanation/source links, results, full review and replay.
- Added session-owned latest-20 history at `/me` without collecting names, emails or free text.
- Verified complete play and recovery journeys plus real service-worker caching and update suppression against the static build.
- Fixed static deep-link asset 404s with a root base for the dedicated docroot (ADR-002).
- Milestone 1 passes local acceptance. Real devices, Mac-origin access, dependency advisories and later milestones remain pending.

### Competition services (15 October 2026)

- Added abortable public leaderboard reads, owner-scoped identity reads and protected generated nickname/age-band RPC wrappers.
- Began Milestone 2 on a branch stacked above the unmerged Milestone 1 PR.
- Existing CodeRabbit summaries are not a line-by-line review approval.

### Server daily preview (15 October 2026)

- Added read-only daily preview RPC using the same server London date as play, with own completion/streak only.
- Added five database checks, bringing the scratch suite to 69 checks.

### Challenge services (15 October 2026)

- Added daily and friend challenge services/hooks, with preview reads that do not create guest sessions.
- Added explicit challenge creation and Web Share/clipboard fallback with manual-copy recovery.
- Added a local daily fixture using the server's London date; existing scheduled days are preserved.

### Competition UI (15 October 2026)

- Added ranked launch, weekly/all-time/daily leaderboards and generated nickname/locked age-band settings with no free-text fields.
- Added server-dated daily preview, once-per-day play, streak display, friend preview/play and server-returned head-to-head results.
- Added explicit challenge creation and native-share/clipboard/manual link recovery.
- Verified two-session play, frozen question order, own-challenge rejection, privacy, responsive layouts, direct static routes and uncached competition responses.
- Avatars, share-card images and physical-device/release checks remain pending.

### Visual refinement (15 October 2026)

- Added compact four-tab navigation, clear current-page feedback, lighter card outlines and quiet secondary controls.
- Kept brand typography and colours, added immediate press feedback and header transparency/contrast fallbacks.
- Typecheck, lint, static build and responsive browser checks pass. Daily freshness remains scheduled as a separate unranked-round batch and needs adequate question content.
