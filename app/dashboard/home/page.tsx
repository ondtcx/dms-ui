"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { documentsService } from "@/lib/services/documents.service";
import { DashboardDocumentRow } from "@/components/documents/DashboardDocumentRow";
import { NewDocumentButton } from "@/components/documents/NewDocumentButton";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ROTATING_MESSAGES = [
  "¡Qué gusto verte!",
  "¡Que tengas un gran día!",
  "¡Mucho éxito hoy!",
  "¡Qué bueno tenerte aquí!",
  "¡Te damos la bienvenida!",
  "¡Que todo marche muy bien!",
  "¡Excelente jornada!",
  "¡Listos para ayudarte!",
  "¡A comenzar con energía!",
  "¡Que disfrutes tu jornada!",
];

const MESSAGE_INDEX_STORAGE_KEY = "dashboard-message-index";

function getGreeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "¡Buenos días" : hour < 19 ? "¡Buenas tardes" : "¡Buenas noches";
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <section className="space-y-3" aria-labelledby={`${title}-heading`}><div className="flex items-center justify-between gap-4"><h2 id={`${title}-heading`} className="text-lg font-semibold">{title}</h2>{action}</div>{children}</section>;
}

function isPermissionDenied(error: unknown) {
  if (!error || typeof error !== "object" || !("response" in error)) return false;
  const response = error.response;
  return !!response && typeof response === "object" && "status" in response && response.status === 403;
}

export default function DashboardHomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [messageIndex, setMessageIndex] = useState(0);
  const hasRotatedMessage = useRef(false);
  const summary = useQuery({ queryKey: ["documents", "dashboard-summary"], queryFn: documentsService.getDashboardSummary });
  const openUploadDialog = (action: "upload-single" | "upload-multiple") =>
    router.push(`/dashboard/documents?action=${action}`);
  const permissionDenied = isPermissionDenied(summary.error);

  useEffect(() => {
    if (hasRotatedMessage.current) return;
    hasRotatedMessage.current = true;

    const storedIndex = window.sessionStorage.getItem(MESSAGE_INDEX_STORAGE_KEY);
    const previousIndex = storedIndex === null ? -1 : Number(storedIndex);
    const nextIndex = Number.isInteger(previousIndex)
      ? (previousIndex + 1) % ROTATING_MESSAGES.length
      : 0;

    setMessageIndex(nextIndex);
    window.sessionStorage.setItem(MESSAGE_INDEX_STORAGE_KEY, String(nextIndex));
  }, []);

  return <main className="mx-auto max-w-7xl space-y-8 overflow-x-hidden p-4 sm:p-8">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><h1 className="text-3xl font-bold tracking-tight">{getGreeting()}, {user?.name}!</h1><p className="mt-1 text-muted-foreground" aria-live="polite">{ROTATING_MESSAGES[messageIndex]}</p></div>
      <NewDocumentButton aria-label="Nuevo documento" onUploadSingle={() => openUploadDialog("upload-single")} onUploadMultiple={() => openUploadDialog("upload-multiple")} />
    </header>

    <Section title="Documentos recientes" action={<Link className="text-sm font-medium text-slate-700 hover:underline dark:text-slate-200" href="/dashboard/documents">Ver todos <ArrowRight className="inline h-3.5 w-3.5" aria-hidden="true" /></Link>}>
      <Card><CardContent className="pt-4">{summary.isLoading ? <div className="space-y-3" role="status" aria-live="polite" aria-busy="true" aria-label="Cargando documentos">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-14 w-full motion-reduce:animate-none" />)}</div> : summary.isError ? <p className="text-sm text-muted-foreground" role="status">{permissionDenied ? "Los documentos recientes no están disponibles por permisos insuficientes." : "Los documentos recientes no están disponibles."}</p> : summary.data?.recent.length ? <div className="divide-y">{summary.data.recent.map((document) => <DashboardDocumentRow key={document.id} document={document} />)}</div> : <p className="py-6 text-center text-sm text-muted-foreground">No hay documentos recientes.</p>}</CardContent></Card>
    </Section>

  </main>;
}
