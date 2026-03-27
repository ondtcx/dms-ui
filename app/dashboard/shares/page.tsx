"use client";

import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Share2,
  Inbox,
  Send,
  Link2,
  FileText,
  User,
  Users,
  Building2,
  BookOpen,
  MoreVertical,
  Eye,
  Download,
  Copy,
  XCircle,
  Trash2,
  Search,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { DocumentShare } from "@/lib/types";
import { sharesService } from "@/lib/services/shares.service";
import { CreateShareDialog } from "@/components/shares/CreateShareDialog";
import { ShareDetailDialog } from "@/components/shares/ShareDetailDialog";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getShareStatus(share: DocumentShare): "activo" | "expirado" | "revocado" {
  if (share.revokedAt) return "revocado";
  if (share.expiresAt && new Date(share.expiresAt) < new Date()) return "expirado";
  return "activo";
}

const statusConfig = {
  activo: { label: "Activo", className: "bg-success/10 text-success border-success/20" },
  expirado: { label: "Expirado", className: "bg-warning/10 text-warning border-warning/20" },
  revocado: { label: "Revocado", className: "bg-muted text-muted-foreground border-border" },
};

function RecipientCell({ share }: { share: DocumentShare }) {
  if (share.isPublicLink) {
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span>Link público</span>
        {share.requiresPassword && <Lock className="h-3 w-3 text-muted-foreground" />}
      </div>
    );
  }
  if (share.user) {
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <User className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{share.user.name}</span>
      </div>
    );
  }
  if (share.role) {
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="capitalize">{share.role}</span>
      </div>
    );
  }
  if (share.department) {
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{share.department.name}</span>
      </div>
    );
  }
  if (share.course) {
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{share.course.name}</span>
      </div>
    );
  }
  return <span className="text-sm text-muted-foreground">—</span>;
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="mb-3 h-10 w-10 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

function ReceivedTab() {
  const [search, setSearch] = useState("");
  const [selectedShare, setSelectedShare] = useState<DocumentShare | null>(null);

  const { data: shares = [], isLoading } = useQuery({
    queryKey: ["shares-received"],
    queryFn: sharesService.getReceived,
  });

  const filtered = useMemo(
    () =>
      shares.filter((s) =>
        s.document.filename.toLowerCase().includes(search.toLowerCase()) ||
        s.sharedBy.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [shares, search],
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por documento o remitente..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Cargando...</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Inbox} message="No tienes documentos compartidos contigo" />
      ) : (
        <div className="space-y-2">
          {filtered.map((share) => (
            <div
              key={share.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/30"
            >
              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{share.document.filename}</p>
                <p className="text-xs text-muted-foreground">
                  Compartido por <span className="font-medium">{share.sharedBy.name}</span>
                  {" · "}
                  {format(new Date(share.createdAt), "dd MMM yyyy", { locale: es })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {share.canDownload && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Download className="h-3 w-3" /> Descargar
                  </Badge>
                )}
                {share.expiresAt && (
                  <span className="text-xs text-muted-foreground">
                    Expira {format(new Date(share.expiresAt), "dd/MM/yy", { locale: es })}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0"
                onClick={() => setSelectedShare(share)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <ShareDetailDialog
        share={selectedShare}
        open={!!selectedShare}
        onOpenChange={(open) => !open && setSelectedShare(null)}
      />
    </div>
  );
}

function SentTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "activo" | "expirado" | "revocado">("todos");
  const [selectedShare, setSelectedShare] = useState<DocumentShare | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<DocumentShare | null>(null);

  const { data: shares = [], isLoading } = useQuery({
    queryKey: ["shares-sent"],
    queryFn: sharesService.getSent,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: number) => sharesService.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares-sent"] });
      toast.success("Share revocado correctamente");
      setRevokeTarget(null);
    },
    onError: () => toast.error("Error al revocar el share"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => sharesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares-sent"] });
      toast.success("Share eliminado");
    },
    onError: () => toast.error("Error al eliminar el share"),
  });

  const filtered = useMemo(() => {
    return shares.filter((s) => {
      const matchesSearch =
        s.document.filename.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "todos" || getShareStatus(s) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [shares, search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por documento..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {(["todos", "activo", "expirado", "revocado"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-md px-3 py-1 text-xs capitalize transition-colors",
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s === "todos" ? "Todos" : statusConfig[s].label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Cargando...</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Send} message="No has compartido ningún documento" />
      ) : (
        <div className="space-y-2">
          {filtered.map((share) => {
            const st = getShareStatus(share);
            return (
              <div
                key={share.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
              >
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{share.document.filename}</p>
                  <div className="mt-0.5">
                    <RecipientCell share={share} />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {share.maxViews && (
                    <span className="text-xs text-muted-foreground">
                      {share.viewCount}/{share.maxViews} vistas
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className={cn("text-xs", statusConfig[st].className)}
                  >
                    {statusConfig[st].label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(share.createdAt), "dd/MM/yy", { locale: es })}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => setSelectedShare(share)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver detalles
                    </DropdownMenuItem>
                    {!share.revokedAt && (
                      <DropdownMenuItem
                        onClick={() => setRevokeTarget(share)}
                        className="text-warning focus:text-warning"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Revocar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => deleteMutation.mutate(share.id)}
                      className="text-destructive focus:text-destructive"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      <ShareDetailDialog
        share={selectedShare}
        open={!!selectedShare}
        onOpenChange={(open) => !open && setSelectedShare(null)}
      />

      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title="¿Revocar este share?"
        description="El destinatario ya no podrá acceder al documento. Esta acción no se puede deshacer."
        confirmLabel="Revocar"
        loading={revokeMutation.isPending}
        onConfirm={() => revokeTarget && revokeMutation.mutate(revokeTarget.id)}
      />
    </div>
  );
}

function PublicLinksTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedShare, setSelectedShare] = useState<DocumentShare | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<DocumentShare | null>(null);

  const { data: allSent = [], isLoading } = useQuery({
    queryKey: ["shares-sent"],
    queryFn: sharesService.getSent,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: number) => sharesService.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares-sent"] });
      toast.success("Link revocado correctamente");
      setRevokeTarget(null);
    },
    onError: () => toast.error("Error al revocar el link"),
  });

  const publicLinks = useMemo(
    () =>
      allSent
        .filter((s) => s.isPublicLink)
        .filter((s) =>
          s.document.filename.toLowerCase().includes(search.toLowerCase()),
        ),
    [allSent, search],
  );

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado al portapapeles");
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por documento..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Cargando...</div>
      ) : publicLinks.length === 0 ? (
        <EmptyState icon={Link2} message="No has creado links públicos" />
      ) : (
        <div className="space-y-2">
          {publicLinks.map((share) => {
            const st = getShareStatus(share);
            return (
              <div
                key={share.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
              >
                <Link2 className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{share.document.filename}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {share.shareToken.slice(0, 16)}…
                    </span>
                    {share.requiresPassword && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Lock className="h-3 w-3" /> Protegido
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {share.viewCount}{share.maxViews ? `/${share.maxViews}` : ""} vistas
                  </span>
                  <Badge
                    variant="outline"
                    className={cn("text-xs", statusConfig[st].className)}
                  >
                    {statusConfig[st].label}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => handleCopyLink(share.shareToken)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedShare(share)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver detalles
                    </DropdownMenuItem>
                    {!share.revokedAt && (
                      <DropdownMenuItem
                        onClick={() => setRevokeTarget(share)}
                        className="text-warning focus:text-warning"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Revocar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      <ShareDetailDialog
        share={selectedShare}
        open={!!selectedShare}
        onOpenChange={(open) => !open && setSelectedShare(null)}
      />

      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title="¿Revocar este link?"
        description="El link dejará de funcionar inmediatamente. Esta acción no se puede deshacer."
        confirmLabel="Revocar"
        loading={revokeMutation.isPending}
        onConfirm={() => revokeTarget && revokeMutation.mutate(revokeTarget.id)}
      />
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function SharesPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: received = [] } = useQuery({
    queryKey: ["shares-received"],
    queryFn: sharesService.getReceived,
  });
  const { data: sent = [] } = useQuery({
    queryKey: ["shares-sent"],
    queryFn: sharesService.getSent,
  });

  const publicLinksCount = sent.filter((s) => s.isPublicLink).length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Share2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Documentos Compartidos</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona los documentos que compartes y que comparten contigo
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Share2 className="h-4 w-4" />
          Nuevo Share
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="recibidos">
        <TabsList>
          <TabsTrigger value="recibidos" className="gap-1.5">
            <Inbox className="h-4 w-4" />
            Recibidos
            {received.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {received.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="enviados" className="gap-1.5">
            <Send className="h-4 w-4" />
            Enviados
            {sent.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {sent.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="links" className="gap-1.5">
            <Link2 className="h-4 w-4" />
            Links públicos
            {publicLinksCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {publicLinksCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recibidos" className="mt-4">
          <ReceivedTab />
        </TabsContent>
        <TabsContent value="enviados" className="mt-4">
          <SentTab />
        </TabsContent>
        <TabsContent value="links" className="mt-4">
          <PublicLinksTab />
        </TabsContent>
      </Tabs>

      {/* El CreateShareDialog desde esta página no tiene documentId fijo.
          Para usarlo desde aquí el usuario necesita ir a un documento.
          El botón "Nuevo Share" redirige al flujo correcto. */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-lg bg-card p-6 text-center shadow-xl">
            <Share2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="mb-1 font-medium">¿Qué documento quieres compartir?</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Ve a la sección de Documentos y usa el botón "Compartir" en el documento deseado.
            </p>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Entendido
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
