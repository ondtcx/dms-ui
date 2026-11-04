"use client";

import { Suspense } from "react";
import ProtectedRoute from "@/guards/ProtectedRoute";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeftRight,
  Bell,
  BookOpen,
  Building2,
  FileText,
  FileType,
  FolderKanban,
  GitBranch,
  GraduationCap,
  Palette,
  ShieldCheck,
  Tags,
  UserRound,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useSettings } from "@/lib/contexts/SettingsContext";
import { useSearchParams } from "next/navigation";
import UsersManagementPage from "@/app/dashboard/users/page";
import CategoriesPage from "@/app/dashboard/categories/page";
import DocumentTypesPage from "@/app/dashboard/document-types/page";
import TemplatesPage from "@/app/dashboard/templates/page";
import { RolesManagement } from "@/components/settings/RolesManagement";
import { InstitutionForm } from "@/components/settings/InstitutionForm";
import AcademicYearsPage from "@/app/dashboard/academic-years/page";
import { AppearanceForm } from "@/components/settings/AppearanceForm";
import { DocumentSettingsForm } from "@/components/settings/DocumentSettingsForm";
import { NotificationsForm } from "@/components/settings/NotificationsForm";
import { SecurityForm } from "@/components/settings/SecurityForm";
import WorkflowAdministration from "@/components/workflows/WorkflowAdministration";
import { WORKFLOW_CONFIGURABLE_ENABLED } from "@/lib/config/features";
import { usePermissions } from "@/hooks/use-permissions";
import { UserRole } from "@/lib/types";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SettingsCategory {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  permissions?: string[];
  roles?: UserRole[];
}

const SETTINGS_CATEGORIES: readonly SettingsCategory[] = [
  { value: "institution", label: "Institución", description: "Datos y logotipo de la institución", icon: Building2 },
  { value: "appearance", label: "Apariencia", description: "Colores y preferencias visuales", icon: Palette },
  { value: "documents", label: "Documentos", description: "Opciones generales de documentos", icon: FileText },
  { value: "transfers", label: "Transferencias", description: "Envía y recibe documentos entre usuarios", icon: ArrowLeftRight, href: "/dashboard/transfers" },
  { value: "authoring-templates", label: "Plantillas institucionales", description: "Biblioteca de plantillas versionadas y su diseño", icon: BookOpen, href: "/dashboard/elaboracion" },
  { value: "notifications", label: "Notificaciones", description: "Preferencias de avisos del sistema", icon: Bell },
  { value: "security", label: "Seguridad", description: "Configuración de seguridad", icon: ShieldCheck },
  { value: "my-account", label: "Mi cuenta", description: "Administra tus datos y contraseña", icon: UserRound, href: "/dashboard/mi-cuenta" },
  { value: "users", label: "Usuarios", description: "Administra los usuarios del sistema", icon: Users, permissions: ["users.manage", "roles.manage"] },
  { value: "categories", label: "Categorías", description: "Organiza los documentos por categorías", icon: FolderKanban, permissions: ["categories.manage"] },
  { value: "document-types", label: "Tipos de documento", description: "Administra los tipos de documento", icon: Tags, permissions: ["document-types.manage"] },
  { value: "templates", label: "Plantillas", description: "Crea y gestiona plantillas", icon: FileType, permissions: ["templates.manage"] },
  { value: "roles", label: "Roles", description: "Administra roles y permisos", icon: UserRound, permissions: ["roles.manage"] },
  ...(WORKFLOW_CONFIGURABLE_ENABLED ? [{ value: "workflows", label: "Flujos de trabajo", description: "Administra definiciones y versiones de flujos", icon: GitBranch, permissions: ["workflow.templates.manage"] }] : []),
  { value: "academic-years", label: "Años lectivos", description: "Administra los años lectivos", icon: GraduationCap, href: "/dashboard/academic-years", roles: [UserRole.ADMIN, UserRole.RECTOR] },
];

function settingsSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
}

const SETTINGS_GROUPS: readonly { label: string; values: readonly string[] }[] = [
  {
    label: "Institución",
    values: ["institution", "appearance", "security"],
  },
  {
    label: "Operación documental",
    values: [
      "documents",
      "transfers",
      "authoring-templates",
      "notifications",
      "academic-years",
      "categories",
      "document-types",
      "templates",
      "workflows",
    ],
  },
  {
    label: "Accesos",
    values: ["users", "roles"],
  },
  {
    label: "Mi cuenta",
    values: ["my-account"],
  },
];

function SettingsContent() {
  const { isLoading } = useSettings();
  const section = useSearchParams().get("section");
  const { hasPermission, hasRole } = usePermissions();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const centralized: Record<string, React.ReactNode> = {
    institution: <InstitutionForm />,
    appearance: <AppearanceForm />,
    documents: <DocumentSettingsForm />,
    notifications: <NotificationsForm />,
    security: <SecurityForm />,
    workflows: <WorkflowAdministration />,
  };
  if (hasPermission("users.manage") || hasPermission("roles.manage"))
    centralized.users = <UsersManagementPage />;
  if (hasPermission("categories.manage"))
    centralized.categories = <CategoriesPage />;
  if (hasPermission("document-types.manage"))
    centralized["document-types"] = <DocumentTypesPage />;
  if (hasPermission("templates.manage"))
    centralized.templates = <TemplatesPage />;
  if (hasPermission("roles.manage"))
    centralized.roles = <RolesManagement />;

  const canSee = ({ permissions, roles }: SettingsCategory) =>
    (!permissions || permissions.some(hasPermission)) &&
    (!roles || roles.some((role) => hasRole(role)));

  const visibleCategories = SETTINGS_CATEGORIES.filter(canSee);
  const visibleGroups = SETTINGS_GROUPS.map((group) => ({
    label: group.label,
    categories: group.values
      .map((value) =>
        visibleCategories.find((category) => category.value === value),
      )
      .filter((category): category is SettingsCategory => Boolean(category)),
  })).filter((group) => group.categories.length > 0);

  const activeCategory = section
    ? visibleCategories.find((category) => category.value === section)
    : undefined;

  if (section && centralized[section] && activeCategory) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/settings"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Volver a Configuración
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Configuración / {activeCategory.label}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeCategory.description}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <nav
            aria-label="Secciones de configuración"
            className="space-y-4 lg:sticky lg:top-20 lg:self-start"
          >
            {visibleGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <ul className="space-y-1">
                  {group.categories.map((category) => {
                    const Icon = category.icon;
                    const active = category.value === section;
                    return (
                      <li key={category.value}>
                        <Link
                          href={
                            category.href ??
                            `/dashboard/settings?section=${category.value}`
                          }
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                            active
                              ? "bg-muted font-medium text-foreground"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className="truncate">{category.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="min-w-0">{centralized[section]}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Configuración
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Administra los parámetros generales de la plataforma
        </p>
      </div>

      {visibleGroups.map((group) => (
        <section
          key={group.label}
          aria-labelledby={`settings-${settingsSlug(group.label)}`}
          className="space-y-3"
        >
          <h2
            id={`settings-${settingsSlug(group.label)}`}
            className="text-lg font-semibold"
          >
            {group.label}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {group.categories.map(
              ({ value, label, description, icon: Icon, href }) => (
                <Link
                  key={value}
                  href={href ?? `/dashboard/settings?section=${value}`}
                  className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="h-full transition-colors group-hover:border-primary group-hover:bg-accent/40">
                    <CardHeader className="p-3">
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle className="mt-1 text-sm">{label}</CardTitle>
                      <CardDescription className="line-clamp-2 text-xs">
                        {description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function SettingsSectionView() {
  const section = useSearchParams().get("section");
  if (section === "schoolYear" || section === "academic-years") {
    return <AcademicYearsPage />;
  }

  return (
    <ProtectedRoute requiredPermissions={["users.manage", "categories.manage", "document-types.manage", "templates.manage", "roles.manage", "workflow.templates.manage"]}>
      <SettingsContent />
    </ProtectedRoute>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <SettingsSectionView />
    </Suspense>
  );
}
