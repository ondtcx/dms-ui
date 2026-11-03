"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Send } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { documentsService } from "@/lib/services/documents.service";
import { readDocumentActionCapabilities } from "@/lib/document-action-capabilities";
import type { Document } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TransferDocumentDialog } from "@/components/transfers/TransferDocumentDialog";

export default function NewTransferPage() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<Document | null>(null);
  const isAdmin =
    user?.role === "admin" || user?.roles?.includes("admin") === true;

  const documents = useQuery({
    queryKey: ["transfer-documents", user?.id, isAdmin],
    queryFn: () =>
      documentsService.getAll({ onlyMine: !isAdmin, limit: 100 }),
    enabled: !!user?.id,
  });

  const candidates = (documents.data?.data ?? []).filter((document) => {
    const scope = readDocumentActionCapabilities(document, user?.id)?.scope;
    return (
      scope === "ordinary" &&
      (document.uploadedById === user?.id || isAdmin)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nueva transferencia</h1>
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
            El sistema validará que el documento sea ordinario y no tenga workflow activo ni solicitudes de cambios pendientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {documents.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Cargando documentos...</p>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No hay documentos disponibles para transferir.
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
