---
phase: 01-clean-up-and-foundations
reviewed: 2026-11-08T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - AGENTS.md
  - src/lib/london.ts
  - src/lib/adminValidation.ts
  - src/services/gameService.ts
  - src/services/profileService.ts
  - src/context/SessionContext.tsx
  - src/pages/PlayPage.tsx
  - src/pages/HomePage.tsx
  - src/pages/GrownUpsPage.tsx
  - src/i18n/en-GB.ts
  - tests/unit/lib/london.test.ts
  - tests/unit/services/profileService.test.ts
findings:
  critical: 0
  warning: 5
  info: 5
  total: 10
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-11-08
**Depth:** standard (diff against `origin/main`, plus the callers and callees the diff touches: `src/lib/api.ts`, `useProfile`, `useDailyChallenge`, `DailyPage`, `Art.tsx`, `index.css`)
**Files Reviewed:** 12
**Status:** issues_found

## Summary

The refactors are mostly sound. `londonToday` is moved without a behaviour change, and the re-exports keep every importer working. The `getProfile()` coalescing has no unhandled rejection: the `.finally()` clone is the same promise that gets stored and returned, and every caller awaits it. The identity guard in `.finally` is correct, and `change()` resets the in-flight request both before and after the write.

The coalescing is only safe against writes made through `profileService`. It is blind to the other events that change which player or what data `/me` returns (token swaps, sign-out, game results). It also does nothing about out-of-order application of responses in the callers. The consolidation of the London date helper stopped short and leaves a DST bug in two consumers. The `PlayPage` character move keeps the old overlap risk on medium screens and makes the SVG a tap target.

No critical issues were found.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: The shared `/me` request survives a token swap, so a caller can be handed another session's profile

**File:** `src/services/profileService.ts:5-35` (interacts with `src/lib/api.ts:85-135`, `src/pages/GrownUpsPage.tsx:63`, `src/context/SessionContext.tsx:74-92`)
**Issue:** `getProfile()` joins any in-flight request whatever token it was sent with. The bearer token is captured when `api()` calls `fetch`, but only `change()` forgets the request. These events swap or drop the token and never forget it:
- `adoptGuestToken` (parent hands the device to a child)
- `clearSession` (including the automatic one on any 401)
- `signOutGuest`
- `ensureGuest` creating a new guest

Concrete path: `useProfile.run` fires `void reloadSession()`, which starts `/me` under guest A. The player then signs out, or taps Play after the code was cleared. `ensureSession()` runs `ensureGuest()` (guest B) and then `load()`, and `load()` joins A's in-flight request. Depending on timing, one of two things happens:
- `setUser` is given A's id, nickname and avatar while the token is B's.
- A's request returns 401, and `api()` calls `clearSession()`, which wipes B's brand new token. The recovery branch in `ensureSession` then creates a third guest.

The window is small, but the service now guarantees nothing across sessions, on a device shared between children.
**Fix:** Key the in-flight request by the identity it was sent under. Export a monotonically increasing `sessionEpoch` from `lib/api.ts`, bumped in `adoptGuestToken`, `clearSession` and when `ensureGuest` stores a token. Then:
```ts
let profileRequest: { epoch: number; promise: Promise<Profile> } | null = null;
export function getProfile(): Promise<Profile> {
  const epoch = sessionEpoch();
  if (profileRequest?.epoch === epoch) return profileRequest.promise;
  const promise = api<Profile>('/me').finally(() => {
    if (profileRequest?.promise === promise) profileRequest = null;
  });
  profileRequest = { epoch, promise };
  return promise;
}
```
Add tests for `adoptGuestToken` and `clearSession` between two `getProfile()` calls.

### WR-02: Stale responses are still applied out of order. The "never older than the last save" guarantee holds only for new callers

**File:** `src/services/profileService.ts:22-35`, `src/context/SessionContext.tsx:45-62`, `src/hooks/useProfile.ts:36-42`
**Issue:** `change()` stops *new* callers reusing an old request, but callers already awaiting it still receive the pre-change profile. The unit test at `tests/unit/services/profileService.test.ts:34-46` pins this (`stale` resolves `Old`). Nothing downstream orders the responses:
- `SessionContext.load` does `setUser(next)` after the await, with no sequence check. A page-load `/me` (R1) is in flight when the player changes their avatar. `useProfile.run` then triggers a second `/me` (R2) through `reload()` and `reloadSession()`. If R1 resolves after R2, which is possible with concurrent PHP workers, the header menu shows the old avatar or nickname until the next reload.
- `useProfile.reload` calls `setProfile(await getProfile())` with no `active` or user check. Only `setLoading` and `reportError` are guarded in the effect. A response for the previous `userId` can overwrite the profile after the user changes.

Game results (streak, `last_daily_date`) change `/me` but go through `gameService`, which never calls `profileChanged()`. A page-load `/me` joined just after the last answer shows the old streak.
**Fix:** Add a per-consumer request counter. In `load` and `reload`, take `const seq = ++latest.current` before the await and `if (seq !== latest.current) return` before setting state. Also export a `profileChanged`/`invalidateProfile` from the service and call it from the submit-result paths in `gameService`. Correct the doc comment so it says "new callers", not "the answer".

### WR-03: "Yesterday" and the 7-day strip are wrong around the UK clock changes. The helper consolidation left these copies behind

**File:** `src/hooks/useDailyChallenge.ts:24-26`, `src/pages/DailyPage.tsx:118-120` (consumers of `src/lib/london.ts`)
**Issue:** Both build earlier days with `Date.now() - n * 86400000` and then format in London time. A London day is 23 or 25 hours long twice a year, so subtracting 24 hours does not land on the previous calendar day. Example: 00:30 BST on 2027-03-29, the day after the clocks go forward. Now minus 24 hours is 23:30 on 2027-03-27 in London, so "yesterday" resolves to the 27th instead of the 28th. For that first hour the streak shows 0 even though the player played yesterday. The 7-day strip can likewise repeat or skip a date on clock-change days. `adminValidation.ts` already has a correct string-based `addDays` (UTC noon arithmetic).
**Fix:** Put the date arithmetic next to `londonToday` in `src/lib/london.ts`, and use it from both places:
```ts
export function londonDaysAgo(n: number, now: Date = new Date()): string {
  const d = new Date(`${londonToday(now)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
```
Move `addDays` there too and re-export it from `adminValidation`. Add the DST boundary dates to `london.test.ts`.

### WR-04: The stage character can overlap the answers on medium screens and, as an unprotected SVG, can intercept taps

**File:** `src/pages/PlayPage.tsx:391-409` (with `src/components/art/Art.tsx:28-39`)
**Issue:** On small screens the content column reserves `pb-28` (7rem) for a 6rem character at `bottom-3`, which is correct. From `md` up the column only has `md:pb-10` (2.5rem), but the character is 10.5rem tall at `md:bottom-6`, so it occupies the bottom 12rem. A long prompt with six options, a tile build or an assign board that spans the width can sit under it. The character is `absolute z-[3]` inside the `z-[2]` column, and the `Character` SVG gets only the sizing class. It does not have `pointer-events-none`, unlike the other art components in `Art.tsx`. An overlapped answer button or tile is therefore not tappable where it is covered. The same placement existed before the move, but nothing in the diff addressed it. The move also drops the `blur-[3px]` that de-emphasised the friend during feedback. This looks deliberate, but it is not mentioned anywhere.
**Fix:** Add `pointer-events-none` to the host wrapper or the SVG class. Raise the column's `md:pb-*` to roughly 12rem. Alternatively hide the character on `md` when `question.type` is `assign` or `build`. Check at 360 px, 768 px and 1024 px wide with the longest prompt and six options.

### WR-05: `/grown-ups` shows the friendly loading card forever if Clerk never loads, and a failed link is swallowed

**File:** `src/pages/GrownUpsPage.tsx:51-54, 73, 100`
**Issue:** `if (!isLoaded) return <ParentLoading />` has no timeout or error branch. If Clerk's script is blocked (an ad blocker, a school network, offline), a grown-up sees "Getting your area ready…" with a pulsing skeleton indefinitely and no way out. The copy change makes the dead end look intentional. `linkAdultSession(...).then(confirmGrownUp).catch(() => undefined).finally(setReady(true))` also hides a failed link. The parent panels then render and every call fails with a generic error.
**Fix:** After about 10 seconds in either loading state, show an error card with a retry button and the existing "children can still play as guests" line. Keep the link failure in state, and show it (and report it) instead of silently setting `ready`.

## Info

### IN-01: `londonToday` relies on the `en-CA` locale producing `YYYY-MM-DD`

**File:** `src/lib/london.ts:2-9`
**Issue:** The output format of `en-CA` depends on the engine's ICU data (it has changed between versions, and older Safari differs). The date drives the daily challenge, and the unit tests only prove the format on the Node version in use.
**Fix:** Build the string from `formatToParts` (`year`, `month`, `day`), or assert the format in a test that also runs in the browser e2e job.

### IN-02: The loading card sets `role="status"` and `aria-live="polite"` together

**File:** `src/pages/GrownUpsPage.tsx:23`
**Issue:** `status` already implies a polite live region, so `aria-live` is redundant. The text is present at mount, so some screen readers will not announce it.
**Fix:** Drop `aria-live`. Optionally render the status text first and the skeleton after, which is already the structure used.

### IN-03: The "primary-age" featured quiz can still fall back to a teen set, and the age rules are loose

**File:** `src/pages/HomePage.tsx:91-98`
**Issue:** The comment says "never a teenage one", but the fallbacks `trending[0]` and `quizzes.find(isKids)` can return an age-12 to 17 set. `forYoung` treats `age_min == null` as 0, so an untagged quiz counts as primary-age. `age_max` is ignored. The behaviour may be acceptable, but the comment overstates it.
**Fix:** Reword the comment to "prefers". If untagged quizzes should not feature, require `q.age_min != null`.

### IN-04: `SessionContext.load` treats every failure as an expired token

**File:** `src/context/SessionContext.tsx:59-62`
**Issue:** A timeout or `network_error` also hits the catch and sets `user` to null. The token is still stored, so `ensureSession` neither retries nor creates a guest (`hasSession()` is true), and Play can fail until a reload. The comment says "expired or revoked token". Because the request is now shared, one network failure fails every joined caller together.
**Fix:** Clear the user only for `ApiError` with status 401 or 403. For other errors, keep the previous user and let `ensureSession` retry once.

### IN-05: Test gaps for the new service and helper behaviour

**File:** `tests/unit/services/profileService.test.ts`, `tests/unit/lib/london.test.ts`
**Issue:**
- There is no test that a failed change still resets the request. The `finally` in `change()` is untested, as is a `getProfile()` started while a change is in flight.
- There is no test that a token or session change prevents sharing (see WR-01).
- The `london.test.ts` "one shared helper" test checks object identity only. It cannot catch the DST problem (WR-03), and there is no test that `useDailyChallenge` and `DailyPage` use the shared helper.
- The profile tests share module-level state and rely on every test awaiting its pending promise.
**Fix:** Add the cases above, and reset the module between tests with `vi.resetModules()` and a dynamic import.

---

_Reviewed: 2026-11-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

## Resolution (8 Nov 2026, by the orchestrator, test first)

| Finding | Outcome |
| --- | --- |
| WR-01 shared `/me` crossing sessions | **Fixed.** `lib/api.ts` exports `sessionEpoch()`, bumped on a new guest, hand-over and clear-session; `getProfile()` only joins a request sent under the same epoch. Tests: token swap between two calls, same-session sharing, failed change. |
| WR-03 yesterday and the 7-day strip around clock changes | **Fixed.** `londonDaysAgo` and `addDays` live in `lib/london.ts` and count calendar days; `useDailyChallenge` and `DailyPage` use them. Tests: 29 Mar 2027, 31 Oct 2027, a seven-day run, month and year ends. |
| WR-04 character taps | **Fixed in part.** `pointer-events-none` on the character host. The md-and-up overlap with long answer lists was not reproduced on the desktop screenshots; NOT TESTED on a phone. |
| WR-02 out-of-order responses in `SessionContext.load` and `useProfile.reload` | **Open (advisory).** Needs a per-consumer sequence check and a call to invalidate from game results; planned, not done here. Doc comment corrected to say "new callers". |
| WR-05 `/grown-ups` loading card forever if Clerk never loads | **Open (advisory).** Needs a timeout and a message; planned. |
| IN-01 to IN-05 | Open, low priority. IN-02 and IN-03 are wording only. |

Checks after the fixes: `pnpm check` PASS (405 unit), browser suite 86 of 86 PASS on the throwaway stack.
