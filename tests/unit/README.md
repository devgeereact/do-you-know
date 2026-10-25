# Unit Tests

Test isolated rules, transformations and boundary cases. Prefer behaviour-relevant assertions over implementation detail.

Run with `npm test` (Vitest, jsdom, React Testing Library). Config is `vitest.config.ts`, which maps `@/` to `src/` and pins the public settings the code reads, so a local machine setup cannot change results.

## Layout

- `lib/`: `src/lib` rules. `api.ts` error and session handling with `fetch` mocked, `gameErrors.ts` copy, and `avatars.ts`, which parses `backend/src/Player.php` so the 12 presets and the server whitelist cannot drift apart.
- `hooks/`: `useQuizAttempt`, `useProfile`, `useLeaderboard`, `useDailyChallenge`, `useQuestionTimer` and `useOnlineStatus`, with the services and session mocked at the module boundary.
- `components/`: render tests for `ResultsView` and `ProgressDots`. Children with their own data hooks are stubbed.
- `support/`: typed fixtures for attempt state, answers, summaries and profiles.
- `setup.ts`: jest-dom matchers, automatic cleanup and an in-memory `localStorage` (newer Node versions ship an experimental one that can shadow jsdom's).

## Rules

- Query by role, label or visible text, as a player would. Add a test id to the app only when no accessible query works.
- Game integrity belongs to the PHP API. These tests may check that the client never holds or computes an answer, never a score.
- A module-level token in `src/lib/api.ts` means tests there reload the module (`vi.resetModules()`) for a clean session.
- Keep tests offline and deterministic: fake timers for time, mocks for the network.
