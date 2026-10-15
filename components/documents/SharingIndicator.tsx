import { Share2 } from 'lucide-react';
import type { SharingProvenance, SharingSummary } from '@/lib/types';

export function SharingIndicator({ summary, provenance = [], reception = false }: {
  summary?: SharingSummary;
  provenance?: SharingProvenance[];
  reception?: boolean;
}) {
  if (reception || (!summary?.shared && provenance.length === 0)) return null;
  const inherited = summary?.inherited || provenance.some(source => source.inherited);
  const publicAccess = summary?.public || provenance.some(source => source.public);
  const details = provenance.map(source => {
    const sharer = source.grantedBy?.name || source.grantedBy?.email;
    const origin = source.inherited ? `Heredado de ${source.sourceDirectory?.name || 'una carpeta'}` : '';
    const author = source.public ? 'Acceso público para usuarios autenticados (solo lectura)' :
      `Compartido por ${sharer || 'persona no disponible'}`;
    return [author, origin].filter(Boolean).join(' · ');
  });
  if (details.length === 0) details.push(publicAccess ? 'Acceso público para usuarios autenticados (solo lectura)' : 'Compartido con otras personas');
  const description = [...new Set(details)].join('; ');
  return <span role="note" tabIndex={0} title={description} aria-label={description}
    className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs text-muted-foreground">
    <Share2 className="h-3 w-3" aria-hidden="true" />
    {publicAccess ? 'Acceso público' : 'Compartido'}{inherited ? ' · Heredado' : ''}
  </span>;
}
