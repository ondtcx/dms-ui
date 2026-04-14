"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Inbox,
  Search,
  Filter,
  FileText,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  Eye,
  Download,
  MoreHorizontal,
  Calendar,
  User,
  Building2,
  Archive,
  Star,
  StarOff,
  X,
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
import { Checkbox } from "@/components/ui/checkbox";
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDocIcon(mimetype: string) {
  if (mimetype.includes("spreadsheet") || mimetype.includes("excel"))
    return FileSpreadsheet;
  return FileText;
}

export default function ReceivedPage() {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTransfer, setSelectedTransfer] =
    useState<TransferHistory | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { data: transfers, isLoading } = useQuery({
    queryKey: ["transfers-received"],
    queryFn: () => transfersService.getReceived(),
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) => transfersService.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers-received"] });
      queryClient.invalidateQueries({ queryKey: ["transfer-stats"] });
      toast.success("Transferencia completada");
    },
    onError: () => {
      toast.error("Error al completar la transferencia");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => transfersService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers-received"] });
      toast.success("Transferencia cancelada");
    },
    onError: () => {
      toast.error("Error al cancelar la transferencia");
    },
  });

  const filteredTransfers = (transfers || []).filter((t) => {
    const matchesSearch =
      searchQuery === "" ||
      ((t.document?.versions?.[0]?.filename) ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.fromUser.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || t.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleComplete = (id: number) => {
    completeMutation.mutate(id);
  };

  const handleCancel = (id: number) => {
    cancelMutation.mutate(id);
  };

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
                  placeholder="Buscar por documento o remitente..."
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

        {selectedIds.length > 0 && (
          <div className="mb-4 flex items-center gap-4 rounded-lg border border-border bg-secondary/50 p-3">
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} seleccionado(s)
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-transparent"
            >
              <CheckCircle2 className="h-4 w-4" />
              Marcar como leido
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-transparent"
            >
              <Archive className="h-4 w-4" />
              Archivar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              Cancelar
            </Button>
          </div>
        )}

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">
              Transferencias Recibidas
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
                  <div key={i} className="flex items-center gap-4 p-4">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))
              ) : filteredTransfers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Inbox className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    No se encontraron transferencias
                  </p>
                </div>
              ) : (
                filteredTransfers.map((transfer) => {
                  const isPending = transfer.status === "PENDING";
                  const DocIcon = getDocIcon(((transfer.document?.versions?.[0]?.mimetype) ?? ''));

                  return (
                    <div
                      key={transfer.id}
                      className={cn(
                        "flex items-center gap-4 p-4 transition-colors hover:bg-secondary/30",
                        isPending && "bg-primary/5",
                      )}
                    >
                      <Checkbox
                        checked={selectedIds.includes(transfer.id)}
                        onCheckedChange={() => toggleSelect(transfer.id)}
                      />

                      <div className="flex flex-1 items-start gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                          {transfer.toUser ? (
                            <User className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {transfer.fromUser.name}
                            </p>
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
                          <Link
                            href={`/dashboard/documents/${transfer.document.id}`}
                            className="truncate font-medium text-foreground hover:underline"
                          >
                            {((transfer.document?.versions?.[0]?.filename) ?? '')}
                          </Link>
                          {transfer.comment && (
                            <p className="truncate text-sm text-muted-foreground">
                              {transfer.comment}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(transfer.createdAt)}
                        </span>
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
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Descargar documento
                            </DropdownMenuItem>
                            {isPending && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleComplete(transfer.id)}
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Aceptar transferencia
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleCancel(transfer.id)}
                                  className="text-destructive"
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Cancelar
                                </DropdownMenuItem>
                              </>
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
              Recibido de {selectedTransfer?.fromUser.name}
            </DialogDescription>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 text-sm font-medium text-foreground">
                  Documento
                </h4>
                <div className="flex items-center justify-between rounded bg-secondary/50 px-3 py-2">
                  <div className="flex items-center gap-2">
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
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(((selectedTransfer.document?.versions?.[0]?.size) ?? 0))}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-medium text-foreground">
                  Remitente
                </h4>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {selectedTransfer.fromUser.name}
                  </span>
                  <span className="text-muted-foreground">
                    (
                    {selectedTransfer.fromUser.department?.name ||
                      "Sin departamento"}
                    )
                  </span>
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
                  Recibido: {formatDate(selectedTransfer.createdAt)}
                </div>
                {selectedTransfer.status === "PENDING" && (
                  <Button
                    className="gap-2"
                    onClick={() => handleComplete(selectedTransfer.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Aceptar
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
