import { Button } from '@/components/ui/Button';
import { diffFix, type ReviewItem } from '@/lib/aiReview';
import type { QuestionContent } from '@/services/adminService';
import { linkButtonClass } from '@/pages/admin/studio';
import { Pill } from '@/pages/admin/ui';

export type FixState = 'pending' | 'accepted' | 'rejected';

/**
 * One question's AI review (ADR-021): "fine", a flag with its reason, or a fix shown as before
 * and after with Accept and Reject. Accepting only changes what the Studio will save next.
 */
export function AiVerdict({
  question,
  item,
  state,
  onAccept,
  onReject,
  onUndo,
}: {
  question: QuestionContent;
  item: ReviewItem;
  state: FixState;
  onAccept: () => void;
  onReject: () => void;
  onUndo: () => void;
}): JSX.Element {
  if (item.verdict === 'ok') return <Pill tone="ok">AI: looks fine</Pill>;
  if (item.verdict === 'flag' || !item.fix) {
    return (
      <span className="text-[12.5px] font-extrabold text-[#9A6400]">
        AI flag: {item.reason || 'worth a second look'}
      </span>
    );
  }
  if (state !== 'pending') {
    return (
      <span className="text-[12.5px] font-bold">
        {state === 'accepted' ? '✓ AI fix accepted' : 'AI fix rejected'}{' '}
        <button type="button" className={linkButtonClass} onClick={onUndo}>
          Undo
        </button>
      </span>
    );
  }
  return (
    <div className="grid w-full max-w-[420px] gap-1.5 rounded-[12px] border border-primary/30 bg-primary/6 p-2.5 text-left text-[12.5px]">
      <b>AI suggests a fix{item.reason ? `: ${item.reason}` : ''}</b>
      {diffFix(question, item.fix).map((c) => (
        <div key={c.field} className="grid gap-0.5">
          <span className="font-bold text-content-muted">{c.field}</span>
          <del className="text-wrong wrap-anywhere">{c.before || '(empty)'}</del>
          <ins className="font-semibold text-correct no-underline wrap-anywhere">{c.after}</ins>
        </div>
      ))}
      <span className="flex gap-1.5">
        <Button size="sm" className="h-8" onClick={onAccept}>
          Accept
        </Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={onReject}>
          Reject
        </Button>
      </span>
    </div>
  );
}
