# Custom Hooks Specification: Do You Know

Updated 16 October 2026. Contracts for every hook in `src/hooks`. Signatures here must
match the implementations. All server calls go through `src/services/*`, which use
`src/lib/api.ts` (the PHP API at `/api/v1`). Game payload types (`AttemptState`,
`AnswerResult`, `AttemptSummary`, `Leaderboard`, …) are in `src/types/game.ts`; row
shapes (`Profile`, `Quiz`, `Category`, …) are in `src/types/domain.ts`. Hooks that call
the API map rule errors through `gameErrorMessage()` and report anything else to Sentry.

Adults sign in only on `/account`, which uses Clerk's own `useAuth` (guarded by
`isLoaded`) inside a lazily loaded `ClerkProvider`. A Clerk sign-in never marks the guest
session ready and is not linked to game history yet.

## Base hooks

### 1. `usePWAInstall`

`src/hooks/usePWAInstall.ts`. Captures the deferred `beforeinstallprompt` event.

```ts
interface UsePWAInstall {
  isInstallable: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}
export function usePWAInstall(): UsePWAInstall;
```

### 2a. `useDocumentMeta`

`src/hooks/useDocumentMeta.ts`. Every page calls it once. It sets the document title
(`<title> · Do You Know`), meta description, `og:title`/`og:description`/`og:url`, the
canonical link and robots. Personal and play pages pass `noindex: true`.

```ts
interface DocumentMeta {
  title?: string;
  description?: string;
  noindex?: boolean;
}
export function useDocumentMeta(meta: DocumentMeta): void;
```

### 2. `useOnlineStatus`

`src/hooks/useOnlineStatus.ts`. Reactive connectivity from `online`/`offline` events.

```ts
export function useOnlineStatus(): boolean;
```

### 3. `useOptimizedImage`

`src/hooks/useOptimizedImage.ts`. Memoised ImageKit URL for quiz cover images.

```ts
interface ImageTransform {
  width?: number;
  height?: number;
  quality?: number; // 1–100, default 80
  crop?: 'maintain_ratio' | 'force' | 'at_max';
}
export function useOptimizedImage(path: string, transform?: ImageTransform): string;
```

## Session hooks

### 4. `useSession`

`src/hooks/useSession.ts`. Reads `SessionContext` (`src/context/SessionContext.tsx`).
Throws outside `<SessionProvider>`.

```ts
interface SessionContextValue {
  user: { id: string } | null; // the player's profile id on the server
  loading: boolean;
  ensureSession: () => Promise<void>; // POST /guest-sessions once per browser, then GET /me
  signOut: () => Promise<void>; // DELETE /session, then forget the token
}
export function useSession(): SessionContextValue;
```

The opaque `guest_` token is kept in localStorage key `dyk-guest`. A 401 clears it.

### 5. `useGuestSession`

`src/hooks/useGuestSession.ts`. Makes sure there is a guest session before play. Never
asks for an email.

```ts
interface UseGuestSession {
  ready: boolean; // a guest session exists
  isGuest: boolean; // always true: every player is a guest
  ensureSession: () => Promise<void>; // idempotent; call before starting a game
  error: string | null;
}
export function useGuestSession(): UseGuestSession;
```

## Game hooks

### 6. `useQuizAttempt`

`src/hooks/useQuizAttempt.ts`. Drives one game from start to results. On mount it calls
`POST /attempts`, which resumes an open attempt (refresh-safe).

```ts
type AttemptPhase = 'loading' | 'question' | 'feedback' | 'finishing' | 'results' | 'error';
interface StartAttemptArgs {
  mode: AttemptMode; // 'practice' | 'ranked' | 'daily' | 'challenge'
  quizSlug?: string; // practice / ranked
  challengeCode?: string; // challenge
}
interface UseQuizAttempt {
  phase: AttemptPhase;
  state: AttemptState | null; // current question (no answers), position/total
  lastResult: AnswerResult | null; // set in 'feedback'
  summary: AttemptSummary | null; // set in 'results'
  submitting: boolean;
  error: string | null; // friendly copy
  answerOption: (optionId: string) => Promise<void>;
  answerValue: (value: number) => Promise<void>; // slider
  timeUp: () => Promise<void>; // waits out the server's 1.5 s grace, then asks the server
  next: () => Promise<void>; // /next, or /finish after the last question
  restart: () => Promise<void>; // new attempt, same quiz and mode
}
export function useQuizAttempt(args: StartAttemptArgs): UseQuizAttempt;
```

### 7. `useQuestionTimer`

`src/hooks/useQuestionTimer.ts`. Display-only countdown. The server decides time-outs.

```ts
interface UseQuestionTimer {
  secondsLeft: number | null; // null when the quiz has no timer
  isLow: boolean; // ≤ 5 s
}
export function useQuestionTimer(
  limitSeconds: number | null,
  questionKey: string | null, // resets when the question changes
  onExpire?: () => void,
  clock?: { deadline?: string | null; serverNow?: string }, // server display deadline
): UseQuestionTimer;
```

### 8. `useQuizCatalog`

`src/hooks/useQuizCatalog.ts`. Published categories, quizzes and curriculum tags.

```ts
interface CatalogFilters {
  categorySlug?: string;
  age?: number; // matches age_min ≤ age ≤ age_max
  curriculumTag?: string; // e.g. 'uk-ks2'
  search?: string;
}
interface UseQuizCatalog {
  categories: Category[];
  quizzes: Quiz[];
  curriculumTags: CurriculumTag[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
export function useQuizCatalog(filters?: CatalogFilters): UseQuizCatalog;
```

### 9. `useQuiz`

`src/hooks/useQuiz.ts`. One published quiz by slug (`GET /quizzes/{slug}`). Never questions.

```ts
interface UseQuiz {
  quiz: Quiz | null;
  notFound: boolean;
  loading: boolean;
  error: string | null;
}
export function useQuiz(slug: string | undefined): UseQuiz;
```

### 10. `useMyGames`

`src/hooks/useMyGames.ts`. The player's finished games (`GET /me/games`) and streak.

```ts
interface UseMyGames {
  games: GameHistoryItem[];
  streak: { current: number; best: number };
  loading: boolean;
  error: string | null;
}
export function useMyGames(): UseMyGames;
```

### 11. `useDailyChallenge`

`src/hooks/useDailyChallenge.ts`. Today's challenge (London date, `GET /daily`) and
whether this player has finished it (`GET /me/daily/{id}/finished`).

```ts
interface UseDailyChallenge {
  today: { date: string; quiz: Pick<Quiz, 'slug' | 'title' | 'cover_image_url'> } | null;
  playedToday: boolean;
  streak: number;
  loading: boolean;
  error: string | null;
}
export function useDailyChallenge(): UseDailyChallenge;
```

### 12. `useFriendChallenge`

`src/hooks/useFriendChallenge.ts`. Create a link after a finished attempt
(`POST /attempts/{id}/challenge`) or load a preview (`GET /challenges/{code}`).

```ts
interface UseFriendChallenge {
  preview: FriendChallengePreview | null; // when a code is passed
  loading: boolean;
  error: string | null;
  create: (attemptId: string) => Promise<{ code: string; url: string } | null>;
  share: (url: string, text: string) => Promise<'shared' | 'copied' | 'failed'>;
}
export function useFriendChallenge(code?: string): UseFriendChallenge;
```

### 13. `useLeaderboard`

`src/hooks/useLeaderboard.ts`. `GET /leaderboards` with board, quiz slug and limit. Rows
carry nickname, `avatar_id`, score and time only.

```ts
interface UseLeaderboard {
  data: Leaderboard | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
export function useLeaderboard(
  quizSlug: string | null,
  board: Board,
  limit?: number,
): UseLeaderboard;
```

### 14. `useProfile`

`src/hooks/useProfile.ts`. The player's profile (`GET /me`) and the protected actions.

```ts
interface UseProfile {
  profile: Profile | null;
  isChild: boolean; // age_band === 'under_13'
  loading: boolean;
  error: string | null;
  setAgeBand: (band: AgeBand) => Promise<boolean>; // once only
  shuffleNickname: () => Promise<string | null>; // generated; the only option for under-13s
  setNickname: (nickname: string) => Promise<boolean>; // 13+ only
  setAvatar: (avatarId: string) => Promise<boolean>; // one of the 12 presets
  deleteAccount: () => Promise<boolean>; // POST /me/delete
  refresh: () => Promise<void>;
}
export function useProfile(): UseProfile;
```

## Conventions

- Every hook is fully typed with an explicit return interface.
- Hooks never read `import.meta.env` directly; they import from `@/lib/env`.
- Hooks never call `fetch` for app data; they use `src/services/*`.
- Side-effectful hooks clean up their listeners in the `useEffect` return.
- Game hooks never hold or derive an answer before the answer endpoint returns it.
