"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  FileText,
  User,
  Users,
  Building2,
  BookOpen,
  Link2,
  Eye,
  Download,
  Pencil,
  Share2,
  Lock,
  Unlock,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DocumentShare } from "@/lib/types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getShareStatus(share: DocumentShare): { label: string; className: string } {
  if (share.revokedAt) {
    return { label: "Revocado", className: "bg-muted text-muted-foreground border-border" };
  }
  if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
    return { label: "Expirado", className: "bg-warning/10 text-warning border-warning/20" };
  }
  return { label: "Activo", className: "bg-success/10 text-success border-success/20" };
}

function getRecipientInfo(share: DocumentShare): { icon: React.ReactNode; label: string; value: string } {
  if (share.userId && share.user) {
    return {
      icon: <User className="h-4 w-4 text-muted-foreground" />,
      label: "Usuario",
      value: `${share.user.name} (${share.user.email})`,
    };
  }
  if (share.role) {
    return {
      icon: <Users className="h-4 w-4 text-muted-foreground" />,
      label: "Rol",
      value: share.role,
    };
  }
  if (share.departmentId && share.department) {
    return {
      icon: <Building2 className="h-4 w-4 text-muted-foreground" />,
      label: "Departamento",
      value: share.department.name,
    };
  }
  if (share.courseId && share.course) {
    return {
      icon: <BookOpen className="h-4 w-4 text-muted-foreground" />,
      label: "Curso",
      value: `${share.course.name} (${share.course.code})`,
    };
  }
  if (share.isPublicLink) {
    return {
      icon: <Link2 className="h-4 w-4 text-muted-foreground" />,
      label: "Link público",
      value: "Acceso abierto",
    };
  }
  return { icon: null, label: "Desconocido", value: "-" };
}

interface Props {
  share: DocumentShare | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDetailDialog({ share, open, onOpenChange }: Props) {
  if (!share) return null;

  const status = getShareStatus(share);
  const recipient = getRecipientInfo(share);
  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/share/${share.shareToken}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Detalles del share
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Estado */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Estado</span>
            <Badge variant="outline" className={cn("text-xs", status.className)}>
              {status.label}
            </Badge>
          </div>

          <Separator />

          {/* Documento */}
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase text-muted-foreground">Documento</p>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{((share.document?.versions?.[0]?.filename) ?? '')}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(((share.document?.versions?.[0]?.size) ?? 0))}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Destinatario */}
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase text-muted-foreground">Destinatario</p>
            <div className="flex items-center gap-2">
              {recipient.icon}
              <div>
                <p className="text-xs text-muted-foreground">{recipient.label}</p>
                <p className="text-sm">{recipient.value}</p>
              </div>
            </div>
          </div>

          {/* Link público */}
          {share.isPublicLink && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">Link público</p>
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
                  <p className="flex-1 truncate font-mono text-xs">{share.shareToken}</p>
                  <Button size="sm" variant="ghost" onClick={handleCopyLink} className="h-6 px-2 text-xs">
                    Copiar
                  </Button>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {share.requiresPassword ? (
                    <><Lock className="h-3 w-3" /> Protegido con contraseña</>
                  ) : (
                    <><Unlock className="h-3 w-3" /> Sin contraseña</>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Permisos */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">Permisos</p>
            <div className="flex flex-wrap gap-1.5">
              {share.canView && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Eye className="h-3 w-3" /> Ver
                </Badge>
              )}
              {share.canDownload && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Download className="h-3 w-3" /> Descargar
                </Badge>
              )}
              {share.canEdit && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Pencil className="h-3 w-3" /> Editar
                </Badge>
              )}
              {share.canShare && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Share2 className="h-3 w-3" /> Re-compartir
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Estadísticas y fechas */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Vistas</p>
              <p className="font-medium">
                {share.viewCount}{share.maxViews ? ` / ${share.maxViews}` : ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Creado</p>
              <p className="font-medium">
                {format(new Date(share.createdAt), "dd MMM yyyy", { locale: es })}
              </p>
            </div>
            {share.expiresAt && (
              <div>
                <p className="text-xs text-muted-foreground">Expira</p>
                <p className="font-medium">
                  {format(new Date(share.expiresAt), "dd MMM yyyy", { locale: es })}
                </p>
              </div>
            )}
            {share.revokedAt && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Revocado</p>
                <div className="flex items-center gap-1.5 text-sm">
                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                  <span>
                    {format(new Date(share.revokedAt), "dd MMM yyyy", { locale: es })}
                    {share.revokedBy && ` por ${share.revokedBy.name}`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Compartido por */}
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Compartido por</span>
            <span className="font-medium">{share.sharedBy.name}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
