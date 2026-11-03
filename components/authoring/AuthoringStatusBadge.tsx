import { Badge } from '@/components/ui/badge';
import type { AuthoringStatus } from '@/lib/types/authoring';

const LABELS: Record<AuthoringStatus, string> = {
  DRAFT: 'Borrador',
  IN_REVIEW: 'En revisión',
  CHANGES_REQUESTED: 'Devuelto',
  APPROVED: 'Aprobado',
  EMITTED: 'Emitido',
  ARCHIVED: 'Archivado',
};

const CLASSES: Record<AuthoringStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  IN_REVIEW: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  CHANGES_REQUESTED: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  EMITTED: 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200',
  ARCHIVED: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
};

export function AuthoringStatusBadge({ status }: { status: AuthoringStatus }) {
  return (
    <Badge variant="outline" className={CLASSES[status]}>
      {LABELS[status]}
    </Badge>
  );
}
