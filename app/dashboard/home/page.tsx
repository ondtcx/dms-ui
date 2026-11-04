"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ArrowRightLeft, ClipboardCheck, Inbox } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { documentsService } from "@/lib/services/documents.service";
import { authoringService } from "@/lib/services/authoring.service";
import { documentReviewService } from "@/lib/services/document-reviews.service";
import { transfersService } from "@/lib/services/transfers.service";
import { transferDocumentName } from "@/lib/transfer-utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { DashboardDocumentRow } from "@/components/documents/DashboardDocumentRow";
import { NewDocumentButton } from "@/components/documents/NewDocumentButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function getGreeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "¡Buenos días" : hour < 19 ? "¡Buenas tardes" : "¡Buenas noches";
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const headingId = `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-heading`;
  return (
    <section className="space-y-3" aria-labelledby={headingId}>
      <div className="flex items-center justify-between gap-4">
        <h2 id={headingId} className="text-lg font-semibold">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function formatWaiting(value?: string | null) {
  if (!value) return "sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sin fecha";
  return formatDistanceToNow(date, { addSuffix: true, locale: es });
}

type WorkItem = {
  id: string;
  title: string;
  type: string;
  author: string;
  waitingSince?: string | null;
  href: string;
  action: string;
  icon: typeof ClipboardCheck;
};

function isPermissionDenied(error: unknown) {
  if (!error || typeof error !== "object" || !("response" in error)) return false;
  const response = error.response;
  return !!response && typeof response === "object" && "status" in response && response.status === 403;
}

export default function DashboardHomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const summary = useQuery({
    queryKey: ["documents", "dashboard-summary"],
    queryFn: documentsService.getDashboardSummary,
  });
  const authoringPending = useQuery({
    queryKey: ["authoring-pending"],
    queryFn: () => authoringService.pendingDocuments(),
  });
  const reviewPending = useQuery({
    queryKey: ["document-review-pending"],
    queryFn: () => documentReviewService.pending(),
  });
  const transfersReceived = useQuery({
    queryKey: ["transfers-received"],
    queryFn: () => transfersService.getReceived(),
  });
  const permissionDenied = isPermissionDenied(summary.error);

  const pendingLoading =
    authoringPending.isLoading ||
    reviewPending.isLoading ||
    transfersReceived.isLoading;
  const pendingError =
    authoringPending.isError ||
    reviewPending.isError ||
    transfersReceived.isError;
  const retryPending = () => {
    authoringPending.refetch();
    reviewPending.refetch();
    transfersReceived.refetch();
  };

  const timeValue = (value?: string | null) =>
    value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;

  const workItems: WorkItem[] = [
    ...(authoringPending.data ?? []).map((document) => ({
      id: `authoring-${document.id}`,
      title:
        document.name?.trim() ||
        document.templateData?.template?.name ||
        "Documento de elaboración",
      type: document.templateData?.template?.name ?? "Elaboración",
      author:
        document.uploadedBy?.name?.trim() || "Autor no disponible",
      waitingSince: document.authoring.submittedAt ?? document.updatedAt,
      href: `/dashboard/elaboracion/${document.id}`,
      action: "Revisar",
      icon: ClipboardCheck,
    })),
    ...(reviewPending.data ?? []).map((review) => ({
      id: `review-${review.id}`,
      title:
        review.document?.name?.trim() || `Documento #${review.documentId}`,
      type: "Documento subido",
      author:
        review.document?.uploadedBy?.name?.trim() || "Autor no disponible",
      waitingSince: review.submittedAt,
      href: `/dashboard/documents/${review.documentId}`,
      action: "Revisar",
      icon: Inbox,
    })),
    ...(transfersReceived.data ?? [])
      .filter((transfer) => transfer.status === "PENDING")
      .map((transfer) => ({
        id: `transfer-${transfer.id}`,
        title: transferDocumentName(transfer),
        type: "Transferencia",
        author:
          transfer.fromUser?.name?.trim() ||
          transfer.fromUser?.email ||
          "Remitente no disponible",
        waitingSince: transfer.createdAt,
        href: "/dashboard/transfers/received",
        action: "Ver solicitud",
        icon: ArrowRightLeft,
      })),
  ]
    .sort((a, b) => timeValue(a.waitingSince) - timeValue(b.waitingSince))
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl space-y-8 overflow-x-hidden">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {getGreeting()}, {user?.name}!
          </h1>
          <p className="mt-1 text-muted-foreground">
            ¡Qué gusto verte! Esto es lo que tienes pendiente hoy.
          </p>
        </div>
        <NewDocumentButton
          aria-label="Nuevo documento"
          onClick={() => router.push("/dashboard/documents?action=new")}
        />
      </header>

      <Section
        title="Pendientes"
        action={
          <div className="flex items-center gap-3 text-sm font-medium">
            <Link
              className="text-primary hover:underline"
              href="/dashboard/documents/pending"
            >
              Revisiones
            </Link>
            <Link
              className="text-primary hover:underline"
              href="/dashboard/transfers/received"
            >
              Transferencias
            </Link>
          </div>
        }
      >
        <Card>
          <CardContent className="pt-4">
            {pendingLoading ? (
              <div
                className="space-y-3"
                role="status"
                aria-live="polite"
                aria-busy="true"
                aria-label="Cargando pendientes"
              >
                {[1, 2, 3].map((item) => (
                  <Skeleton
                    key={item}
                    className="h-12 w-full motion-reduce:animate-none"
                  />
                ))}
              </div>
            ) : pendingError ? (
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm text-muted-foreground" role="status">
                  No se pudieron cargar los pendientes.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={retryPending}
                >
                  Reintentar
                </Button>
              </div>
            ) : workItems.length === 0 ? (
              <p
                className="py-8 text-center text-sm text-muted-foreground"
                role="status"
              >
                Todo al día. No tienes trabajo pendiente.
              </p>
            ) : (
              <ul className="divide-y">
                {workItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 hover:bg-muted/40"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <Icon
                            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {item.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.type} · {item.author} ·{" "}
                              {formatWaiting(item.waitingSince)}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-primary">
                          {item.action} →
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </Section>

      <Section
        title="Documentos recientes"
        action={
          <Link
            className="text-sm font-medium text-foreground hover:underline"
            href="/dashboard/documents"
          >
            Ver todos{" "}
            <ArrowRight className="inline h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      >
        <Card>
          <CardContent className="pt-4">
            {summary.isLoading ? (
              <div
                className="space-y-3"
                role="status"
                aria-live="polite"
                aria-busy="true"
                aria-label="Cargando documentos"
              >
                {[1, 2, 3].map((item) => (
                  <Skeleton
                    key={item}
                    className="h-14 w-full motion-reduce:animate-none"
                  />
                ))}
              </div>
            ) : summary.isError ? (
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm text-muted-foreground" role="status">
                  {permissionDenied
                    ? "Los documentos recientes no están disponibles por permisos insuficientes."
                    : "Los documentos recientes no están disponibles."}
                </p>
                {!permissionDenied && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => summary.refetch()}
                  >
                    Reintentar
                  </Button>
                )}
              </div>
            ) : summary.data?.recent.length ? (
              <div className="divide-y">
                {summary.data.recent.map((document) => (
                  <DashboardDocumentRow key={document.id} document={document} />
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No hay documentos recientes.
              </p>
            )}
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
