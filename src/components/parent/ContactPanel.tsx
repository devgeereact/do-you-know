import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { sendGrownUpMessage, type GetToken } from '@/services/parentService';
import { t } from '@/i18n';

const copy = t.grownUps.contact;
const field =
  'w-full rounded-xl border-2 border-surface-border bg-surface px-3 py-2 text-base focus:border-primary focus:outline-hidden focus:ring-[3px] focus:ring-primary/20';
const TYPES = ['feedback', 'question', 'idea', 'problem'] as const;

/** Typed text lives here and nowhere on the child's side: this form needs a grown-up sign-in. */
export function ContactPanel({ getToken }: { getToken: GetToken }): JSX.Element {
  const [type, setType] = useState<(typeof TYPES)[number]>('feedback');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'short' | 'failed'>('idle');

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (message.trim().length < 10) return setState('short');
    setState('sending');
    try {
      await sendGrownUpMessage(getToken, {
        type,
        message: message.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
      });
      setMessage('');
      setState('sent');
    } catch {
      setState('failed');
    }
  }

  return (
    <Card as="section" aria-label={t.grownUps.tabs.contact}>
      <form noValidate onSubmit={(e) => void submit(e)} className="grid gap-4">
        <p className="text-content-muted">{copy.lead}</p>
        <div className="grid gap-1.5">
          <label htmlFor="gu-type" className="text-sm font-bold text-content-muted">
            {copy.type}
          </label>
          <select
            id="gu-type"
            className={`${field} h-12`}
            value={type}
            onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}
          >
            {TYPES.map((k) => (
              <option key={k} value={k}>
                {copy.types[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="gu-email" className="text-sm font-bold text-content-muted">
            {copy.email}
          </label>
          <input
            id="gu-email"
            type="email"
            autoComplete="email"
            className={`${field} h-12`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="gu-message" className="text-sm font-bold text-content-muted">
            {copy.message}
          </label>
          <textarea
            id="gu-message"
            rows={5}
            maxLength={1000}
            className={field}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setState('idle');
            }}
          />
        </div>
        {state === 'short' && (
          <p role="alert" className="font-semibold text-wrong">
            {copy.short}
          </p>
        )}
        {state === 'failed' && (
          <p role="alert" className="font-semibold text-wrong">
            {copy.failed}
          </p>
        )}
        {state === 'sent' && (
          <p role="status" className="font-semibold">
            {copy.sent}
          </p>
        )}
        <div>
          <Button type="submit" disabled={state === 'sending'}>
            {state === 'sending' ? copy.sending : copy.send}
          </Button>
        </div>
      </form>
    </Card>
  );
}
