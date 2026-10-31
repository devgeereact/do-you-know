import { Scene, WorldGlyph } from '@/components/art/Art';
import { isWorld, type WorldKey } from '@/lib/art';
import { cn } from '@/lib/utils';
import { world } from '@/lib/worlds';
import type { QuestionContent } from '@/services/adminService';

const LETTERS = 'ABCDEF';

/**
 * A small copy of the game card in the question's world, with the right answer marked in green.
 * Staff only: players never see the answer before they reply.
 */
export function QuestionPreview({
  question,
  fallbackWorld,
}: {
  question: QuestionContent;
  fallbackWorld: WorldKey;
}): JSX.Element {
  const w = world(isWorld(question.scene) ? question.scene : fallbackWorld);
  const answerBox = (right: boolean): string =>
    cn(
      'flex min-h-[38px] min-w-0 items-center gap-2 rounded-xl border-2 bg-white py-1 pl-1 pr-2 text-[13px] font-bold text-[#17153A] shadow-[0_2px_0_#17153A]',
      right ? 'border-[#1FB57A] bg-[#E2F6EC]' : 'border-[#17153A]',
    );
  const letter = (right: boolean): string =>
    cn(
      'grid h-6 w-6 shrink-0 place-items-center rounded-[7px] text-[13px] font-extrabold',
      right ? 'bg-[#1FB57A] text-white' : 'bg-[#EEEAFE] text-[#6C4CF5]',
    );
  return (
    <div
      className={cn(
        'relative isolate overflow-hidden rounded-[20px] border-2 border-[#17153A]',
        w.dark ? 'text-white' : 'text-[#17153A]',
      )}
      style={{ background: `linear-gradient(${w.skyTop}, ${w.skyBottom})` }}
    >
      <Scene world={w.key} className="-z-10" />
      <div className="relative px-4 pb-[70px] pt-4">
        <span className="inline-flex h-[22px] items-center gap-1 rounded-full border-2 border-[#17153A] bg-white px-2 text-[11px] font-extrabold text-[#17153A]">
          <WorldGlyph world={w.key} size={12} />
          {w.name}
        </span>
        <p className="mb-3 mt-2 font-display text-lg font-extrabold leading-tight [overflow-wrap:anywhere]">
          {question.prompt.trim() || 'Your question'}
        </p>
        {question.type === 'choice' && (
          <div className="grid grid-cols-2 gap-1.5">
            {(question.options ?? []).map((o, k) => (
              <div key={k} className={answerBox(o.correct)}>
                <span className={letter(o.correct)}>{LETTERS[k]}</span>
                <span className="min-w-0 [overflow-wrap:anywhere]">{o.label || '…'}</span>
              </div>
            ))}
          </div>
        )}
        {question.type === 'boolean' && (
          <div className="grid grid-cols-2 gap-1.5">
            {[true, false].map((v) => (
              <div key={String(v)} className={answerBox(question.answer === v)}>
                <span className={letter(question.answer === v)}>{v ? '✓' : '✕'}</span>
                {v ? 'True' : 'False'}
              </div>
            ))}
          </div>
        )}
        {question.type === 'slider' && question.slider && (
          <div className="rounded-xl border-2 border-[#17153A] bg-white p-2.5 text-[#17153A]">
            <p className="text-sm">
              <b className="font-display text-2xl">{String(question.slider.correct)}</b>{' '}
              {question.slider.unit}{' '}
              <span className="text-xs text-[#5A5680]">
                accepts {String(question.slider.accept_min)} to {String(question.slider.accept_max)}
              </span>
            </p>
            <div className="mt-1 h-2 rounded-full bg-[#EEEAFE]" />
            <div className="mt-1 flex justify-between text-xs font-bold text-[#5A5680]">
              <span>{String(question.slider.min)}</span>
              <span>{String(question.slider.max)}</span>
            </div>
          </div>
        )}
        <p className="relative mt-2 inline-block rounded-lg bg-white/90 px-2 py-1 text-xs font-bold text-[#17153A]">
          Green shows the right answer. Players only see it after answering.
        </p>
      </div>
    </div>
  );
}
