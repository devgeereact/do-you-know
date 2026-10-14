import { copy } from '@/lib/copy';
import { Button } from '@/components/ui/Button';

interface CatalogStatusProps {
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
export function CatalogStatus({ loading, error, refresh }: CatalogStatusProps): JSX.Element | null {
  if (loading)
    return (
      <p role="status" className="py-8 text-lg text-content-muted">
        {copy.catalog.loading}
      </p>
    );
  if (error)
    return (
      <div className="grid justify-items-start gap-4 rounded-2xl border-2 border-surface-border bg-surface p-6">
        <p role="alert" className="text-content">
          {error}
        </p>
        <Button onClick={() => void refresh()}>{copy.catalog.retry}</Button>
      </div>
    );
  return null;
}
