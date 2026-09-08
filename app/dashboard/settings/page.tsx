"use client";

import ProtectedRoute from "@/guards/ProtectedRoute";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  Building2,
  CalendarDays,
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
import { SchoolYearForm } from "@/components/settings/SchoolYearForm";
import { AppearanceForm } from "@/components/settings/AppearanceForm";
import { DocumentSettingsForm } from "@/components/settings/DocumentSettingsForm";
import { NotificationsForm } from "@/components/settings/NotificationsForm";
import { SecurityForm } from "@/components/settings/SecurityForm";
import WorkflowAdministration from "@/components/workflows/WorkflowAdministration";
import { usePermissions } from "@/hooks/use-permissions";
import { UserRole } from "@/lib/types";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  { value: "schoolYear", label: "Año lectivo", description: "Período académico de la institución", icon: CalendarDays },
  { value: "appearance", label: "Apariencia", description: "Colores y preferencias visuales", icon: Palette },
  { value: "documents", label: "Documentos", description: "Opciones generales de documentos", icon: FileText },
  { value: "notifications", label: "Notificaciones", description: "Preferencias de avisos del sistema", icon: Bell },
  { value: "security", label: "Seguridad", description: "Configuración de seguridad", icon: ShieldCheck },
  { value: "my-account", label: "Mi cuenta", description: "Administra tus datos y contraseña", icon: UserRound, href: "/dashboard/mi-cuenta" },
  { value: "users", label: "Usuarios", description: "Administra los usuarios del sistema", icon: Users, permissions: ["users.manage", "roles.manage"] },
  { value: "categories", label: "Categorías", description: "Organiza los documentos por categorías", icon: FolderKanban, permissions: ["categories.manage"] },
  { value: "document-types", label: "Tipos de documento", description: "Administra los tipos de documento", icon: Tags, permissions: ["document-types.manage"] },
  { value: "templates", label: "Plantillas", description: "Crea y gestiona plantillas", icon: FileType, permissions: ["templates.manage"] },
  { value: "roles", label: "Roles", description: "Administra roles y permisos", icon: UserRound, permissions: ["roles.manage"] },
  { value: "workflows", label: "Flujos de trabajo", description: "Administra definiciones y versiones de flujos", icon: GitBranch, permissions: ["workflow.templates.manage"] },
  { value: "academic-years", label: "Años lectivos", description: "Administra los años lectivos", icon: GraduationCap, href: "/dashboard/academic-years", roles: [UserRole.ADMIN, UserRole.RECTOR] },
];

function SettingsContent() {
  const { isLoading } = useSettings();
  const section = useSearchParams().get("section");
  const { hasPermission, hasRole } = usePermissions();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const centralized: Record<string, React.ReactNode> = {
    institution: <InstitutionForm />,
    schoolYear: <SchoolYearForm />,
    appearance: <AppearanceForm />,
    documents: <DocumentSettingsForm />,
    notifications: <NotificationsForm />,
    security: <SecurityForm />,
    workflows: <WorkflowAdministration />,
  };
  if (hasPermission("users.manage") || hasPermission("roles.manage")) centralized.users = <UsersManagementPage />;
  if (hasPermission("categories.manage")) centralized.categories = <CategoriesPage />;
  if (hasPermission("document-types.manage")) centralized["document-types"] = <DocumentTypesPage />;
  if (hasPermission("templates.manage")) centralized.templates = <TemplatesPage />;
  if (hasPermission("roles.manage")) centralized.roles = <RolesManagement />;
  if (section && centralized[section]) {
    return <div className="p-6">{centralized[section]}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
        <p className="text-sm text-gray-500 mt-1">
          Administra los parámetros generales de la plataforma
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {SETTINGS_CATEGORIES.filter(({ permissions, roles }) =>
          (!permissions || permissions.some(hasPermission)) &&
          (!roles || roles.some((role) => hasRole(role)))
        ).map(({ value, label, description, icon: Icon, href }) => (
          <Link
            key={value}
            href={href ?? `/dashboard/settings?section=${value}`}
            className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="h-full transition-colors group-hover:border-primary group-hover:bg-accent/40">
              <CardHeader className="p-3">
                <Icon className="h-5 w-5 text-primary" />
                <CardTitle className="mt-1 text-sm">{label}</CardTitle>
                <CardDescription className="line-clamp-2 text-xs">{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute requiredPermissions={["users.manage", "categories.manage", "document-types.manage", "templates.manage", "roles.manage", "workflow.templates.manage"]}>
      <SettingsContent />
    </ProtectedRoute>
  );
}
