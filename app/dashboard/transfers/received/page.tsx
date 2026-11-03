"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Inbox, Search, XCircle } from "lucide-react";
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
  transferDocumentName,
  transferErrorMessage,
  transferStatusConfig,
} from "@/lib/transfer-utils";
import type { TransferStatus } from "@/lib/types";

export default function ReceivedTransfersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | TransferStatus>("all");

  const transfers = useQuery({
    queryKey: ["transfers-received"],
    queryFn: () => transfersService.getReceived(),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["transfers-received"] });
    queryClient.invalidateQueries({ queryKey: ["transfers-sent"] });
    queryClient.invalidateQueries({ queryKey: ["transfer-stats"] });
    queryClient.invalidateQueries({ queryKey: ["documents"] });
  };

  const accept = useMutation({
    mutationFn: (id: number) => transfersService.accept(id),
    onSuccess: () => {
      toast.success("Transferencia aceptada; el documento ya es tuyo");
      refresh();
    },
    onError: (error) =>
      toast.error(transferErrorMessage(error, "No se pudo aceptar la transferencia")),
  });

  const cancel = useMutation({
    mutationFn: (id: number) => transfersService.cancel(id),
    onSuccess: () => {
      toast.success("Transferencia rechazada");
      refresh();
    },
    onError: (error) =>
      toast.error(transferErrorMessage(error, "No se pudo rechazar la transferencia")),
  });

  const filtered = (transfers.data ?? []).filter((transfer) => {
    const sender = transfer.fromUser.name || transfer.fromUser.email;
    const name = transferDocumentName(transfer);
    const matchesSearch =
      !search.trim() ||
      name.toLowerCase().includes(search.trim().toLowerCase()) ||
      sender.toLowerCase().includes(search.trim().toLowerCase());
    return matchesSearch && (status === "all" || transfer.status === status);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transferencias recibidas</h1>
        <p className="text-sm text-muted-foreground">
          Acepta o rechaza las solicitudes de cambio de propiedad.
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
              placeholder="Buscar por documento o remitente..."
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
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No hay transferencias que coincidan.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((transfer) => (
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
                      De: {transfer.fromUser.name || transfer.fromUser.email} · {formatTransferDate(transfer.createdAt)}
                    </p>
                    {transfer.initiatedBy && transfer.initiatedById !== transfer.fromUserId && (
                      <p className="text-xs text-muted-foreground">
                        Iniciada por administración: {transfer.initiatedBy.name || transfer.initiatedBy.email}
                      </p>
                    )}
                    {transfer.comment && <p className="mt-1 text-sm">{transfer.comment}</p>}
                  </div>
                  {transfer.status === "PENDING" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={accept.isPending || cancel.isPending}
                        onClick={() => accept.mutate(transfer.id)}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Aceptar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={accept.isPending || cancel.isPending}
                        onClick={() => cancel.mutate(transfer.id)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Rechazar
                      </Button>
                    </div>
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
