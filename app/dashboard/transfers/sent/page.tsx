"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Send, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { TransferStats } from "@/components/transfer-stats";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { transfersService } from "@/lib/services/transfers.service";
import {
  formatTransferDate,
  groupTransfers,
  transferDocumentName,
  transferErrorMessage,
  transferStatusConfig,
} from "@/lib/transfer-utils";
import type { TransferStatus } from "@/lib/types";

export default function SentTransfersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | TransferStatus>("all");

  const transfers = useQuery({
    queryKey: ["transfers-sent"],
    queryFn: () => transfersService.getSent(),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["transfers-sent"] });
    queryClient.invalidateQueries({ queryKey: ["transfers-received"] });
    queryClient.invalidateQueries({ queryKey: ["transfer-stats"] });
  };

  const cancel = useMutation({
    mutationFn: (id: number) => transfersService.cancel(id),
    onSuccess: () => {
      toast.success("Transferencia cancelada");
      refresh();
    },
    onError: (error) =>
      toast.error(transferErrorMessage(error, "No se pudo cancelar la transferencia")),
  });

  const cancelBatch = useMutation({
    mutationFn: (batchId: string) => transfersService.cancelBatch(batchId),
    onSuccess: (result) => {
      toast.success(`${result.canceled} documento(s) cancelados`);
      refresh();
    },
    onError: (error) =>
      toast.error(transferErrorMessage(error, "No se pudo cancelar el lote")),
  });

  const matchesSearch = (transfer: import("@/lib/types").TransferHistory) => {
    const target = transfer.toUser?.name || transfer.toUser?.email || "";
    const name = transferDocumentName(transfer);
    return (
      !search.trim() ||
      name.toLowerCase().includes(search.trim().toLowerCase()) ||
      target.toLowerCase().includes(search.trim().toLowerCase())
    );
  };
  const { singles, batches } = groupTransfers(transfers.data ?? []);
  const visibleBatches = batches.filter(
    (batch) =>
      (status === "all" || batch.status === status) &&
      batch.items.some(matchesSearch),
  );
  const visibleSingles = singles.filter(
    (transfer) =>
      matchesSearch(transfer) &&
      (status === "all" || transfer.status === status),
  );
  const hasResults = visibleBatches.length + visibleSingles.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transferencias enviadas</h1>
        <p className="text-sm text-muted-foreground">
          Solicitudes iniciadas por ti o sobre documentos de tu propiedad.
        </p>
      </div>

      <TransferStats />

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por documento o destinatario..."
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as "all" | TransferStatus)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="PENDING">Pendientes</SelectItem>
              <SelectItem value="COMPLETED">Completadas</SelectItem>
              <SelectItem value="CANCELED">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {transfers.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Cargando transferencias...</p>
          ) : !hasResults ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <Send className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No hay transferencias que coincidan.</p>
            </div>
          ) : (
            <div className="divide-y">
              {visibleBatches.map((batch) => (
                <div key={batch.batchId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        Transferencia masiva · {batch.totalCount} documento(s)
                      </span>
                      <Badge variant="outline" className={transferStatusConfig[batch.status].className}>
                        {transferStatusConfig[batch.status].label}
                        {batch.pendingCount > 0 && batch.pendingCount < batch.totalCount
                          ? ` · ${batch.pendingCount} pendientes`
                          : ""}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Para:{" "}
                      {batch.representative.toUser?.name ||
                        batch.representative.toUser?.email ||
                        "Destinatario"}{" "}
                      · {formatTransferDate(batch.representative.createdAt)}
                    </p>
                    {batch.representative.initiatedBy &&
                      batch.representative.initiatedById !== batch.representative.fromUserId && (
                        <p className="text-xs text-muted-foreground">
                          Iniciada por administración:{" "}
                          {batch.representative.initiatedBy.name ||
                            batch.representative.initiatedBy.email}
                        </p>
                      )}
                    {batch.representative.comment && (
                      <p className="mt-1 text-sm">{batch.representative.comment}</p>
                    )}
                    <details className="mt-2 text-sm">
                      <summary className="cursor-pointer text-muted-foreground">
                        Ver documentos
                      </summary>
                      <ul className="mt-2 list-inside list-disc space-y-1">
                        {batch.items.map((item) => (
                          <li key={item.id}>
                            <Link
                              href={`/dashboard/documents/${item.document.id}`}
                              className="hover:underline"
                            >
                              {transferDocumentName(item)}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                  {batch.pendingCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={cancel.isPending || cancelBatch.isPending}
                      onClick={() => cancelBatch.mutate(batch.batchId)}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancelar lote
                    </Button>
                  )}
                </div>
              ))}

              {visibleSingles.map((transfer) => (
                <div key={transfer.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/dashboard/documents/${transfer.document.id}`} className="font-medium hover:underline">
                        {transferDocumentName(transfer)}
                      </Link>
                      <Badge variant="outline" className={transferStatusConfig[transfer.status].className}>
                        {transferStatusConfig[transfer.status].label}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Para: {transfer.toUser?.name || transfer.toUser?.email || "Destinatario"} · {formatTransferDate(transfer.createdAt)}
                    </p>
                    {transfer.initiatedBy && transfer.initiatedById !== transfer.fromUserId && (
                      <p className="text-xs text-muted-foreground">
                        Iniciada por administración: {transfer.initiatedBy.name || transfer.initiatedBy.email}
                      </p>
                    )}
                    {transfer.comment && <p className="mt-1 text-sm">{transfer.comment}</p>}
                  </div>
                  {transfer.status === "PENDING" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={cancel.isPending || cancelBatch.isPending}
                      onClick={() => cancel.mutate(transfer.id)}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancelar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
