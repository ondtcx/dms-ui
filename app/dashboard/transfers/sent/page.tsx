"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Send,
  Search,
  Filter,
  FileText,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  RotateCcw,
  MoreHorizontal,
  Calendar,
  User,
  Building2,
} from "lucide-react";
import { TransferStats } from "@/components/transfer-stats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { transfersService } from "@/lib/services/transfer.service";
import type { TransferHistory, TransferStatus } from "@/lib/types";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";

const statusConfig: Record<
  TransferStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pendiente",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  COMPLETED: {
    label: "Completado",
    className: "bg-success/10 text-success border-success/20",
  },
  CANCELED: {
    label: "Cancelado",
    className: "bg-muted text-muted-foreground border-border",
  },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Hoy, ${date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
  } else if (diffDays === 1) {
    return `Ayer, ${date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
  } else if (diffDays < 7) {
    return `Hace ${diffDays} días`;
  } else {
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
}

function getDocIcon(mimetype: string) {
  if (mimetype.includes("spreadsheet") || mimetype.includes("excel"))
    return FileSpreadsheet;
  return FileText;
}

export default function SentPage() {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTransfer, setSelectedTransfer] =
    useState<TransferHistory | null>(null);

  const { data: transfers, isLoading } = useQuery({
    queryKey: ["transfers-sent"],
    queryFn: () => transfersService.getSent(),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => transfersService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers-sent"] });
      queryClient.invalidateQueries({ queryKey: ["transfer-stats"] });
      toast.success("Transferencia cancelada");
    },
    onError: () => {
      toast.error("Error al cancelar la transferencia");
    },
  });

  const filteredTransfers = (transfers || []).filter((t) => {
    const recipientName = t.toUser?.name || t.toDepartment?.name || "";
    const matchesSearch =
      searchQuery === "" ||
      ((t.document?.versions?.[0]?.filename) ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipientName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || t.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleCancel = (id: number) => {
    cancelMutation.mutate(id);
  };

  const completedCount = (transfers || []).filter(
    (t) => t.status === "COMPLETED",
  ).length;

  const pendingCount = (transfers || []).filter(
    (t) => t.status === "PENDING",
  ).length;

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TransferStats />
        </div>

        <Card className="mb-6 border-border bg-card">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por documento o destinatario..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-input pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 bg-input">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="PENDING">Pendientes</SelectItem>
                    <SelectItem value="COMPLETED">Completados</SelectItem>
                    <SelectItem value="CANCELED">Cancelados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">
              Transferencias Enviadas
            </CardTitle>
            <CardDescription>
              {isLoading
                ? "Cargando..."
                : `${filteredTransfers.length} transferencia(s) encontrada(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  </div>
                ))
              ) : filteredTransfers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Send className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    No se encontraron transferencias
                  </p>
                </div>
              ) : (
                filteredTransfers.map((transfer) => {
                  const DocIcon = getDocIcon(((transfer.document?.versions?.[0]?.mimetype) ?? ''));
                  const isPending = transfer.status === "PENDING";
                  const isCanceled = transfer.status === "CANCELED";

                  return (
                    <div
                      key={transfer.id}
                      className={cn(
                        "flex items-center justify-between p-4 transition-colors hover:bg-secondary/30",
                        isPending && "bg-primary/5",
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                          <Send className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/dashboard/documents/${transfer.document.id}`}
                              className="font-medium text-foreground hover:underline"
                            >
                              {((transfer.document?.versions?.[0]?.filename) ?? '')}
                            </Link>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                statusConfig[transfer.status].className,
                              )}
                            >
                              {statusConfig[transfer.status].label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              {transfer.toUser ? (
                                <>
                                  <User className="h-3 w-3" />
                                  {transfer.toUser.name}
                                  {transfer.toUser.department && (
                                    <span>({transfer.toUser.department.name})</span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <Building2 className="h-3 w-3" />
                                  {transfer.toDepartment?.name || "Departamento"}
                                </>
                              )}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(transfer.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isPending && (
                          <span className="text-xs text-muted-foreground">
                            Esperando aceptación
                          </span>
                        )}
                        {transfer.status === "COMPLETED" && (
                          <span className="text-xs text-success">
                            Completado{" "}
                            {transfer.completedAt &&
                              formatDate(transfer.completedAt)}
                          </span>
                        )}
                        {isCanceled && (
                          <span className="text-xs text-muted-foreground">
                            Cancelado{" "}
                            {transfer.canceledAt &&
                              formatDate(transfer.canceledAt)}
                          </span>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setSelectedTransfer(transfer)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalles
                            </DropdownMenuItem>
                            {isPending && (
                              <DropdownMenuItem
                                onClick={() => handleCancel(transfer.id)}
                                className="text-destructive"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancelar transferencia
                              </DropdownMenuItem>
                            )}
                            {isCanceled && (
                              <DropdownMenuItem>
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Volver a enviar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!selectedTransfer}
        onOpenChange={() => setSelectedTransfer(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalles de Transferencia</DialogTitle>
            <DialogDescription>
              Información completa de la transferencia
            </DialogDescription>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 text-sm font-medium text-foreground">
                  Documento
                </h4>
                <div className="flex items-center gap-2 rounded bg-secondary/50 px-3 py-2">
                  {(() => {
                    const DocIcon = getDocIcon(
                      ((selectedTransfer.document?.versions?.[0]?.mimetype) ?? ''),
                    );
                    return (
                      <DocIcon className="h-4 w-4 text-muted-foreground" />
                    );
                  })()}
                  <span className="text-sm text-foreground">
                    {((selectedTransfer.document?.versions?.[0]?.filename) ?? '')}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-medium text-foreground">
                  Destinatario
                </h4>
                <div className="flex items-center gap-2 text-sm">
                  {selectedTransfer.toUser ? (
                    <>
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">
                        {selectedTransfer.toUser.name}
                      </span>
                      {selectedTransfer.toUser.department && (
                        <span className="text-muted-foreground">
                          ({selectedTransfer.toUser.department.name})
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">
                        {selectedTransfer.toDepartment?.name || "Departamento"}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {selectedTransfer.comment && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-foreground">
                    Mensaje
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedTransfer.comment}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-border pt-4">
                <div className="text-sm text-muted-foreground">
                  Enviado: {formatDate(selectedTransfer.createdAt)}
                </div>
                <Badge
                  variant="outline"
                  className={statusConfig[selectedTransfer.status].className}
                >
                  {statusConfig[selectedTransfer.status].label}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
