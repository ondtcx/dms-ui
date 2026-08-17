"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useSettings } from "@/lib/contexts/SettingsContext";
import { useQuery } from "@tanstack/react-query";
import { documentsService } from "@/lib/services/documents.service";
import { RoleGuard } from "@/guards/RoleGuard";
import { UserRole } from "@/lib/types";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  FileText,
  Users,
  Settings,
  ArrowRight,
  Sparkles,
  CalendarDays,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ─── helpers ───────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "¡Buenos días";
  if (h < 19) return "¡Buenas tardes";
  return "¡Buenas noches";
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: "Administrador",
    rector: "Rector",
    vicerrector: "Vicerrector",
    coordinador: "Coordinador",
    profesor: "Profesor",
    secretario: "Secretario",
    padre: "Padre/Tutor",
    estudiante: "Estudiante",
    moderador: "Moderador",
    user: "Usuario",
  };
  return labels[role] ?? role;
}

function roleBadgeVariant(
  role: string
): "default" | "secondary" | "destructive" | "outline" {
  if (role === "admin" || role === "rector" || role === "vicerrector") return "destructive";
  if (role === "coordinador" || role === "moderador") return "default";
  return "secondary";
}

function formatBytes(mb: string | number) {
  const n = typeof mb === "string" ? parseFloat(mb) : mb;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} GB`;
  return `${n} MB`;
}

function workflowStatusBadge(status?: string) {
  if (!status) return null;
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    PENDING: { label: "Pendiente", variant: "outline" },
    IN_PROGRESS: { label: "En curso", variant: "default" },
    APPROVED: { label: "Aprobado", variant: "secondary" },
    REJECTED: { label: "Rechazado", variant: "destructive" },
    CANCELLED: { label: "Cancelado", variant: "outline" },
  };
  const entry = map[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

// ─── stat card ──────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: React.ReactNode;
  loading?: boolean;
  href?: string;
  highlight?: boolean;
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  loading,
  href,
  highlight,
}: StatCardProps) {
  const content = (
    <Card
      className={
        highlight
          ? "border-orange-300 bg-orange-50 dark:bg-orange-950/20"
          : undefined
      }
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// ─── page ───────────────────────────────────────────────────────────────────

export default function DashboardHomePage() {
  const { user } = useAuth();
  const { settings } = useSettings();

  const institutionName = settings?.institution?.name;
  const schoolYearName = settings?.schoolYear?.isActive ? settings.schoolYear.name : null;
  const contextSubtitle = [institutionName, schoolYearName].filter(Boolean).join(" · ");

  // ── queries ──
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: () => documentsService.getStats(),
  });

  const { data: recentDocs, isLoading: recentLoading } = useQuery({
    queryKey: ["documents", "recent"],
    queryFn: () => documentsService.getAll({ limit: 5, page: 1 }),
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* ── Bienvenida ── */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          {getGreeting()}, {user?.name}!
        </h1>
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground">
            Bienvenido a tu panel de gestión de documentos
          </p>
          <Badge variant={roleBadgeVariant(user?.role ?? "")}>
            {roleLabel(user?.role ?? "")}
          </Badge>
        </div>
        {contextSubtitle && (
          <p className="text-sm text-muted-foreground">{contextSubtitle}</p>
        )}
      </div>

      {/* ── KPI cards ── */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Resumen general</h2>
        <div className="grid gap-4">
          <StatCard
            title="Total documentos"
            value={stats?.totalDocuments ?? 0}
            subtitle={`${formatBytes(stats?.totalSizeMB ?? "0.00")} usados`}
            icon={<FileText className="h-4 w-4" />}
            loading={statsLoading}
            href="/dashboard/documents"
          />
        </div>
      </div>

      {/* ── Main content: actividad reciente ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Actividad reciente</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/documents">
              Ver todos
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <Card>
          {recentLoading ? (
            <CardContent className="pt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </CardContent>
          ) : !recentDocs?.data.length ? (
            <CardContent className="pt-6 pb-6 text-center text-muted-foreground text-sm">
              No hay documentos todavía.{" "}
              <Link
                href="/dashboard/documents"
                className="underline underline-offset-2"
              >
                Sube el primero
              </Link>
            </CardContent>
          ) : (
            <div className="divide-y">
              {recentDocs.data.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  {/* Icono */}
                  <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-md shrink-0">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {((doc?.versions?.[0]?.filename) ?? '')}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {doc.uploadedBy.name}
                      {doc.category && (
                        <>
                          {" · "}
                          <span>{doc.category.name}</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Estado workflow */}
                  <div className="shrink-0">
                    {doc.workflow
                      ? workflowStatusBadge(doc.workflow.status)
                      : null}
                  </div>

                  {/* Fecha */}
                  <p className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                    {formatDistanceToNow(new Date(doc.createdAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Acceso rápido ── */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Acceso rápido</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink
            href="/dashboard/documents"
            icon={<FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
            iconBg="bg-blue-100 dark:bg-blue-900"
            title="Documentos"
            desc="Ver y gestionar"
          />
          <QuickLink
            href="/dashboard/templates"
            icon={<Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
            iconBg="bg-amber-100 dark:bg-amber-900"
            title="Plantillas"
            desc="Generar documentos"
          />
          <QuickLink
            href="/dashboard/calendar"
            icon={<CalendarDays className="h-5 w-5 text-green-600 dark:text-green-400" />}
            iconBg="bg-green-100 dark:bg-green-900"
            title="Calendario"
            desc="Vista por fecha"
          />
        </div>
      </div>

      {/* ── Panel Admin ── */}
      <RoleGuard roles={[UserRole.ADMIN, UserRole.RECTOR]}>
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full shrink-0">
                <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-0.5">
                  Panel de gestión
                </h3>
                <p className="text-blue-700 dark:text-blue-300 text-sm mb-3">
                  Acceso a configuración avanzada y reportes del sistema.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="default" size="sm">
                    <Link href="/dashboard/users">
                      <Users className="mr-1.5 h-3.5 w-3.5" />
                      Usuarios
                    </Link>
                  </Button>
                  <RoleGuard roles={[UserRole.ADMIN]}>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/dashboard/settings">
                        <Settings className="mr-1.5 h-3.5 w-3.5" />
                        Configuración
                      </Link>
                    </Button>
                  </RoleGuard>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </RoleGuard>
    </div>
  );
}

// ─── quick link card ────────────────────────────────────────────────────────

function QuickLink({
  href,
  icon,
  iconBg,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className={`${iconBg} p-2.5 rounded-lg shrink-0`}>{icon}</div>
            <div className="min-w-0">
              <p className="font-medium text-sm">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
