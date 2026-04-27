"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileSearch, FolderOpen, PlusCircle, Users } from "lucide-react";

import { displayRoleName } from "@/lib/auth/normalizers";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useSettings } from "@/lib/contexts/SettingsContext";
import { usePermissions } from "@/hooks/use-permissions";
import { documentsService } from "@/lib/services/documents.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatBytes(mb: string | number) {
  const n = typeof mb === "string" ? parseFloat(mb) : mb;
  if (!Number.isFinite(n) || n <= 0) return "0 MB";
  if (n >= 1024) return `${(n / 1024).toFixed(1)} GB`;
  return `${n.toFixed(1)} MB`;
}

export default function DashboardHomePage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { canAccessRoute } = usePermissions();

  const resolvedRoleName = displayRoleName(user ?? {});
  const institutionName = settings?.institution?.name ?? "Unidad Educativa";
  const schoolYearName = settings?.schoolYear?.isActive ? settings.schoolYear.name : null;

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => documentsService.getStats(),
  });

  const { data: recentDocs, isLoading: recentLoading } = useQuery({
    queryKey: ["documents", "recent-dashboard"],
    queryFn: () => documentsService.getAll({ limit: 5, page: 1 }),
  });

  const quickActions = [
    {
      title: "Registro documental",
      description: "Registra documentos físicos o digitales desde un flujo dedicado.",
      href: "/dashboard/document-registration",
      icon: PlusCircle,
      enabled: canAccessRoute("/dashboard/documents"),
    },
    {
      title: "Archivo y consulta",
      description: "Consulta el archivo documental con búsqueda, filtros y trazabilidad.",
      href: "/dashboard/documents",
      icon: FileSearch,
      enabled: canAccessRoute("/dashboard/documents"),
    },
    {
      title: "Gestionar usuarios",
      description: "Administra accesos básicos del piloto.",
      href: "/dashboard/users",
      icon: Users,
      enabled: canAccessRoute("/dashboard/users"),
    },
  ].filter((item) => item.enabled);

  const recentDocuments = recentDocs?.data ?? [];

  return (
    <div className="space-y-8 p-2 md:p-4">
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Panel principal</h1>
          <Badge variant="outline">{resolvedRoleName || "Sin rol"}</Badge>
        </div>
        <p className="text-muted-foreground">
          {institutionName}
          {schoolYearName ? ` · ${schoolYearName}` : ""}
        </p>
        <p className="text-sm text-muted-foreground">
          Este piloto está enfocado en registro, consulta, búsqueda y trazabilidad documental para el área de secretaría.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total de documentos</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{stats?.totalDocuments ?? 0}</div>}
            <p className="text-xs text-muted-foreground mt-1">Documentos registrados en el sistema.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Almacenamiento</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{formatBytes(stats?.totalSizeMB ?? 0)}</div>}
            <p className="text-xs text-muted-foreground mt-1">Tamaño acumulado de archivos documentales.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Objetivo del piloto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm font-medium">Documentos físicos y digitales</div>
            <p className="text-xs text-muted-foreground">
              El sistema prioriza control de acceso, búsqueda y trazabilidad básica.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Accesos rápidos</CardTitle>
            <CardDescription>Funciones principales del piloto de tesis.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <div className="rounded-lg border p-4 transition-colors hover:bg-muted/50">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="font-medium">{action.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flujo recomendado</CardTitle>
            <CardDescription>Recorrido base para la operación y la demostración.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <PlusCircle className="mt-0.5 h-4 w-4 text-primary" />
              <span>Registrar documento con metadatos principales.</span>
            </div>
            <div className="flex items-start gap-3">
              <FolderOpen className="mt-0.5 h-4 w-4 text-primary" />
              <span>Asociar archivo digital y ubicación física si aplica.</span>
            </div>
            <div className="flex items-start gap-3">
              <FileSearch className="mt-0.5 h-4 w-4 text-primary" />
              <span>Buscar, consultar detalle y revisar trazabilidad.</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Documentos recientes</CardTitle>
              <CardDescription>Últimos registros visibles para tu rol.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/documents">Ver todos</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : recentDocuments.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No hay documentos recientes para mostrar.
              </div>
            ) : (
              <div className="space-y-3">
                {recentDocuments.map((document) => (
                  <Link key={document.id} href={`/dashboard/documents/${document.id}`}>
                    <div className="rounded-lg border p-4 transition-colors hover:bg-muted/50">
                      <div className="font-medium">
                        {document.versions?.[0]?.filename ?? document.description ?? `Documento #${document.id}`}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {document.description || "Sin descripción registrada"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
