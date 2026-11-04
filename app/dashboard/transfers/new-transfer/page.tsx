"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search, Send } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { documentsService } from "@/lib/services/documents.service";
import type { Document } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { TransferDocumentDialog } from "@/components/transfers/TransferDocumentDialog";
import {
  AcademicYearSelector,
  useAcademicYearStore,
} from "@/components/structure/AcademicYearSelector";

export default function NewTransferPage() {
  const { user } = useAuth();
  const { currentYearId } = useAcademicYearStore();
  const [selected, setSelected] = useState<Document | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const isAdmin =
    user?.role === "admin" || user?.roles?.includes("admin") === true;

  const pageSize = 25;
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);
  useEffect(() => {
    setPage(1);
  }, [search, currentYearId]);

  const documents = useQuery({
    queryKey: [
      "transfer-documents",
      user?.id,
      isAdmin,
      currentYearId,
      search,
      page,
    ],
    queryFn: () =>
      documentsService.getAll({
        onlyMine: !isAdmin,
        academicYearId: currentYearId ?? undefined,
        search: search || undefined,
        transferableOnly: true,
        page,
        limit: pageSize,
      }),
    enabled: !!user?.id,
  });

  const candidates = documents.data?.data ?? [];
  const meta = documents.data?.meta;
  const total = meta?.total ?? 0;
  const currentPage = meta?.page ?? page;
  const totalPages = Math.max(meta?.totalPages ?? 1, 1);
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, total);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva transferencia</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "Selecciona un documento para iniciar la transferencia en nombre de su propietario."
            : "Selecciona uno de tus documentos para solicitar el cambio de propiedad."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documentos transferibles</CardTitle>
          <CardDescription>
            El sistema validará que el documento se pueda transferir: sin flujo activo ni solicitudes de cambios pendientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
            <div className="w-full sm:w-[220px]">
              <AcademicYearSelector label="Filtrar por año lectivo" />
            </div>
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Buscar por nombre, número, tipo, carpeta o propietario..."
                aria-label="Buscar documentos transferibles"
                className="pl-9"
              />
            </div>
          </div>
          {documents.isError ? (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertTitle>No se pudieron cargar los documentos</AlertTitle>
                <AlertDescription className="flex flex-col gap-3">
                  <p>Revisa la conexión e inténtalo de nuevo.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => documents.refetch()}
                  >
                    Reintentar
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          ) : documents.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Cargando documentos...</p>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {search
                  ? "No se encontraron documentos con esa búsqueda."
                  : "No hay documentos disponibles para transferir."}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {candidates.map((document) => (
                <div key={document.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {document.name?.trim() || document.versions?.[0]?.filename || "Documento"}
                      </span>
                      {document.isPublic && <Badge variant="outline">Público</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {document.documentNumber ? (
                        <span className="font-mono">{document.documentNumber} · </span>
                      ) : null}
                      {document.documentType?.name ??
                        document.template?.documentType?.name ??
                        "Sin tipo"}
                      {document.directory?.name
                        ? ` · ${document.directory.name}`
                        : " · Raíz"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Propietario: {document.uploadedBy?.name?.trim() || document.uploadedBy?.email || "—"}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setSelected(document)}>
                    <Send className="mr-2 h-4 w-4" />
                    Transferir
                  </Button>
                </div>
              ))}
            </div>
          )}
          {total > 0 && (
            <div className="flex flex-col gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>
                Mostrando {rangeStart}–{rangeEnd} de {total} documentos
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    disabled={currentPage <= 1 || documents.isFetching}
                  >
                    Anterior
                  </Button>
                  <span>
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((current) =>
                        Math.min(totalPages, current + 1),
                      )
                    }
                    disabled={
                      currentPage >= totalPages || documents.isFetching
                    }
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <TransferDocumentDialog
          document={selected}
          open={true}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
        />
      )}
    </div>
  );
}
