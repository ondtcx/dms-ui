'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/AuthContext';
import { documentChangeRequestService as service, type ChangeRequestStatus } from '@/lib/services/document-change-request.service';
import { Button } from '@/components/ui/button';

const labels: Record<ChangeRequestStatus, string> = {
  PENDING: 'Cambios pendientes', IN_PROGRESS: 'Se requieren más cambios',
  CORRECTION_SUBMITTED: 'Corrección enviada; pendiente de revisión', ACCEPTED: 'Corrección aceptada', CANCELLED: 'Solicitud cancelada',
};

export function ChangeRequestPanel({ documentId }: { documentId: number }) {
  const { user } = useAuth();
  if (!user?.id) return null;
  return <RequestPanelContent key={`${user.id}:${documentId}`} documentId={documentId} actorId={user.id} />;
}

function RequestPanelContent({ documentId, actorId }: { documentId: number; actorId: string }) {
  const client = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const key = ['change-request', documentId, actorId];
  const snapshot = useQuery({ queryKey: key, queryFn: () => service.get(documentId), retry: false, staleTime: 0 });
  const ready = snapshot.isSuccess && !snapshot.isFetching;
  const request = ready ? snapshot.data.request : null;
  const capabilities = ready ? snapshot.data.capabilities : undefined;
  const mutation = useMutation({
    mutationFn: async (action: 'submit' | 'accept' | 'cancel' | 'further' | 'download') => {
      if (!ready || !request) throw new Error('Actualiza la solicitud.');
      if (action === 'submit') {
        if (!capabilities?.submit || !file) throw new Error('No puedes enviar esta corrección.');
        return service.submit(documentId, request.id, request.revision, file);
      }
      if (action === 'download') {
        const blob = await service.download(documentId, request.id);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = request.filename || 'correction';
        anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); return;
      }
      if (!capabilities?.manage) throw new Error('No puedes revisar esta corrección.');
      return service.decide(documentId, request.id, { action, revision: request.revision, ...(action === 'further' ? { message: message.trim() } : {}) });
    },
    onSuccess: async () => {
      setFile(null); setMessage('');
      await Promise.all([client.invalidateQueries({ queryKey: key }), client.invalidateQueries({ queryKey: ['documents'] }),
        client.invalidateQueries({ queryKey: ['document', documentId] }), client.invalidateQueries({ queryKey: ['document-versions', documentId] })]);
    },
    onError: () => { void client.invalidateQueries({ queryKey: key }); },
  });
  const active = request && !['ACCEPTED', 'CANCELLED'].includes(request.status);
  const disabled = !ready || mutation.isPending;
  // La creación de una solicitud vive en el menú de acciones del documento:
  // este panel solo informa y gestiona una solicitud existente.
  if (ready && !request) return null;

  return <section aria-label="Solicitudes de cambios" className="space-y-3 rounded border p-4">
    <h2 className="font-semibold">Solicitudes de cambios</h2>
    {snapshot.isPending && <p role="status">Cargando solicitud...</p>}
    {snapshot.isError && <p role="alert">No se pudo consultar la solicitud.</p>}
    {request && <><p>{labels[request.status]}</p><p className="whitespace-pre-wrap break-words">{request.message}</p></>}
    {capabilities?.submit && <div>
      <label htmlFor={`correction-file-${documentId}`}>Archivo corregido</label>
      <input id={`correction-file-${documentId}`} type="file" disabled={disabled} onChange={event => setFile(event.target.files?.[0] ?? null)} />
      <p>Este envío no modifica la versión principal ni concede permisos de edición.</p>
      <Button disabled={disabled || !file} onClick={() => mutation.mutate('submit')}>Enviar corrección</Button>
    </div>}
    {request?.hasCorrection && <Button disabled={disabled} variant="outline" onClick={() => mutation.mutate('download')}>Descargar corrección</Button>}
    {capabilities?.manage && active && <div className="space-y-2">
      {request.status === 'CORRECTION_SUBMITTED' && <>
        <Button disabled={disabled} onClick={() => mutation.mutate('accept')}>Aceptar corrección</Button>
        <label htmlFor={`further-changes-${documentId}`}>Cambios adicionales</label>
        <textarea id={`further-changes-${documentId}`} className="block w-full rounded border p-2" maxLength={2000} disabled={disabled} value={message} onChange={event => setMessage(event.target.value)} />
        <Button disabled={disabled || !message.trim()} onClick={() => mutation.mutate('further')}>Pedir más cambios</Button>
      </>}
      <Button variant="outline" disabled={disabled} onClick={() => mutation.mutate('cancel')}>Cancelar solicitud</Button>
    </div>}
    {mutation.isError && <p role="alert">No se pudo completar la operación. La solicitud o tus permisos pueden haber cambiado.</p>}
  </section>;
}
