'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { permissionsService } from '@/lib/services/permissions.service';
import { formatRole } from '@/lib/utils';

import { UserRole } from '@/lib/types';

interface Props {
  documentId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExplainPermissionsDialog({ documentId, open, onOpenChange }: Props) {
  return (
    <EffectiveAccessDialog
      key={`${documentId}:${open}`}
      documentId={documentId}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}

function EffectiveAccessDialog({ documentId, open, onOpenChange }: Props) {
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const cursor = cursors[cursors.length - 1];
  const { data, isFetching, isError, error } = useQuery({
    queryKey: ['permissions', 'effective-access', documentId, cursor],
    queryFn: () => permissionsService.getEffectiveAccess(documentId, cursor),
    enabled: open && Number.isSafeInteger(documentId) && documentId > 0,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  const forbidden =
    (error as { response?: { status?: number } } | null)?.response?.status === 403;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" /> Auditar accesos
          </DialogTitle>
          <DialogDescription>
            Usuarios con acceso efectivo de lectura sobre este documento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isFetching ? (
            <p role="status">Cargando usuarios con acceso…</p>
          ) : isError ? (
            <p role="alert">
              {forbidden
                ? 'No tienes autorización para auditar accesos.'
                : 'No se pudieron cargar los usuarios con acceso.'}
            </p>
          ) : data ? (
            <>
              {data.users.length ? (
                <ul aria-label="Usuarios con acceso" className="max-h-80 space-y-3 overflow-y-auto">
                  {data.users.map(user => (
                    <li key={user.id} className="rounded-md border p-3">
                      <p className="font-medium">{user.name || user.email}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-sm">{formatRole(user.role as UserRole)}</p>
                    </li>
                  ))}
                </ul>
              ) : <p role="status">No hay usuarios con acceso en esta página.</p>}
              <nav aria-label="Paginación de usuarios con acceso" className="flex justify-between">
                <Button
                  variant="outline"
                  disabled={cursors.length === 1}
                  onClick={() => setCursors(previous => previous.slice(0, -1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  disabled={!data.nextCursor}
                  onClick={() => setCursors(previous => [...previous, data.nextCursor!])}
                >
                  Siguiente
                </Button>
              </nav>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
