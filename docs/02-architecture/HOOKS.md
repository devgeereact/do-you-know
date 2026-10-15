# Custom Hooks Specification — Do You Know

Contracts for every reusable hook in `src/hooks`. Signatures here are the source
of truth — implementations must match.

## 1. `usePWAInstall`
`src/hooks/usePWAInstall.ts`
Captures the deferred `beforeinstallprompt` event and drives the install UI.
```ts
interface UsePWAInstall {
  isInstallable: boolean;   // a prompt is available
  isInstalled: boolean;     // running in standalone / already installed
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}
export function usePWAInstall(): UsePWAInstall;
```

## 2. `useOnlineStatus`
`src/hooks/useOnlineStatus.ts`
Reactive network connectivity based on `online`/`offline` window events.
```ts
export function useOnlineStatus(): boolean; // true when online
```

## 3. `useSupabaseAuth`
`src/hooks/useSupabaseAuth.ts`
Thin consumer of `AuthContext` — the single source of session truth. The provider
(`src/context/AuthContext.tsx`) owns the listener; this hook exposes it.
```ts
interface UseSupabaseAuth {
  user: User | null;
  session: Session | null;
  loading: boolean;         // initial session resolve in flight
  signOut: () => Promise<void>;
}
export function useSupabaseAuth(): UseSupabaseAuth;
```

## 4. `useOptimizedImage`
`src/hooks/useOptimizedImage.ts`
Builds a transformed ImageKit URL (real-time resize + auto format/quality).
```ts
interface ImageTransform {
  width?: number;
  height?: number;
  quality?: number;        // 1–100, default 80
  crop?: 'maintain_ratio' | 'force' | 'at_max';
}
export function useOptimizedImage(path: string, t?: ImageTransform): string;
```

## 5. `useInngestDispatch`
`src/hooks/useInngestDispatch.ts`
Dispatches a typed event to Inngest's ingest endpoint using the write-only key.
Fire-and-forget; failures are reported to Sentry, never thrown into the UI.
```ts
interface DispatchResult { ok: boolean; }
interface UseInngestDispatch {
  sending: boolean;
  send: (name: string, data: Record<string, unknown>) => Promise<DispatchResult>;
}
export function useInngestDispatch(): UseInngestDispatch;
```

## Do You Know — app hooks
Base hooks 1–5 above are unchanged. The hooks below are the app's own contracts. RPC
payload types (`AttemptState`, `AnswerResult`, `AttemptSummary`, `Leaderboard`, …) are in
`src/types/game.ts`; staff types in `src/types/admin.ts`. Every hook that calls an RPC maps
rule errors through `gameErrorMessage()` and reports anything else to Sentry.

### 6. `useGuestSession`
`src/hooks/useGuestSession.ts`
Ensures there is a session before play. Signs in anonymously (guest) on first use; never
prompts for an email.
```ts
interface UseGuestSession {
  ready: boolean;                  // a session (guest or player) exists
  isGuest: boolean;                // session.user.is_anonymous
  ensureSession: () => Promise<void>; // idempotent; call before start_attempt
  error: string | null;
}
export function useGuestSession(): UseGuestSession;
```

### 7. `useQuizAttempt`
`src/hooks/useQuizAttempt.ts`
Drives one game from start to results. The server is the source of truth; on mount it
calls `start_attempt`, which resumes an open attempt (refresh-safe).
```ts
type AttemptPhase = 'loading' | 'question' | 'feedback' | 'finishing' | 'results' | 'error';
interface StartArgs {
  mode: AttemptMode;               // 'practice' | 'ranked' | 'daily' | 'challenge'
  quizSlug?: string;               // practice / ranked
  challengeCode?: string;          // challenge
}
interface UseQuizAttempt {
  phase: AttemptPhase;
  state: AttemptState | null;      // current question (no answers), position/total
  lastResult: AnswerResult | null; // set in 'feedback'
  summary: AttemptSummary | null;  // set in 'results'
  submitting: boolean;
  error: string | null;            // friendly copy
  answerOption: (optionId: string) => Promise<void>;
  answerValue: (value: number) => Promise<void>;   // slider
  timeUp: () => Promise<void>;     // display timer hit zero: waits out the server's
                                   // 1.5 s grace, then asks the server to mark it timed out
  next: () => Promise<void>;       // next_question, or finish_attempt after the last
  restart: () => Promise<void>;    // new attempt, same quiz/mode
}
export function useQuizAttempt(args: StartArgs): UseQuizAttempt;
```

### 8. `useQuestionTimer`
`src/hooks/useQuestionTimer.ts`
Display-only countdown for timed quizzes. The server decides time-outs; this only shows
seconds left and fires a callback at zero.
```ts
interface UseQuestionTimer {
  secondsLeft: number | null;      // null when the quiz has no timer
  isLow: boolean;                  // ≤ 5 s (switch to warning token + aria-live)
}
export function useQuestionTimer(
  limitSeconds: number | null,
  questionKey: string | null,      // resets when the question changes
  onExpire?: () => void,
): UseQuestionTimer;
```

### 9. `useQuizCatalog`
`src/hooks/useQuizCatalog.ts`
Published categories, quizzes and curriculum tags with age/curriculum filters.
```ts
interface CatalogFilters {
  categorySlug?: string;
  age?: number;                    // matches age_min ≤ age ≤ age_max
  curriculumTag?: string;          // e.g. 'uk-ks2'
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

### 9a. `useQuiz`
`src/hooks/useQuiz.ts`
One published quiz by slug for its landing page (`/q/:slug`). Quiz row only, never questions.
```ts
interface UseQuiz {
  quiz: Quiz | null;
  notFound: boolean;               // loaded, but not published or no such slug
  loading: boolean;
  error: string | null;
}
export function useQuiz(slug: string | undefined): UseQuiz;
```

### 9b. `useMyGames`
`src/hooks/useMyGames.ts`
The current player's finished games (newest first) and daily streak, for `/me`. Scores are
read back from rows the server wrote; RLS limits them to the player's own attempts.
```ts
interface UseMyGames {
  games: GameHistoryItem[];        // from gameService.listMyGames
  streak: { current: number; best: number };
  loading: boolean;
  error: string | null;
}
export function useMyGames(): UseMyGames;
```

### 10. `useDailyChallenge`
`src/hooks/useDailyChallenge.ts`
Today's challenge (London date) and whether this player has played it.
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

### 11. `useFriendChallenge`
`src/hooks/useFriendChallenge.ts`
Create a share link after a finished attempt, or load a preview from a code.
```ts
interface UseFriendChallenge {
  preview: FriendChallengePreview | null;          // when a code is passed
  loading: boolean;
  error: string | null;
  create: (attemptId: string) => Promise<{ code: string; url: string } | null>;
  share: (url: string, text: string) => Promise<'shared' | 'copied' | 'failed'>; // Web Share → clipboard fallback
}
export function useFriendChallenge(code?: string): UseFriendChallenge;
```

### 12. `useLeaderboard`
`src/hooks/useLeaderboard.ts`
```ts
interface UseLeaderboard {
  data: Leaderboard | null;        // top rows + my rank
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
export function useLeaderboard(quizSlug: string | null, board: Board, limit?: number): UseLeaderboard;
```

### 13. `useProfile`
`src/hooks/useProfile.ts`
The current player's profile and the protected actions that change it.
```ts
interface UseProfile {
  profile: Profile | null;
  isChild: boolean;                // age_band === 'under_13'
  loading: boolean;
  error: string | null;
  setAgeBand: (band: AgeBand) => Promise<boolean>;     // once only
  shuffleNickname: () => Promise<string | null>;       // generated; kids' only option
  setNickname: (nickname: string) => Promise<boolean>; // 13+ only
  confirmParentalConsent: () => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
}
export function useProfile(): UseProfile;
```

### 14. `useAvatarBuilder`
`src/hooks/useAvatarBuilder.ts`
Trait picker + generation status. Allowed values come from the server; uniqueness and
the daily limit are enforced server-side.
```ts
interface UseAvatarBuilder {
  traits: AvatarTraits;
  options: Record<keyof AvatarTraits, string[]>;   // filtered (no adult look for kids, facial hair only for adult)
  setTrait: <K extends keyof AvatarTraits>(key: K, value: AvatarTraits[K]) => void;
  randomise: () => void;
  generate: () => Promise<void>;   // request_avatar → Inngest 'avatar/requested'
  status: AvatarStatus | 'idle';
  avatar: Avatar | null;           // latest request; polled until ready/failed
  remainingToday: number;
  error: string | null;            // e.g. "Someone already has that exact look!"
  useAvatar: () => Promise<boolean>; // set_active_avatar
}
export function useAvatarBuilder(): UseAvatarBuilder;
```

### 15. `useAnalyticsConsent`
`src/hooks/useAnalyticsConsent.ts`
Consent state for optional analytics (PECR). Analytics stay off until `granted`, and stay
cookieless for under-13s.
```ts
type ConsentState = 'unknown' | 'granted' | 'denied';
interface UseAnalyticsConsent {
  consent: ConsentState;
  setConsent: (c: Exclude<ConsentState, 'unknown'>) => void;
  track: (event: AnalyticsEvent, props?: Record<string, string | number | boolean>) => void; // no-op without consent
}
type AnalyticsEvent =
  | 'quiz_viewed' | 'quiz_started' | 'question_answered' | 'quiz_completed'
  | 'result_shared' | 'challenge_created' | 'challenge_opened' | 'challenge_completed'
  | 'account_created' | 'app_installed';
export function useAnalyticsConsent(): UseAnalyticsConsent;
```

### 16. Admin hooks (staff only, `src/hooks/admin/`)
```ts
// useAdminQuizEditor — load/save a quiz and its question pool; publish needs admin.
interface UseAdminQuizEditor {
  quiz: Quiz | null;
  pool: (Question & { options: QuestionOption[]; position: number })[];
  dirty: boolean;
  saving: boolean;
  error: string | null;
  update: (patch: Partial<Quiz>) => void;
  addQuestion: (questionId: string) => void;
  removeQuestion: (questionId: string) => void;
  reorder: (questionIds: string[]) => void;
  save: () => Promise<boolean>;                         // autosave target
  publish: (publishAt?: string) => Promise<{ ok: boolean; detail?: string }>; // publish_quiz
}
export function useAdminQuizEditor(quizId: string | 'new'): UseAdminQuizEditor;

// useCsvImport — parse, validate and import question rows as drafts.
interface UseCsvImport {
  rows: QuestionCsvRow[];
  issues: { row: number; message: string }[];
  parse: (file: File) => Promise<void>;
  importValid: (categoryId: string) => Promise<{ imported: number; skipped: number }>;
}
export function useCsvImport(): UseCsvImport;

// useAiDrafts — request drafts (Inngest 'questions/draft.requested') and import them.
interface UseAiDrafts {
  drafts: AiQuestionDraft[];
  request: (input: { topic: string; categoryId: string; difficulty: Difficulty;
                     ageMin?: number; ageMax?: number; count: number }) => Promise<boolean>;
  importDraft: (draftId: string) => Promise<{ imported: number; skipped: number } | null>;
  refresh: () => Promise<void>;
}
export function useAiDrafts(): UseAiDrafts;
```

## Conventions
- Every hook is fully typed with an explicit return interface.
- Hooks never read `import.meta.env` directly — they import from `@/lib/env`.
- Side-effectful hooks clean up their listeners in the `useEffect` return.
- Game hooks never hold or derive an answer before `answer_question` returns it.
- Polling (avatars, AI drafts) backs off (2 s → 10 s) and stops when the tab is hidden.
