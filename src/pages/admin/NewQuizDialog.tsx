import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { AdminApiError, KEY_STAGES, type KeyStage } from '@/services/adminService';
import { inputClass, selectClass, useAction, useStudio } from '@/pages/admin/studio';
import { Field, Modal } from '@/pages/admin/ui';

/** "New quiz": title, subject and key stage; opens the editor on the new draft. */
export function NewQuizDialog({ onClose }: { onClose: () => void }): JSX.Element {
  const { client, subjects } = useStudio();
  const navigate = useNavigate();
  const { busy, run } = useAction();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(subjects[0]?.slug ?? '');
  const [ks, setKs] = useState<KeyStage | ''>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = async (): Promise<void> => {
    if (!title.trim()) {
      setErrors({ title: 'Give the quiz a title' });
      return;
    }
    const result = await run(async () => {
      try {
        return await client.createQuiz({
          title: title.trim(),
          category,
          ks: ks || null,
        });
      } catch (err) {
        if (err instanceof AdminApiError && err.problems.length) {
          setErrors(Object.fromEntries(err.problems.map((p) => [p.field, p.message])));
        }
        throw err;
      }
    }, 'Draft created');
    if (result) {
      onClose();
      navigate(`/admin/edit/${result.id}`);
    }
  };

  return (
    <Modal
      title="New quiz"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={busy || !category} onClick={() => void create()}>
            Create draft
          </Button>
        </>
      }
    >
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <Field label="Title" htmlFor="nq-title" errors={errors.title ? [errors.title] : undefined}>
          <input
            id="nq-title"
            className={inputClass}
            value={title}
            maxLength={255}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Times tables 2"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Subject"
            htmlFor="nq-subject"
            errors={errors.category ? [errors.category] : undefined}
          >
            <select
              id="nq-subject"
              className={selectClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {subjects.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                  {s.kind === 'school' ? ' (school)' : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Key stage" htmlFor="nq-ks">
            <select
              id="nq-ks"
              className={selectClass}
              value={ks}
              onChange={(e) => setKs(e.target.value as KeyStage | '')}
            >
              <option value="">All ages</option>
              {KEY_STAGES.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="text-sm text-content-muted">
          It starts as a draft. Nothing goes live until every question is checked and you publish
          it.
        </p>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
