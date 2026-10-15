"use client";

import { useEffect, useRef, useState } from "react";
import { VersionRetentionControls } from "./VersionRetentionControls";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsService } from "@/lib/services/documents.service";
import { DocumentVersionSource, ApprovalAction } from "@/lib/types";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  History,
  RotateCcw,
  Calendar,
  User,
  HardDrive,
  MessageSquare,
  Upload,
  FileUp,
  GitBranch,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { LucideIcon } from "lucide-react";
import { getVersionTraceability } from "@/lib/document-traceability";

interface DocumentVersionHistoryProps {
  documentId: number;
  currentVersion: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SOURCE_CONFIG: Record<
  DocumentVersionSource,
  { label: string; icon: LucideIcon; variant: 'default' | 'secondary' | 'outline' }
> = {
  [DocumentVersionSource.UPLOAD_INICIAL]:      { label: 'Subida inicial',   icon: Upload,    variant: 'secondary' },
  [DocumentVersionSource.REEMPLAZO_MANUAL]:    { label: 'Reemplazo',         icon: FileUp,    variant: 'outline'   },
  [DocumentVersionSource.RESTAURACION]:        { label: 'Restauración',      icon: RotateCcw, variant: 'outline'   },
  [DocumentVersionSource.CAMBIOS_SOLICITADOS]: { label: 'Cambios del flujo', icon: GitBranch, variant: 'default'   },
};

export function DocumentVersionHistory({
  documentId,
  currentVersion,
  open,
  onOpenChange,
}: DocumentVersionHistoryProps) {
  const queryClient = useQueryClient();
  const [confirmingVersion, setConfirmingVersion] = useState<number | null>(null);
  const confirmationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setConfirmingVersion(null);
    return () => { if (confirmationTimer.current) clearTimeout(confirmationTimer.current); };
  }, [open, documentId]);

  const { data: versions, isLoading } = useQuery({
    queryKey: ["document-versions", documentId],
    queryFn: () => documentsService.getVersions(documentId),
    enabled: open,
  });

  const restoreMutation = useMutation({
    mutationFn: (version: number) =>
      documentsService.restoreVersion(documentId, version),
    onSuccess: () => {
      toast.success("Versión restaurada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      queryClient.invalidateQueries({ queryKey: ["document-versions", documentId] });
      setConfirmingVersion(null);
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message || "Error al restaurar la versión";
      toast.error(message);
    },
  });

  const handleRestore = (version: number) => {
    if (confirmingVersion === version) {
      restoreMutation.mutate(version);
    } else {
      setConfirmingVersion(version);
      if (confirmationTimer.current) clearTimeout(confirmationTimer.current);
      confirmationTimer.current = setTimeout(() => setConfirmingVersion(null), 3000);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const getApprovalLabel = (action: ApprovalAction | null): string => {
    if (action === ApprovalAction.APPROVED) return 'Aprobado';
    if (action === ApprovalAction.REJECTED) return 'Rechazado';
    return 'Revisado';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Versiones
          </DialogTitle>
          <DialogDescription>
            Visualiza y restaura versiones anteriores del documento. La conservación permanente protege solo
            de la limpieza automática de versiones, no de la papelera ni de la eliminación definitiva del documento.
            La versión actual y las versiones vinculadas a flujos o aprobaciones están protegidas.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : versions && versions.length > 0 ? (
          <div className="space-y-3">
            {versions.map((version) => {
              const sourceCfg = version.source ? SOURCE_CONFIG[version.source] : null;
              const SourceIcon = sourceCfg?.icon;

              return (
                <div
                  key={version.id}
                  className={`border rounded-lg p-4 ${
                    version.version === currentVersion
                      ? "bg-blue-50 border-blue-300"
                      : "bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">
                          Versión {version.version}
                        </h3>
                        {version.version === currentVersion && (
                          <Badge variant="default">Actual</Badge>
                        )}
                        {sourceCfg && SourceIcon && (
                          <Badge variant={sourceCfg.variant} className="gap-1 text-xs">
                            <SourceIcon className="h-3 w-3" />
                            {sourceCfg.label}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                           <span>{getVersionTraceability(version).time === 'Fecha no disponible' ? 'Fecha no disponible' : format(new Date(version.createdAt), "PPp", { locale: es })}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                           <span>{getVersionTraceability(version).actor}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <HardDrive className="h-4 w-4" />
                          <span>{formatFileSize(version.size)}</span>
                        </div>

                        {version.checksumSHA256 && (
                          <div className="flex items-center gap-1 col-span-2">
                            <span className="text-xs font-mono truncate">
                              SHA256: {version.checksumSHA256.substring(0, 16)}...
                            </span>
                          </div>
                        )}
                      </div>

                      {open && <VersionRetentionControls key={`${documentId}:${version.version}`} documentId={documentId} version={version} isCurrent={version.version === currentVersion} />}

                      {version.comment && (
                        <div className="flex items-start gap-1 text-sm mt-2">
                          <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <p className="text-gray-700 italic">{version.comment}</p>
                        </div>
                      )}

                      {version.approvals && version.approvals.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {version.approvals.map((a) => (
                            <Badge key={a.id} variant="outline" className="text-xs gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              {getApprovalLabel(a.action)} por {a.user.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {version.version !== currentVersion && (
                      <Button
                        variant={
                          confirmingVersion === version.version
                            ? "destructive"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => handleRestore(version.version)}
                        disabled={restoreMutation.isPending}
                        className="ml-4"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        {confirmingVersion === version.version
                          ? "Confirmar"
                          : "Restaurar"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No hay versiones disponibles
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
