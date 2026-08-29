"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Folder, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { documentsService } from "@/lib/services/documents.service";
import type { Directory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { invalidateDirectoryQueries } from "@/lib/directory-cache";

interface DirectoryNavigationProps {
  value: number | null;
  onChange: (directoryId: number | null) => void;
  picker?: boolean;
}

export function DirectoryNavigation({ value, onChange, picker = false }: DirectoryNavigationProps) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Directory | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const directories = useQuery({
    queryKey: ["directories", value],
    queryFn: () => documentsService.listDirectories(value),
  });
  const breadcrumb = useQuery({
    queryKey: ["directory-breadcrumb", value],
    queryFn: () => documentsService.getDirectoryBreadcrumb(value as number),
    enabled: value !== null,
  });
  const save = useMutation({
    mutationFn: () => editing
      ? documentsService.updateDirectory(editing.id, { name: name.trim() })
      : documentsService.createDirectory({ name: name.trim(), parentId: value }),
    onSuccess: () => {
      invalidateDirectoryQueries(queryClient);
      setFormOpen(false);
      setEditing(null);
      setName("");
      setError(null);
    },
    onError: (cause: any) => setError(cause?.response?.data?.message ?? "No se pudo guardar el directorio"),
  });
  const remove = useMutation({
    mutationFn: (id: number) => documentsService.deleteDirectory(id),
    onSuccess: () => invalidateDirectoryQueries(queryClient),
    onError: (cause: any) => setError(cause?.response?.data?.message ?? "No se pudo eliminar el directorio"),
  });

  const openCreate = () => { setEditing(null); setName(""); setFormOpen(true); };
  const openEdit = (directory: Directory) => { setEditing(directory); setName(directory.name); setFormOpen(true); };

  return (
    <section aria-label="Directorios" className="space-y-3">
      <div className="flex flex-wrap items-center gap-1 text-sm">
        <Button variant={value === null ? "secondary" : "ghost"} size="sm" onClick={() => onChange(null)}>
          <Folder className="mr-2 h-4 w-4" /> Raíz
        </Button>
        {breadcrumb.data?.map((directory) => (
          <span key={directory.id} className="flex items-center">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Button variant={directory.id === value ? "secondary" : "ghost"} size="sm" onClick={() => onChange(directory.id)}>
              {directory.name}
            </Button>
          </span>
        ))}
        <Button size="sm" variant="outline" onClick={openCreate} aria-label="Crear directorio">
          <FolderPlus className="mr-2 h-4 w-4" /> Nuevo directorio
        </Button>
      </div>

      {directories.isLoading ? <p className="text-sm text-muted-foreground">Cargando directorios...</p> : null}
      {directories.isError ? <Alert variant="destructive"><AlertDescription>No se pudieron cargar los directorios.</AlertDescription></Alert> : null}
      {!directories.isLoading && !directories.isError && directories.data?.length === 0 ? (
        <p className="text-sm text-muted-foreground">Este directorio está vacío.</p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {directories.data?.map((directory) => (
          <div key={directory.id} className="flex items-center gap-2 rounded-md border p-2">
            <Button variant="ghost" className="min-w-0 flex-1 justify-start" onClick={() => onChange(directory.id)}>
              <Folder className="mr-2 h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{directory.name}</span>
            </Button>
            {!picker && <>
              <Button variant="ghost" size="icon" aria-label={`Renombrar ${directory.name}`} onClick={() => openEdit(directory)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" aria-label={`Eliminar ${directory.name}`} onClick={() => remove.mutate(directory.id)} disabled={remove.isPending}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </>}
          </div>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Renombrar directorio" : "Nuevo directorio"}</DialogTitle></DialogHeader>
          <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre del directorio" />
          {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !name.trim()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
