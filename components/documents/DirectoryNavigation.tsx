"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Folder, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { documentsService } from "@/lib/services/documents.service";
import type { Directory } from "@/lib/types";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { invalidateDirectoryQueries } from "@/lib/directory-cache";
import { isValidReceptionReadback } from "@/hooks/use-directory-submission";
import { DirectorySharingAction } from "./DirectorySharingAction";
import { SharingIndicator } from "./SharingIndicator";

interface DirectoryNavigationProps {
  value: number | null;
  onChange: (directoryId: number | null) => void;
  picker?: boolean;
}

export function useDirectoryAccess(value: number | null, enabled = true) {
  const { user } = useAuth();
  const client = useQueryClient();
  const context = useQuery({
    queryKey: ["directory-current", user?.id, value],
    queryFn: () => documentsService.getDirectoryContext(value as number),
    enabled: enabled && !!user?.id && value !== null && Number.isSafeInteger(value) && value > 0,
    retry: false,
  });
  const ready = enabled && !!user?.id && (value === null ||
    (context.isSuccess && !context.isFetching && !context.error && context.data.directory.id === value));
  const directory = ready && value !== null ? context.data?.directory : undefined;
  const canWrite = ready && (value === null || (directory?.navigationOnly !== true &&
    (directory?.receptionEnabled ? isValidReceptionReadback(context.data?.reception, value as number) && context.data?.reception?.capabilities.submit === true :
      directory?.capabilities?.canUploadVersion === true)));
  const canWriteNow = () => {
    const state = client.getQueryState(["directory-current", user?.id, value]);
    return canWrite && (value === null || (state?.status === "success" && state.fetchStatus === "idle" && !state.isInvalidated));
  };
  return { context, directory, ready, canWrite, canWriteNow, canCreate: canWrite && directory?.receptionEnabled !== true };
}

export function DirectoryNavigation({ value, onChange, picker = false }: DirectoryNavigationProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Directory | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const actorId = user?.id ?? null;
  const access = useDirectoryAccess(value);
  const directories = useQuery({
    queryKey: ["directories", actorId, value],
    queryFn: () => documentsService.listDirectories(value),
    enabled: actorId !== null,
    retry: false,
  });
  const breadcrumb = useQuery({
    queryKey: ["directory-breadcrumb", actorId, value],
    queryFn: () => documentsService.getDirectoryBreadcrumb(value as number),
    enabled: actorId !== null && value !== null,
    retry: false,
  });
  // Los nombres y acciones solo se muestran con una lectura asentada y vigente
  // del actor actual: nunca con caché ajena, recarga pendiente o error.
  const directoriesReady =
    directories.isSuccess && !directories.isFetching && directories.error == null;
  const breadcrumbReady =
    breadcrumb.isSuccess && !breadcrumb.isFetching && breadcrumb.error == null;
  const save = useMutation({
    mutationFn: () => {
      if (!directoriesReady || !name.trim() || (editing ?
        !directories.data?.some(entry => entry.id === editing.id && !entry.navigationOnly && entry.capabilities?.canEdit) :
        !(access.canCreate && access.canWriteNow()))) throw new Error("Los permisos han cambiado.");
      return editing
        ? documentsService.updateDirectory(editing.id, { name: name.trim() })
        : documentsService.createDirectory({ name: name.trim(), parentId: value });
    },
    onSuccess: () => {
      invalidateDirectoryQueries(queryClient);
      setFormOpen(false);
      setEditing(null);
      setName("");
      setError(null);
    },
    onError: (cause: any) => setError(cause?.response?.data?.message ?? "No se pudo guardar la carpeta"),
  });
  const remove = useMutation({
    mutationFn: (id: number) => {
      if (!directoriesReady || !directories.data?.some(entry => entry.id === id && entry.capabilities?.owner))
        throw new Error("Solo el propietario puede eliminar la carpeta.");
      return documentsService.deleteDirectory(id);
    },
    onSuccess: () => invalidateDirectoryQueries(queryClient),
    onError: (cause: any) => setError(cause?.response?.data?.message ?? "No se pudo eliminar la carpeta"),
  });

  const openCreate = () => { setEditing(null); setName(""); setFormOpen(true); };
  const openEdit = (directory: Directory) => { setEditing(directory); setName(directory.name); setFormOpen(true); };

  return (
    <section aria-label="Carpetas" className="space-y-3">
      <nav aria-label="Ruta de carpetas" className="flex flex-wrap items-center gap-1 text-sm">
        <Button variant={value === null ? "secondary" : "ghost"} size="sm" onClick={() => onChange(null)}>
          <Folder className="mr-2 h-4 w-4" /> Raíz
        </Button>
        {breadcrumbReady
          ? breadcrumb.data?.map((directory) => (
              <span key={directory.id} className="flex items-center">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Button
                  variant={directory.id === value ? "secondary" : "ghost"}
                  size="sm"
                  aria-label={
                    directory.receptionEnabled === true
                      ? `Recepción: ${directory.name}`
                      : undefined
                  }
                  onClick={() => onChange(directory.id)}
                >
                  {directory.name}
                </Button>
              </span>
            ))
          : null}
        {value !== null && breadcrumbReady && <Button variant="outline" size="sm" onClick={() =>
          onChange(breadcrumb.data?.find(entry => entry.id === value)?.parentId ?? null)
        }>Subir un nivel</Button>}
        {directoriesReady && access.canCreate && <Button size="sm" variant="outline" onClick={openCreate} aria-label="Crear carpeta">
          <FolderPlus className="mr-2 h-4 w-4" /> Nueva carpeta
        </Button>}
      </nav>

      {!picker && access.directory && <div className="flex flex-wrap items-center gap-2">
        <SharingIndicator summary={access.directory.sharingSummary} provenance={access.directory.sharingProvenance} reception={access.directory.receptionEnabled} />
        <DirectorySharingAction key={access.directory.id} directory={access.directory} />
      </div>}

      {access.directory?.navigationOnly && <p className="text-sm text-muted-foreground">Solo navegación: abre una subcarpeta compartida. No tienes acceso al contenido de esta carpeta.</p>}
      {value !== null && access.context.isError && <p role="alert">No se pudieron consultar los permisos de esta carpeta.</p>}
      {picker && value !== null && access.ready && !access.canWrite && <p role="status">Esta carpeta no permite recibir documentos. Puedes navegar a una subcarpeta con permiso de carga.</p>}

      {directories.isLoading ? <p className="text-sm text-muted-foreground">Cargando carpetas...</p> : null}
      {directories.isError ? <Alert variant="destructive"><AlertDescription>No se pudieron cargar las carpetas.</AlertDescription></Alert> : null}
      {directoriesReady && directories.data?.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay subcarpetas accesibles.</p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {directoriesReady
          ? directories.data?.map((directory) => (
          <div key={directory.id} className="space-y-2 rounded-md border p-3">
            <Button
              variant="ghost"
              className="h-auto w-full min-w-0 justify-start px-1.5 py-1 text-left"
              aria-label={
                directory.receptionEnabled === true
                  ? `Recepción: ${directory.name}`
                  : undefined
              }
              onClick={() => onChange(directory.id)}
            >
              <Folder className="mr-2 h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 whitespace-normal break-words">{directory.name}</span>
            </Button>
            <div className="flex flex-wrap items-center justify-end gap-1 empty:hidden">
              <SharingIndicator summary={directory.sharingSummary} provenance={directory.sharingProvenance} reception={directory.receptionEnabled} />
              {picker && !directory.receptionEnabled && (directory.navigationOnly || !directory.capabilities?.canUploadVersion) &&
                <span className="text-xs text-muted-foreground">Solo navegación</span>}
              {!picker && <>
                <DirectorySharingAction key={directory.id} directory={directory} />
                {!directory.navigationOnly && directory.capabilities?.canEdit && <Button variant="ghost" size="icon" aria-label={`Renombrar ${directory.name}`} onClick={() => openEdit(directory)}><Pencil className="h-4 w-4" /></Button>}
                {directory.capabilities?.owner && <Button variant="ghost" size="icon" aria-label={`Eliminar ${directory.name}`} onClick={() => remove.mutate(directory.id)} disabled={remove.isPending}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
              </>}
            </div>
          </div>
        ))
          : null}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Renombrar carpeta" : "Nueva carpeta"}</DialogTitle></DialogHeader>
          <label htmlFor="folder-name">Nombre de la carpeta</label>
          <Input id="folder-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre de la carpeta" />
          {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !name.trim() || !directoriesReady || (!editing && !access.canCreate)}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
