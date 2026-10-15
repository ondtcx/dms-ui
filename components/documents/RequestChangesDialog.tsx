'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/AuthContext';
import { documentChangeRequestService as service } from '@/lib/services/document-change-request.service';
import type { SharingRecipient } from '@/lib/services/document-sharing.service';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props { documentId: number; open: boolean; onOpenChange: (open: boolean) => void }
export function RequestChangesDialog(props: Props) {
  const { user } = useAuth();
  return <Dialog open={props.open} onOpenChange={props.onOpenChange}>
    {props.open && user?.id && <RequestContent key={`${user.id}:${props.documentId}`} {...props} actorId={user.id} />}
  </Dialog>;
}

function RequestContent({ documentId, actorId, onOpenChange }: Props & { actorId: string }) {
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [recipient, setRecipient] = useState<SharingRecipient | null>(null);
  const [message, setMessage] = useState('');
  const [confirmShare, setConfirmShare] = useState(false);
  const key = ['change-request', documentId, actorId];
  const snapshot = useQuery({ queryKey: key, queryFn: () => service.get(documentId), retry: false, staleTime: 0 });
  const allowed = snapshot.isSuccess && !snapshot.isFetching && snapshot.data.capabilities.create === true;
  const query = search.trim();
  const results = useQuery({ queryKey: ['change-request-recipients', documentId, actorId, query],
    queryFn: () => service.recipients(documentId, query), enabled: allowed && query.length >= 2 && query.length <= 100, retry: false });
  const access = useQuery({ queryKey: ['change-request-access', documentId, actorId, recipient?.id],
    queryFn: () => service.access(documentId, recipient!.id), enabled: allowed && !!recipient, retry: false, staleTime: 0 });
  const ready = allowed && recipient && access.isSuccess && !access.isFetching &&
    (access.data.hasAccess || confirmShare) && message.trim().length > 0 && message.length <= 2000;
  const mutation = useMutation({
    mutationFn: async () => {
      if (!ready) throw new Error('Actualiza los permisos y confirma el destinatario.');
      return service.create(documentId, { recipientId: recipient.id, message: message.trim(), confirmShare: !access.data!.hasAccess && confirmShare });
    },
    onSuccess: async () => {
      await Promise.all([client.invalidateQueries({ queryKey: key }), client.invalidateQueries({ queryKey: ['documents'] }),
        client.invalidateQueries({ queryKey: ['document', documentId] }), client.invalidateQueries({ queryKey: ['document-sharing', documentId] })]);
      onOpenChange(false);
    },
    onError: () => { void client.invalidateQueries({ queryKey: key }); void access.refetch(); },
  });

  return <DialogContent>
    <DialogHeader><DialogTitle>Solicitar cambios</DialogTitle><DialogDescription>La corrección permanece privada hasta que el propietario o ADMIN la acepte.</DialogDescription></DialogHeader>
    {snapshot.isPending && <p role="status">Consultando permisos...</p>}
    {snapshot.isError && <p role="alert">No se pudieron consultar los permisos.</p>}
    {snapshot.isSuccess && !snapshot.data.capabilities.create && <p>No puedes crear otra solicitud en este momento.</p>}
    {allowed && <div className="space-y-3">
      <label htmlFor={`request-search-${documentId}`}>Buscar destinatario</label>
      <Input id={`request-search-${documentId}`} value={search} maxLength={100} disabled={mutation.isPending} onChange={event => setSearch(event.target.value)} />
      {results.isFetching && <p role="status">Buscando...</p>}
      {results.isError && <p role="alert">No se pudo buscar destinatarios.</p>}
      {results.isSuccess && !results.isFetching && <ul>{results.data.map(person => <li key={person.id}>
        <Button variant="outline" disabled={mutation.isPending} aria-label={`Seleccionar ${person.name || person.email}`} onClick={() => { setRecipient(person); setConfirmShare(false); }}>{person.name || person.email}</Button>
      </li>)}</ul>}
      {recipient && <p>Destinatario: {recipient.name || recipient.email}</p>}
      {recipient && access.isFetching && <p role="status">Comprobando acceso...</p>}
      {access.isError && <p role="alert">No se pudo comprobar el acceso.</p>}
      {recipient && access.isSuccess && !access.isFetching && (access.data.hasAccess ? <p>El destinatario ya tiene acceso.</p> :
        <label className="flex gap-2"><input type="checkbox" checked={confirmShare} disabled={mutation.isPending} onChange={event => setConfirmShare(event.target.checked)} />Confirmo compartir acceso de lectura</label>)}
      <label htmlFor={`request-message-${documentId}`}>Cambios solicitados</label>
      <textarea id={`request-message-${documentId}`} className="w-full rounded border p-2" value={message} maxLength={2000} disabled={mutation.isPending} onChange={event => setMessage(event.target.value)} />
      <Button disabled={!ready || mutation.isPending} onClick={() => mutation.mutate()}>Enviar solicitud</Button>
    </div>}
    {mutation.isError && <p role="alert">No se pudo crear la solicitud. Actualiza el acceso y vuelve a intentarlo.</p>}
  </DialogContent>;
}
