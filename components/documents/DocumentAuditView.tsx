import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DocumentAccess } from '@/lib/types';

export type AuditState = 'records' | 'unavailable' | 'blocked' | 'denied';
export type AuditRecord = Pick<DocumentAccess, 'id' | 'action' | 'createdAt'> & { actor?: string; user?: { name: string } };

export function resolveAuditState({ authorized, accesses, contractBlocked = false }: { authorized: boolean; accesses?: AuditRecord[]; contractBlocked?: boolean }): AuditState {
  if (!authorized) return 'denied';
  if (contractBlocked) return 'blocked';
  return accesses ? 'records' : 'unavailable';
}

export function AuditView({ state, accesses }: { state: AuditState; accesses: AuditRecord[] }) {
  const messages: Record<Exclude<AuditState, 'records'>, string> = {
    denied: 'No tiene autorización para consultar la auditoría de este documento.',
    unavailable: 'Los registros de auditoría no están disponibles.',
    blocked: 'Los registros de auditoría no pueden recuperarse actualmente.',
  };

  return <Card><CardHeader><CardTitle>Auditoría de accesos</CardTitle></CardHeader><CardContent>
    {state === 'records' ? <div className="space-y-2" aria-label="Registros de auditoría">{accesses.map((record) => <div key={record.id} className="rounded-md border p-3 text-sm"><strong>{record.action}</strong> · {record.actor || record.user?.name || 'Actor no disponible'} · {record.createdAt || 'Fecha no disponible'}</div>)}</div> : <p role="status" aria-live="polite">{messages[state]}</p>}
  </CardContent></Card>;
}
