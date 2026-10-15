'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { notificationsService, type NotificationPage } from '@/lib/services/notifications.service';

export function NotificationBell() {
  const { user } = useAuth();
  if (!user?.id) return null;
  return <ActorNotifications key={user.id} />;
}

function ActorNotifications() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<NotificationPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [reading, setReading] = useState(false);
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(false); setData(null);
    notificationsService.list(page).then(result => { if (alive) setData(result); })
      .catch(() => { if (alive) setError(true); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [page, revision]);
  const unread = data?.unreadCount ?? 0;

  return <div className="relative">
    <button type="button" className="rounded p-2" aria-label={`Notificaciones, ${unread} sin leer`} aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <Bell aria-hidden="true" className="size-5" />{unread > 0 && <span className="text-xs">{unread}</span>}
    </button>
    {open && <section aria-label="Notificaciones" className="absolute right-0 z-50 max-h-[70vh] w-80 overflow-auto rounded border bg-background p-3 text-foreground shadow">
      <h2 className="font-semibold">Notificaciones</h2>
      {loading && <p role="status">Cargando...</p>}
      {error && <p role="alert">No se pudieron cargar las notificaciones.</p>}
      {data?.data.length === 0 && <p>No hay notificaciones.</p>}
      <ul>{data?.data.map(item => {
        const safeUrl = item.actionUrl && /^\/dashboard\/(documents\/\d+|directories\?directoryId=\d+)$/.test(item.actionUrl) ? item.actionUrl : null;
        return <li key={item.id} className="space-y-1 border-b py-3">
          <p className="font-medium">{item.title}</p><p className="whitespace-pre-wrap break-words text-sm">{item.message}</p>
          {safeUrl && <Link href={safeUrl} onClick={() => setOpen(false)}>Abrir recurso</Link>}
          {item.status === 'UNREAD' && <button type="button" className="block text-sm underline" disabled={reading} onClick={async () => {
            setReading(true);
            try { await notificationsService.read(item.id); setRevision(value => value + 1); }
            catch { setError(true); }
            finally { setReading(false); }
          }}>Marcar como leída</button>}
        </li>;
      })}</ul>
      <div className="flex justify-between">
        <button disabled={loading || page === 1} onClick={() => setPage(value => value - 1)}>Anterior</button>
        <button disabled={loading || (data?.data.length ?? 0) < 20} onClick={() => setPage(value => value + 1)}>Siguiente</button>
        <button disabled={loading} onClick={() => setRevision(value => value + 1)}>Actualizar</button>
      </div>
    </section>}
  </div>;
}
