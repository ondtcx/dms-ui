"use client";

import { FormEvent, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { directoryQueryKeys, documentsService } from "@/lib/services/documents.service";
import { invalidateDirectoryQueries } from "@/lib/directory-cache";

function apiMessage(error: unknown): string {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    ?? "No se pudo crear la carpeta.";
}

export default function NewDirectoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const parents = useInfiniteQuery({
    queryKey: [...directoryQueryKeys.accessible, "parents"],
    queryFn: ({ pageParam }) => documentsService.getAccessibleDirectories({ page: pageParam, limit: 50 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
  });
  const create = useMutation({
    mutationFn: () => documentsService.createDirectory({ name: name.trim(), parentId }),
    onSuccess: () => {
      invalidateDirectoryQueries(queryClient);
      router.push("/dashboard/directories");
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setValidationError("Ingresa un nombre para la carpeta.");
      return;
    }
    setValidationError(null);
    create.mutate();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div><h1 className="text-2xl font-semibold">Crear nueva carpeta</h1><p className="text-muted-foreground">Organiza documentos en la raíz o dentro de una carpeta accesible.</p></div>
      <Card>
        <CardHeader><CardTitle>Datos de la carpeta</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="directory-name" className="text-sm font-medium">Nombre</label>
              <Input id="directory-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre de la carpeta" aria-invalid={Boolean(validationError)} />
              {validationError ? <p className="text-sm text-destructive">{validationError}</p> : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="directory-parent">Carpeta padre (opcional)</label>
              <Select value={parentId === null ? "root" : String(parentId)} onValueChange={(value) => setParentId(value === "root" ? null : Number(value))}>
                <SelectTrigger id="directory-parent"><SelectValue placeholder="Raíz" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Raíz</SelectItem>
                  {parents.data?.pages.flatMap((page) => page.data).map((directory) => <SelectItem key={directory.id} value={String(directory.id)}>{directory.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {parents.isLoading ? <p className="text-sm text-muted-foreground">Cargando carpetas disponibles...</p> : null}
              {parents.isError ? <p className="text-sm text-destructive">No se pudieron cargar las carpetas padre.</p> : null}
              {parents.hasNextPage ? <Button type="button" variant="link" className="px-0" onClick={() => parents.fetchNextPage()} disabled={parents.isFetchingNextPage}>{parents.isFetchingNextPage ? "Cargando..." : "Cargar más carpetas"}</Button> : null}
            </div>
            {create.isError ? <Alert variant="destructive"><AlertDescription>{apiMessage(create.error)}</AlertDescription></Alert> : null}
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button><Button type="submit" disabled={create.isPending}>{create.isPending ? "Creando..." : "Crear carpeta"}</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
