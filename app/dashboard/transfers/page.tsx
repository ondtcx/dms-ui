"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Send, Download, Clock, FileText, Users, Building2 } from "lucide-react";
import { TransferStats } from "@/components/transfer-stats";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { transfersService } from "@/lib/services/transfer.service";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Hoy`;
  } else if (diffDays === 1) {
    return `Ayer`;
  } else if (diffDays < 7) {
    return `Hace ${diffDays} días`;
  } else {
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  }
}

interface RecentTransferCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  iconColor: string;
  count?: number;
}

function RecentTransferCard({
  title,
  description,
  icon: Icon,
  href,
  iconColor,
  count,
}: RecentTransferCardProps) {
  return (
    <Link href={href}>
      <Card className="group border-border bg-card transition-all hover:border-primary/50 hover:shadow-md">
        <CardContent className="flex items-center gap-4 p-6">
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-secondary ${iconColor}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg text-foreground group-hover:text-primary">
              {title}
            </CardTitle>
            <CardDescription className="mt-1">
              {description}
              {count !== undefined && (
                <span className="ml-2 font-medium text-foreground">
                  ({count})
                </span>
              )}
            </CardDescription>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </CardContent>
      </Card>
    </Link>
  );
}

export default function TransfersPage() {
  const { data: sentTransfers, isLoading: isLoadingSent } = useQuery({
    queryKey: ["transfers-sent"],
    queryFn: () => transfersService.getSent(),
  });

  const { data: receivedTransfers, isLoading: isLoadingReceived } = useQuery({
    queryKey: ["transfers-received"],
    queryFn: () => transfersService.getReceived(),
  });

  const pendingReceived = (receivedTransfers || []).filter(
    (t) => t.status === "PENDING",
  ).length;

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Transferencias</h1>
          <p className="mt-2 text-muted-foreground">
            Gestiona el envío y recepción de documentos entre usuarios y departamentos
          </p>
        </div>

        <div className="mb-6">
          <TransferStats />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <RecentTransferCard
            title="Nueva Transferencia"
            description="Envía documentos a usuarios o departamentos"
            icon={Send}
            href="/dashboard/transfers/new-transfer"
            iconColor="text-primary"
          />

          <RecentTransferCard
            title="Enviados"
            description="Documentos que has enviado"
            icon={FileText}
            href="/dashboard/transfers/sent"
            iconColor="text-blue-500"
            count={isLoadingSent ? undefined : sentTransfers?.length || 0}
          />

          <RecentTransferCard
            title="Recibidos"
            description="Documentos pendientes de aceptar"
            icon={Download}
            href="/dashboard/transfers/received"
            iconColor="text-green-500"
            count={isLoadingReceived ? undefined : pendingReceived}
          />
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Últimos Enviados</CardTitle>
              <CardDescription>
                Tus transferencias más recientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSent ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !sentTransfers?.length ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Send className="h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">
                    No has enviado transferencias
                  </p>
                  <Link href="/dashboard/transfers/new-transfer">
                    <Button variant="link" className="mt-2">
                      Crear primera transferencia
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {sentTransfers.slice(0, 5).map((transfer) => (
                    <div
                      key={transfer.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                          {transfer.toUser ? (
                            <Users className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {transfer.document.filename}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Para: {transfer.toUser?.name || transfer.toDepartment?.name || "Departamento"}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(transfer.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Últimos Recibidos</CardTitle>
              <CardDescription>
                Transferencias pendientes de aceptar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingReceived ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !receivedTransfers?.length ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Download className="h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">
                    No tienes transferencias recibidas
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {receivedTransfers.slice(0, 5).map((transfer) => (
                    <div
                      key={transfer.id}
                      className={`flex items-center justify-between rounded-lg border p-3 ${
                        transfer.status === "PENDING"
                          ? "border-primary/20 bg-primary/5"
                          : "border-border bg-secondary/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                          <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {transfer.document.filename}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            De: {transfer.fromUser.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {transfer.status === "PENDING" && (
                          <span className="flex items-center gap-1 text-xs text-warning">
                            <Clock className="h-3 w-3" />
                            Pendiente
                          </span>
                        )}
                        {transfer.status === "COMPLETED" && (
                          <span className="text-xs text-success">
                            Completado
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
