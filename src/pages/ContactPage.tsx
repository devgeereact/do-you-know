import { useId, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Character } from '@/components/art/Art';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { chipClass } from '@/components/ui/cardClasses';
import { proseLinkClass } from '@/components/ui/linkClasses';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { useProfile } from '@/hooks/useProfile';
import { useQuizCatalog } from '@/hooks/useQuizCatalog';
import { useSession } from '@/hooks/useSession';
import { ApiError } from '@/lib/api';
import { CONTACT_EMAIL } from '@/lib/site';
import { cn } from '@/lib/utils';
import { sendFeedback, type FeedbackType } from '@/services/feedbackService';
import { t } from '@/i18n';

const TYPES: FeedbackType[] = ['feedback', 'question', 'idea', 'problem'];
const isType = (v: string | null): v is FeedbackType => TYPES.includes(v as FeedbackType);

/**
 * Contact and feedback. Players (and every child) pick ready-made messages only: the project
 * collects no free text from children, and the server refuses it too. A grown-up can write a
 * message and leave an email for the reply. Everything lands in the Studio inbox.
 */
export function ContactPage(): JSX.Element {
  const copy = t.info.contact;
  const f = t.feedback;
  useDocumentMeta({ title: copy.metaTitle, description: copy.metaDescription });
  const [params] = useSearchParams();
  const { ensureSession } = useSession();
  const { profile, isChild, setAgeBand } = useProfile();
  const { quizzes } = useQuizCatalog();
  const typeParam = params.get('type');

  const [who, setWho] = useState<'player' | 'adult'>('player');
  const [type, setType] = useState<FeedbackType>(isType(typeParam) ? typeParam : 'feedback');
  const [presets, setPresets] = useState<string[]>([]);
  const [quiz, setQuiz] = useState(params.get('quiz') ?? '');
  const [adultOk, setAdultOk] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<'player' | 'adult' | null>(null);
  const ids = { email: useId(), message: useId(), quiz: useId(), adult: useId() };
  const adultKnown = profile?.age_band === '18_plus' || profile?.age_band === '13_17';

  function toggle(m: string): void {
    setPresets((list) => (list.includes(m) ? list.filter((x) => x !== m) : [...list, m]));
    setError(null);
  }

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    if (who === 'player' && presets.length === 0) return setError(f.errors.pick);
    if (who === 'adult') {
      if (isChild) return setError(f.errors.notAllowed);
      if (!adultKnown && !adultOk) return setError(f.errors.adult);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError(f.errors.email);
      if (message.trim().length < 10) return setError(f.errors.message);
    }
    setSending(true);
    try {
      await ensureSession();
      if (who === 'adult' && !adultKnown) await setAgeBand('18_plus');
      await sendFeedback(
        who === 'player'
          ? { type, presets, ...(quiz ? { quiz_slug: quiz } : {}) }
          : {
              type,
              presets: [],
              message: message.trim(),
              email: email.trim(),
              ...(quiz ? { quiz_slug: quiz } : {}),
            },
      );
      setSent(who);
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === 'free_text_not_allowed'
          ? f.errors.notAllowed
          : f.errors.failed,
      );
    } finally {
      setSending(false);
    }
  }

  function reset(): void {
    setSent(null);
    setPresets([]);
    setMessage('');
  }

  const field =
    'h-12 w-full rounded-xl border-2 border-surface-border bg-surface px-3 text-base focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/20';

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-5 lg:px-6 lg:pt-8">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8">
        <section className="grid gap-4">
          <p className="text-xs font-bold uppercase tracking-widest text-content-muted">
            {f.kicker}
          </p>
          <h1 className="text-[2.2rem] leading-tight lg:text-[2.6rem]">{f.title}</h1>
          <p className="text-lg text-content-muted">{f.lead}</p>
          <ul className="grid gap-2">
            {f.tiles.map((tile) => (
              <li
                key={tile.title}
                className="rounded-2xl border border-surface-border bg-surface p-4 shadow-soft"
              >
                <p className="font-bold">{tile.title}</p>
                <p className="text-sm text-content-muted">{tile.body}</p>
              </li>
            ))}
          </ul>
          {CONTACT_EMAIL && (
            <p className="text-sm text-content-muted">
              {copy.emailUs}{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className={`${proseLinkClass} break-all`}>
                {CONTACT_EMAIL}
              </a>
            </p>
          )}
          <p className="text-sm text-content-muted">
            {copy.deleteStart}{' '}
            <Link to="/me" className={proseLinkClass}>
              {t.common.myGames}
            </Link>{' '}
            {copy.deleteMiddle}{' '}
            <Link to="/privacy" className={proseLinkClass}>
              {t.common.privacyNotice}
            </Link>{' '}
            {copy.deleteEnd}
          </p>
        </section>

        <section className="rounded-2xl border border-surface-border bg-surface p-5 shadow-soft lg:p-7">
          {sent ? (
            <div role="status" className="grid justify-items-center gap-3 py-6 text-center">
              <Character name="heart" size={96} />
              <h2 className="text-2xl">{f.thanksTitle}</h2>
              <p className="max-w-[42ch] text-content-muted">
                {sent === 'adult' ? f.thanksAdult : f.thanksPlayer}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={reset} className={buttonClasses('primary')}>
                  {f.another}
                </button>
                <Link to="/" className={buttonClasses('ghost')}>
                  {f.back}
                </Link>
              </div>
            </div>
          ) : (
            <form noValidate onSubmit={(e) => void submit(e)} className="grid gap-5">
              <div className="grid gap-2">
                <span className="text-sm font-bold text-content-muted">{f.who}</span>
                <SegmentedControl
                  label={f.who}
                  options={[
                    { value: 'player', label: f.whoPlayer },
                    { value: 'adult', label: f.whoAdult },
                  ]}
                  value={who}
                  onChange={(v) => {
                    setWho(v);
                    setError(null);
                  }}
                  className="w-full max-w-sm"
                />
              </div>
              <div className="grid gap-2">
                <span className="text-sm font-bold text-content-muted">{f.about}</span>
                <div role="group" aria-label={f.about} className="flex flex-wrap gap-2">
                  {TYPES.map((k) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={type === k}
                      onClick={() => {
                        setType(k);
                        setPresets([]);
                      }}
                      className={chipClass(type === k)}
                    >
                      {f.types[k]}
                    </button>
                  ))}
                </div>
              </div>

              {who === 'player' ? (
                <div className="grid gap-2">
                  <span className="text-sm font-bold text-content-muted">{f.presetsLabel}</span>
                  <div role="group" aria-label={f.presetsLabel} className="flex flex-wrap gap-2">
                    {f.presets[type].map((m) => (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={presets.includes(m)}
                        onClick={() => toggle(m)}
                        className={chipClass(presets.includes(m))}
                      >
                        {presets.includes(m) && <span aria-hidden="true">✓&nbsp;</span>}
                        {m}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-content-muted">{f.presetsHint}</span>
                </div>
              ) : (
                <>
                  {!adultKnown && (
                    <label htmlFor={ids.adult} className="flex items-start gap-3 text-sm">
                      <input
                        id={ids.adult}
                        type="checkbox"
                        checked={adultOk}
                        onChange={(e) => setAdultOk(e.target.checked)}
                        className="mt-0.5 h-5 w-5 accent-[rgb(var(--primary))]"
                      />
                      {f.adultConfirm}
                    </label>
                  )}
                  <div className="grid gap-1.5">
                    <label htmlFor={ids.email} className="text-sm font-bold text-content-muted">
                      {f.email}
                    </label>
                    <input
                      id={ids.email}
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={f.emailPlaceholder}
                      className={field}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label
                      htmlFor={ids.message}
                      className="flex justify-between text-sm font-bold text-content-muted"
                    >
                      {f.message}
                      <span className="font-medium">{f.count(message.length)}</span>
                    </label>
                    <textarea
                      id={ids.message}
                      rows={5}
                      maxLength={1000}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={f.messagePlaceholder}
                      className={cn(field, 'h-auto py-2.5')}
                    />
                  </div>
                </>
              )}

              <div className="grid gap-1.5">
                <label htmlFor={ids.quiz} className="text-sm font-bold text-content-muted">
                  {f.quiz}
                </label>
                <select
                  id={ids.quiz}
                  value={quiz}
                  onChange={(e) => setQuiz(e.target.value)}
                  className={field}
                >
                  <option value="">{f.quizNone}</option>
                  {quizzes.map((q) => (
                    <option key={q.id} value={q.slug}>
                      {q.title}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <p role="alert" className="font-semibold text-wrong">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={sending}
                className={buttonClasses('primary', 'lg', 'w-full')}
              >
                {sending ? f.sending : f.send}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
