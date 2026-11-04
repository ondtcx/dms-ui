'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Bell,
  Check,
  CheckCheck,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  notificationsService,
  type AppNotification,
  type NotificationFilter,
  type NotificationPage,
} from '@/lib/services/notifications.service';
import { formatRole } from '@/lib/utils';

const TYPE_LABELS: Record<string, string> = {
  DOCUMENT_SHARED: 'Documento compartido',
  DOCUMENT_UPLOADED: 'Documento subido',
  APPROVAL_REQUESTED: 'Revisión solicitada',
  APPROVAL_APPROVED: 'Documento aprobado',
  APPROVAL_REJECTED: 'Documento rechazado',
  CHANGES_REQUESTED: 'Cambios solicitados',
  WORKFLOW_COMPLETED: 'Flujo completado',
  PERMISSION_GRANTED: 'Permiso otorgado',
  COMMENT_ADDED: 'Comentario',
  MENTION: 'Mención',
  DOCUMENT_UPDATED: 'Documento actualizado',
  DOCUMENT_DELETED: 'Documento eliminado',
  DOCUMENT_TRANSFERRED: 'Transferencia',
  TEMPLATE_VERSION_READY: 'Plantilla lista',
  DOCUMENT_EMITTED: 'Documento emitido',
};

const FILTERS: Array<{ value: NotificationFilter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'unread', label: 'No leídas' },
  { value: 'read', label: 'Leídas' },
];

function safeActionUrl(item: AppNotification): string | null {
  const value = item.actionUrl;
  if (!value) return null;
  return /^\/dashboard\/(documents\/\d+|documents\?directoryId=\d+|directories\?directoryId=\d+|elaboracion\/\d+|elaboracion\/plantillas\/\d+|transfers\/(received|sent))$/.test(
    value,
  )
    ? value
    : null;
}

function formatDate(value?: string) {
  if (!value) return 'Fecha no disponible';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
}

function actorLabel(item: AppNotification) {
  if (!item.actorName && !item.actorId) return 'Sistema';
  const name = item.actorName || 'Usuario';
  return item.actorRole ? `${name} · ${formatRole(item.actorRole)}` : name;
}

export function NotificationBell() {
  const { user } = useAuth();
  if (!user?.id) return null;
  return <ActorNotifications key={user.id} />;
}

function ActorNotifications() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [data, setData] = useState<NotificationPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [reading, setReading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    setData(null);
    notificationsService
      .list(page, filter)
      .then((result) => {
        if (alive) setData(result);
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [page, filter, revision]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const unread = data?.unreadCount ?? 0;

  const refresh = () => setRevision((value) => value + 1);

  const run = async (operation: () => Promise<unknown>) => {
    setReading(true);
    try {
      await operation();
      refresh();
    } catch {
      setError(true);
    } finally {
      setReading(false);
    }
  };

  const markAllRead = () => run(() => notificationsService.readAll());
  const archiveRead = () => run(() => notificationsService.archiveRead());

  const toggleRead = (item: AppNotification) =>
    run(() =>
      item.status === 'UNREAD'
        ? notificationsService.read(item.id)
        : notificationsService.unread(item.id),
    );

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="rounded-md p-2 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institution-primary-foreground"
        aria-label={`Notificaciones, ${unread} sin leer`}
        aria-controls="notifications-panel"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell aria-hidden="true" className="size-5" />
        {unread > 0 && (
          <span
            className="ml-1 rounded-full bg-institution-primary-foreground px-1.5 text-[10px] font-semibold text-institution-primary"
            aria-hidden="true"
          >
            {unread}
          </span>
        )}
      </button>
      {open && (
        <section
          id="notifications-panel"
          role="region"
          aria-label="Notificaciones"
          className="absolute right-0 z-50 max-h-[75vh] w-[min(28rem,calc(100vw-2rem))] overflow-auto rounded-lg border border-border bg-background p-3 text-foreground shadow-lg"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">Notificaciones</h2>
              <p className="text-xs text-muted-foreground">
                {unread === 0
                  ? 'Todo al día'
                  : `${unread} ${unread === 1 ? 'sin leer' : 'sin leer'}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {unread > 0 && (
                <button
                  type="button"
                  className="text-xs underline"
                  disabled={reading}
                  onClick={markAllRead}
                >
                  Marcar todas como leídas
                </button>
              )}
              <button
                type="button"
                className="text-xs underline"
                disabled={reading}
                onClick={archiveRead}
              >
                Borrar leídas
              </button>
            </div>
          </div>

          <div
            className="mt-3 flex gap-1 rounded-lg bg-muted p-1"
            role="group"
            aria-label="Filtrar notificaciones"
          >
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={filter === option.value}
                className={`flex-1 rounded-md px-2 py-1 text-xs font-medium ${
                  filter === option.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => {
                  setFilter(option.value);
                  setPage(1);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          {loading && (
            <p role="status" className="py-4 text-sm text-muted-foreground">
              Cargando...
            </p>
          )}
          {error && (
            <div className="py-3">
              <p role="alert" className="text-sm text-destructive">
                No se pudieron cargar las notificaciones.
              </p>
              <button
                type="button"
                className="mt-1 text-xs underline"
                onClick={refresh}
              >
                Reintentar
              </button>
            </div>
          )}
          {!loading && !error && data?.data.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">
              No hay notificaciones para este filtro.
            </p>
          )}

          <ul className="mt-2 divide-y divide-border">
            {data?.data.map((item) => {
              const url = safeActionUrl(item);
              return (
                <li
                  key={item.id}
                  className={`space-y-1 py-3 ${
                    item.status === 'UNREAD' ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      {TYPE_LABELS[item.type] ?? 'Notificación'}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        item.status === 'UNREAD'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {item.status === 'UNREAD' ? 'No leída' : 'Leída'}
                    </span>
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                  <p className="font-medium">{item.title}</p>
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {item.message}
                  </p>
                  {item.document ? (
                    <p className="text-xs text-muted-foreground">
                      Documento: {item.document.name || `#${item.document.id}`}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Por: {actorLabel(item)}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {url && (
                      <Link
                        href={url}
                        aria-label={`Abrir ${item.title}`}
                        className="text-xs underline"
                        onClick={() => setOpen(false)}
                      >
                        Abrir recurso
                      </Link>
                    )}
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs underline"
                      aria-label={`${
                        item.status === 'UNREAD'
                          ? 'Marcar como leída'
                          : 'Marcar como no leída'
                      }: ${item.title}`}
                      disabled={reading}
                      onClick={() => toggleRead(item)}
                    >
                      {item.status === 'UNREAD' ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <RotateCcw className="h-3 w-3" />
                      )}
                      {item.status === 'UNREAD'
                        ? 'Marcar como leída'
                        : 'Marcar como no leída'}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-destructive underline"
                      aria-label={`Borrar notificación: ${item.title}`}
                      disabled={reading}
                      onClick={() =>
                        run(() => notificationsService.archive(item.id))
                      }
                    >
                      <Trash2 className="h-3 w-3" /> Borrar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2 text-xs">
            <button
              type="button"
              disabled={loading || page === 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Anterior
            </button>
            <span className="text-muted-foreground">Página {page}</span>
            <button
              type="button"
              disabled={loading || (data?.data.length ?? 0) < 20}
              onClick={() => setPage((value) => value + 1)}
            >
              Siguiente
            </button>
            <button type="button" disabled={loading} onClick={refresh}>
              <CheckCheck className="h-3 w-3" aria-hidden="true" /> Actualizar
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
