"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Folder, FolderRoot, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { directoryQueryKeys, documentsService } from "@/lib/services/documents.service";

export default function DirectoriesPage() {
  const [page, setPage] = useState(1);
  const directories = useQuery({
    queryKey: [...directoryQueryKeys.accessible, page],
    queryFn: () => documentsService.getAccessibleDirectories({ page, limit: 50 }),
  });
  const meta = directories.data?.meta;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Todos los directorios</h1>
        <p className="text-muted-foreground">Directorios que puedes descubrir y abrir.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Directorios accesibles</CardTitle></CardHeader>
        <CardContent>
          {directories.isLoading ? <p role="status">Cargando directorios...</p> : null}
          {directories.isError ? (
            <Alert variant="destructive">
              <AlertTitle>No se pudieron cargar los directorios</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>Verifica tu conexión e inténtalo nuevamente.</p>
                <Button variant="outline" size="sm" onClick={() => directories.refetch()}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Reintentar
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
          {!directories.isLoading && !directories.isError && directories.data?.data.length === 0 ? (
            <p className="text-muted-foreground">No hay directorios accesibles.</p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/dashboard/documents"
              className="flex items-center gap-3 rounded-lg border border-dashed border-primary/50 bg-primary/5 p-4 hover:bg-accent"
            >
              <FolderRoot className="h-5 w-5 text-primary" />
              <span>
                <span className="block font-medium">Raíz virtual</span>
                <span className="block text-sm text-muted-foreground">Todos los documentos, incluidos los que no tienen directorio.</span>
              </span>
            </Link>
            {directories.data?.data.map((directory) => (
              <Link
                key={directory.id}
                href={`/dashboard/documents?directoryId=${directory.id}`}
                className="flex items-center gap-3 rounded-lg border p-4 hover:bg-accent"
              >
                <Folder className="h-5 w-5 text-primary" />
                <span className="font-medium">{directory.name}</span>
              </Link>
            ))}
          </div>
          {meta && meta.totalPages > 1 ? (
            <nav aria-label="Paginación de directorios" className="mt-6 flex items-center justify-between">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
              </Button>
              <span className="text-sm text-muted-foreground">Página {meta.page} de {meta.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((value) => value + 1)}>
                Siguiente <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </nav>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
