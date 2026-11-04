"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Download, FileText, Send } from "lucide-react";
import { TransferStats } from "@/components/transfer-stats";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { transfersService } from "@/lib/services/transfers.service";
import { formatTransferDate, transferDocumentName, transferStatusConfig } from "@/lib/transfer-utils";
import type { TransferHistory } from "@/lib/types";

function SummaryCard({ href, title, description, icon: Icon }: {
  href: string;
  title: string;
  description: string;
  icon: typeof Send;
}) {
  return (
    <Link href={href}>
      <Card className="group h-full transition-colors hover:border-primary/50">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base group-hover:text-primary">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </CardContent>
      </Card>
    </Link>
  );
}

function RecentList({
  transfers,
  empty,
  loading,
  error,
}: {
  transfers: TransferHistory[];
  empty: string;
  loading: boolean;
  error: boolean;
}) {
  if (loading) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Cargando...</p>;
  }
  if (error) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No se pudieron cargar.</p>;
  }
  if (transfers.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="space-y-3">
      {transfers.slice(0, 5).map((transfer) => (
        <div key={transfer.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
          <div className="min-w-0">
            <Link href={`/dashboard/documents/${transfer.document.id}`} className="block truncate text-sm font-medium hover:underline">
              {transferDocumentName(transfer)}
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {transfer.toUser?.name || transfer.toUser?.email || "Destinatario"} · {formatTransferDate(transfer.createdAt)}
            </p>
          </div>
          <Badge variant="outline" className={transferStatusConfig[transfer.status].className}>
            {transferStatusConfig[transfer.status].label}
          </Badge>
        </div>
      ))}
    </div>
  );
}

export default function TransfersPage() {
  const sent = useQuery({ queryKey: ["transfers-sent"], queryFn: () => transfersService.getSent() });
  const received = useQuery({ queryKey: ["transfers-received"], queryFn: () => transfersService.getReceived() });
  const pendingReceived = (received.data ?? []).filter((item) => item.status === "PENDING");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transferencias</h1>
        <p className="text-sm text-muted-foreground">
          Solicita y acepta el cambio de propiedad de documentos entre usuarios.
        </p>
      </div>

      <TransferStats />

      {(sent.isError || received.isError) && (
        <Alert variant="destructive">
          <AlertTitle>No se pudieron cargar las transferencias</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>Revisa la conexión e inténtalo de nuevo.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => {
                sent.refetch();
                received.refetch();
              }}
            >
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard href="/dashboard/transfers/new-transfer" title="Nueva transferencia" description="Selecciona un documento propio o administrado" icon={Send} />
        <SummaryCard href="/dashboard/transfers/sent" title="Enviadas" description={sent.isLoading ? "Cargando..." : sent.isError ? "No disponible" : `${sent.data?.length ?? 0} solicitudes registradas`} icon={FileText} />
        <SummaryCard href="/dashboard/transfers/received" title="Recibidas" description={received.isLoading ? "Cargando..." : received.isError ? "No disponible" : `${pendingReceived.length} pendientes de aceptar`} icon={Download} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Últimas enviadas</CardTitle>
            <CardDescription>Solicitudes que iniciaste o que pertenecen a tus documentos.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentList transfers={sent.data ?? []} empty="Todavía no has enviado transferencias." loading={sent.isLoading} error={sent.isError} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recibidas pendientes</CardTitle>
            <CardDescription>Documentos que esperan tu aceptación.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentList transfers={pendingReceived} empty="No tienes transferencias pendientes." loading={received.isLoading} error={received.isError} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
