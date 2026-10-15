'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/AuthContext';
import { documentSharingService } from '@/lib/services/document-sharing.service';
import type { ResourceSharing, SharingGrant, SharingPermissions, SharingRecipient } from '@/lib/services/document-sharing.service';
import { directorySharingService } from '@/lib/services/directory-sharing.service';
import { invalidateDirectoryQueries } from '@/lib/directory-cache';
import { SharingIndicator } from './SharingIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type SharingDialogProps = ({ documentId: number; directoryId?: never } | { directoryId: number; documentId?: never }) & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
};

const EMPTY_FLAGS = { canEdit: false, canUploadVersion: false, canShare: false };
type GrantFlags = typeof EMPTY_FLAGS;

function supportsGrant(data: ResourceSharing | undefined, flags: GrantFlags): boolean {
  const capabilities = data?.capabilities;
  if (!data?.canManageSharing || !capabilities?.canShare || !capabilities.canView ||
    Object.keys(flags).some(key => flags[key as keyof GrantFlags] && !capabilities[key as keyof GrantFlags])) return false;
  if (capabilities.owner) return true;
  // Una unión de permisos no autoriza a amplificar una fuente concreta.
  return data.provenance?.some(source => !source.public && source.canShare === true &&
    Object.keys(flags).every(key => !flags[key as keyof GrantFlags] || source[key as keyof GrantFlags] === true)) === true;
}

function grantLabel(grant: SharingGrant) {
  return ['Lectura', grant.canEdit && 'Metadatos', grant.canUploadVersion && 'Carga y versiones', grant.canShare && 'Compartir'].filter(Boolean).join(' · ');
}

export function SharingDialog(props: SharingDialogProps) {
  const { user } = useAuth();
  const id = props.directoryId ?? props.documentId;
  return <Dialog open={props.open} onOpenChange={props.onOpenChange}>
    {props.open && user?.id && <SharingContent key={`${user.id}:${props.directoryId === undefined ? 'document' : 'directory'}:${id}`} {...props} actorId={user.id} />}
  </Dialog>;
}

function SharingContent(props: SharingDialogProps & { actorId: string }) {
  const { actorId, onUpdated } = props;
  const id = props.directoryId ?? props.documentId;
  const isDirectory = props.directoryId !== undefined;
  const service = isDirectory ? directorySharingService : documentSharingService;
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [comment, setComment] = useState('');
  const [flags, setFlags] = useState<GrantFlags>(EMPTY_FLAGS);
  const [editing, setEditing] = useState<SharingGrant | null>(null);
  const [selected, setSelected] = useState<SharingRecipient | null>(null);
  const queryKey = [isDirectory ? 'directory-sharing' : 'document-sharing', id, actorId];
  const sharing = useQuery<ResourceSharing & { documentId?: number; directoryId?: number }>({ queryKey, queryFn: () => service.get(id), retry: false, staleTime: 0 });
  const ready = sharing.isSuccess && !sharing.isFetching && !sharing.error &&
    (isDirectory ? sharing.data.directoryId : sharing.data.documentId) === id;
  const data = ready ? sharing.data : undefined;
  const canManage = data?.canManageSharing === true && data.capabilities?.canShare === true;
  const query = search.trim();
  const results = useQuery({
    queryKey: ['sharing-recipients', isDirectory ? 'directory' : 'document', id, actorId, query],
    queryFn: () => service.search(id, query),
    enabled: canManage && query.length >= 2 && query.length <= 100,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: async (action: { kind: 'grant'; userId: string } | { kind: 'revoke'; grantId: string | number } | { kind: 'visibility'; isPublic: boolean }) => {
      const state = client.getQueryState(queryKey);
      if (!canManage || state?.fetchStatus !== 'idle' || state.isInvalidated) throw new Error('Los permisos han cambiado.');
      if (action.kind === 'visibility') {
        if (!data?.canSetVisibility || !data.capabilities?.owner) throw new Error('Solo el propietario puede cambiar la visibilidad.');
        return service.setVisibility(id, action.isPublic);
      }
      if (action.kind === 'revoke') {
        if (!data?.grants?.some(grant => grant.id === action.grantId && grant.canRevoke && !grant.inherited && !grant.legacy))
          throw new Error('Este acceso no se puede revocar aquí.');
        return service.revoke(id, action.grantId);
      }
      if (!supportsGrant(data, flags)) throw new Error('No puedes ampliar los permisos de tu fuente de acceso.');
      const permissions: SharingPermissions = { ...flags,
        ...(!isDirectory && editing && typeof editing.id === 'number' ? { grantId: editing.id } : {}),
        ...(!isDirectory && comment.trim() ? { comment: comment.trim() } : {}),
        ...(editing?.expiresAt ? { expiresAt: editing.expiresAt } : {}),
      };
      return service.grant(id, action.userId, permissions);
    },
    onSuccess: async (_result, action) => {
      toast.success(action.kind === 'revoke' ? 'Acceso revocado correctamente' :
        action.kind === 'visibility' ? 'Visibilidad actualizada correctamente' :
          editing ? 'Permisos actualizados correctamente' : 'Acceso compartido correctamente');
      setComment('');
      setEditing(null);
      setSelected(null);
      setFlags(EMPTY_FLAGS);
      invalidateDirectoryQueries(client);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['document-sharing'] }),
        client.invalidateQueries({ queryKey: ['directory-sharing'] }),
        client.invalidateQueries({ queryKey: ['documents'] }),
        client.invalidateQueries({ queryKey: ['document'] }),
      ]);
      onUpdated?.();
    },
    onError: () => { void client.invalidateQueries({ queryKey }); },
  });
  const disabled = mutation.isPending || !canManage;

  return <DialogContent className="max-h-[85vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>{isDirectory ? 'Compartir carpeta' : 'Compartir documento'}</DialogTitle>
      <DialogDescription>La lectura está incluida. Metadatos, carga y versiones, y compartir son permisos independientes. Solo el propietario puede eliminar.{isDirectory ? ' El acceso se hereda en todas las subcarpetas y los documentos actuales y futuros.' : ''}</DialogDescription>
    </DialogHeader>
    {sharing.isPending && <p role="status">Consultando acceso...</p>}
    {sharing.isError && <p role="alert">No se pudo consultar el acceso. Puede que tus permisos hayan cambiado.</p>}
    {data && <div className="space-y-4">
      {!canManage && <p>Acceso de consulta: no puedes administrar estas concesiones.</p>}
      {canManage && <div className="space-y-3">
      <div className="space-y-2">
        <label htmlFor={`sharing-search-${id}`}>Buscar personas</label>
        <Input id={`sharing-search-${id}`} value={search} maxLength={100} disabled={disabled} onChange={event => { setSearch(event.target.value); setEditing(null); }} placeholder="Nombre o correo (mínimo 2 caracteres)" />
        {results.isFetching && <p role="status">Buscando...</p>}
        {results.isError && <p role="alert">No se pudo buscar personas.</p>}
        {query.length >= 2 && results.isSuccess && !results.isFetching && <ul className="space-y-2">{results.data.map(person => <li key={person.id} className="flex items-center justify-between gap-2">
          <div><p>{person.name || person.email}</p><p className="text-sm text-muted-foreground">{person.email}</p></div>
          <Button variant="outline" disabled={disabled} aria-pressed={selected?.id === person.id} aria-label={`Seleccionar a ${person.name || person.email}`} onClick={() => { setSelected(selected?.id === person.id ? null : person); setEditing(null); }}>Seleccionar</Button>
        </li>)}{results.data.length === 0 && <li>No se encontraron personas.</li>}</ul>}
      </div>
      <fieldset className="space-y-2">
        <legend className="font-medium">{editing ? `Permisos de la concesión ${editing.id}` : 'Permisos del nuevo acceso'}</legend>
        <p className="text-xs text-muted-foreground">Lectura incluida. Actualizar modifica la concesión seleccionada; los accesos independientes se conservan. Las restricciones del flujo de trabajo siguen vigentes.</p>
        {(['canEdit', 'canUploadVersion', 'canShare'] as const).map(key => <label key={key} className="flex items-center gap-2">
          <input type="checkbox" checked={flags[key]} disabled={disabled || (!flags[key] && !supportsGrant(data, { ...flags, [key]: true }))} onChange={event => setFlags({ ...flags, [key]: event.target.checked })} />
          {key === 'canEdit' ? 'Editar metadatos' : key === 'canUploadVersion' ? (isDirectory ? 'Subir documentos, nuevas versiones y crear subcarpetas' : 'Subir nuevas versiones') : 'Volver a compartir'}
        </label>)}
        {!supportsGrant(data, flags) && <p role="alert">Los permisos seleccionados deben proceder de una sola fuente vigente que permita compartir.</p>}
      </fieldset>
      {!isDirectory && <div className="space-y-2">
        <label htmlFor={`sharing-comment-${id}`}>Comentario opcional</label>
        <textarea id={`sharing-comment-${id}`} className="w-full rounded border p-2" value={comment} maxLength={2000} disabled={disabled} onChange={event => setComment(event.target.value)} />
      </div>}
      {editing ? <div className="flex gap-2">
        <Button disabled={disabled || !supportsGrant(data, flags)} onClick={() => mutation.mutate({ kind: 'grant', userId: editing.user.id })}>Guardar permisos de {editing.user.name || editing.user.email}</Button>
        <Button variant="outline" onClick={() => { setEditing(null); setFlags(EMPTY_FLAGS); }}>Cancelar edición</Button>
      </div> : <Button disabled={disabled || !selected || !supportsGrant(data, flags)} onClick={() => selected && mutation.mutate({ kind: 'grant', userId: selected.id })}>{selected ? `Dar acceso a ${selected.name || selected.email}` : 'Dar acceso'}</Button>}
      </div>}
      <SharingIndicator provenance={data.provenance} />
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={data.isPublic} disabled={disabled || !data.canSetVisibility || !data.capabilities?.owner} onChange={event => mutation.mutate({ kind: 'visibility', isPublic: event.target.checked })} />
        Visible para todos los usuarios autenticados
      </label>
      <p className="text-sm text-muted-foreground">Revocar el acceso directo no elimina el acceso público o heredado de una carpeta. Una carpeta privada puede conservar acceso público heredado. Los accesos heredados se administran en la carpeta de origen.</p>
      <h3 className="font-medium">Concesiones directas</h3>
      {!data.grants?.length && <p>No hay concesiones directas.</p>}
      <ul className="space-y-2">{data.grants?.map(grant => <li key={grant.id} className="rounded border p-2 space-y-1">
        <p>{grant.user.name || grant.user.email}</p>
        <p className="text-sm text-muted-foreground"><span>{grant.user.email}</span> · Concesión #{grant.id} · Compartido por {grant.grantedBy?.name || grant.grantedBy?.email || 'persona no disponible'}</p>
        <p className="text-xs">{grantLabel(grant)}{grant.effective === false ? ' · No vigente' : ''}</p>
        {grant.authoritySource?.directory && <p className="text-xs">Fuente de autoridad: {grant.authoritySource.directory.name}</p>}
        <div className="flex gap-2">
          {(grant.grantedBy?.id === actorId || (!isDirectory && data.capabilities?.owner)) && grant.effective !== false && !grant.inherited && !grant.legacy && <Button variant="outline" disabled={disabled} aria-label={`Editar concesión ${grant.id}`} onClick={() => {
            setEditing(grant); setSelected(null); setFlags({ canEdit: grant.canEdit === true, canUploadVersion: grant.canUploadVersion === true, canShare: grant.canShare === true });
          }}>Editar permisos</Button>}
          <Button variant="outline" disabled={disabled || !grant.canRevoke || grant.inherited || grant.legacy} aria-label={`Revocar concesión ${grant.id} de ${grant.user.name || grant.user.email}`} onClick={() => mutation.mutate({ kind: 'revoke', grantId: grant.id })}>Revocar</Button>
        </div>
      </li>)}</ul>
      {!!data.inheritedGrants?.length && <><h3 className="font-medium">Concesiones heredadas</h3><ul>{data.inheritedGrants.map(grant => <li key={`${grant.sourceDirectory?.id}:${grant.id}`} className="rounded border p-2 text-sm">
        {grant.user.name || grant.user.email} · Heredado de {grant.sourceDirectory?.name || 'una carpeta'} · Compartido por {grant.grantedBy?.name || grant.grantedBy?.email || 'persona no disponible'}
        <p>{grantLabel(grant)}{grant.effective === false ? ' · No vigente' : ''} · No se puede revocar aquí</p>
      </li>)}</ul></>}
      {!!data.legacyGrants?.length && <><h3 className="font-medium">Accesos anteriores (solo lectura)</h3><ul>{data.legacyGrants.map((grant, index) => <li key={`${grant.id}:${index}`}>{grant.user.name || grant.user.email} · Lectura · Compartido por {grant.grantedBy?.name || grant.grantedBy?.email || 'persona no disponible'}</li>)}</ul></>}
      {!data.grants && !!data.recipients?.length && <p>Accesos anteriores (solo lectura): {data.recipients.map(person => person.name || person.email).join(', ')}</p>}
    </div>}
    {mutation.isError && <p role="alert">No se pudo guardar el cambio. Consulta los permisos e inténtalo de nuevo.</p>}
  </DialogContent>;
}
