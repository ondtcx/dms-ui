"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FileText, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { documentsService } from "@/lib/services/documents.service";
import { FolderBrowser } from "@/components/documents/FolderBrowser";
import { useAuth } from "@/lib/contexts/AuthContext";
import { SharingIndicator } from "@/components/documents/SharingIndicator";

// Enlaces compartidos (por ejemplo, la notificación de una carpeta compartida)
// abren el nivel indicado; un valor inválido cae en la raíz.
function parseDirectoryId(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function DirectoriesPage() {
  return (
    <Suspense fallback={<div className="p-8">Cargando carpetas...</div>}>
      <DirectoriesPageContent />
    </Suspense>
  );
}

function DirectoriesPageContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  // La navegación de carpetas ocurre dentro de esta página: abrir una carpeta
  // cambia el nivel actual en lugar de saltar a la lista de documentos.
  const [directoryId, setDirectoryId] = useState<number | null>(() => parseDirectoryId(searchParams.get("directoryId")));
  const documents = useQuery({
    queryKey: ["documents", "folder", directoryId, user?.id],
    queryFn: () => documentsService.getAll({ directoryId, page: 1, limit: 50 }),
    enabled: !!user?.id,
    retry: false,
  });
  const ready = documents.isSuccess && !documents.isFetching && !documents.error;
  const atRoot = directoryId === null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Carpetas y documentos</h1>
        <p className="text-muted-foreground">Explora la jerarquía, abre una carpeta y revisa su contenido sin salir de esta página.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>{atRoot ? "Raíz" : "Contenido de la carpeta"}</CardTitle></CardHeader>
        <CardContent>
          <FolderBrowser directoryId={directoryId} onNavigate={setDirectoryId}>
          <h2 className="font-medium">{atRoot ? "Documentos sin carpeta" : "Documentos en esta carpeta"}</h2>
          {documents.isLoading ? <p role="status">Cargando documentos...</p> : null}
          {documents.isError ? (
            <Alert variant="destructive">
              <AlertTitle>No se pudieron cargar los documentos</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>Verifica tu conexión e inténtalo nuevamente.</p>
                <Button variant="outline" size="sm" onClick={() => documents.refetch()}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Reintentar
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
          {ready && documents.data.data.length === 0 ? (
            <p className="text-muted-foreground">
              {atRoot ? "No hay documentos sin carpeta." : "No hay documentos en esta carpeta."}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {ready && documents.data.data.map((document) => (
              <Link
                key={document.id}
                href={`/dashboard/documents/${document.id}`}
                className="flex items-center gap-3 rounded-lg border p-4 hover:bg-accent"
              >
                <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
                <span className="font-medium">{document.name || document.versions?.[0]?.filename || "Documento sin nombre"}</span>
                <SharingIndicator summary={document.sharingSummary} provenance={document.sharingProvenance} reception={document.actionCapabilities?.scope === "reception"} />
              </Link>
            ))}
          </div>
          </FolderBrowser>
        </CardContent>
      </Card>
    </div>
  );
}
