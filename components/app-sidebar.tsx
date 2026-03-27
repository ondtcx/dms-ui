"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { usePermissions } from "@/hooks/use-permissions";
import { useSettings } from "@/lib/contexts/SettingsContext";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Home,
  FileText,
  Users,
  Settings,
  LogOut,
  FolderKanban,
  Layers,
  Trash2,
  FileType,
  CheckCircle2,
  BarChart3,
  Calendar,
  Send,
  Inbox,
  Minus,
  Plus,
  PlusCircle,
  Building2,
  Archive,
  Share2,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@/lib/types";
import { LucideIcon } from "lucide-react";

export interface MenuItem {
  title: string;
  icon: LucideIcon;
  url: string;
  isActive?: boolean;
  items?: MenuItem[];
  requiredRole?: UserRole;
  requiredRoles?: UserRole[];
}

export const mainMenuItems: MenuItem[] = [
  {
    title: "Dashboard",
    icon: Home,
    url: "/dashboard",
    isActive: true,
  },
  {
    title: "Documentos",
    icon: FileText,
    url: "/dashboard/documents",
  },
  // TODO: Transfers feature is not yet defined — keep disabled until requirements are confirmed
  /* {
    title: "Transferencias",
    icon: FolderKanban,
    url: "/dashboard/transfers",
    items: [
      {
        title: "Nueva Transferencia",
        icon: PlusCircle,
        url: "/dashboard/transfers/new-transfer",
      },
      {
        title: "Enviados",
        icon: Send,
        url: "/dashboard/transfers/sent",
      },
      {
        title: "Recibidos",
        icon: Inbox,
        url: "/dashboard/transfers/received",
      },
    ],
  }, */
  {
    title: "Compartidos",
    icon: Share2,
    url: "/dashboard/shares",
  },
  {
    title: "Calendario",
    icon: Calendar,
    url: "/dashboard/calendar",
  },
  {
    // Hidden from PROFESOR — they use "Mis Solicitudes" instead for a simpler experience
    title: "Workflows",
    icon: CheckCircle2,
    url: "/dashboard/workflows",
    requiredRoles: [
      UserRole.ADMIN,
      UserRole.DIRECTOR,
      UserRole.VICERRECTOR,
      UserRole.COORDINADOR,
      UserRole.SECRETARIO,
      UserRole.MODERADOR,
    ],
  },
  {
    // Simplified requests section — visible only to PROFESOR and SECRETARIO
    title: "Mis Solicitudes",
    icon: ClipboardList,
    url: "/dashboard/requests",
    requiredRoles: [UserRole.PROFESOR, UserRole.SECRETARIO],
    items: [
      {
        title: "Nueva Solicitud",
        icon: PlusCircle,
        url: "/dashboard/requests/new",
      },
      {
        title: "Mis Solicitudes",
        icon: FileText,
        url: "/dashboard/requests",
      },
    ],
  },
  {
    title: "Papelera",
    icon: Trash2,
    url: "/dashboard/trash",
  },
  {
    title: "Archivo",
    icon: Archive,
    url: "/dashboard/archive",
  },
];

export const adminMenuItems: MenuItem[] = [
  {
    title: "Usuarios",
    icon: Users,
    url: "/dashboard/users",
    requiredRole: UserRole.ADMIN,
  },
  {
    title: "Departamentos",
    icon: Building2,
    url: "/dashboard/departments",
    requiredRoles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.VICERRECTOR],
  },
  {
    title: "Secciones",
    icon: Layers,
    url: "/dashboard/sections",
    requiredRole: UserRole.ADMIN,
  },
  {
    title: "Categorias",
    icon: FolderKanban,
    url: "/dashboard/categories",
    requiredRole: UserRole.ADMIN,
  },
  {
    title: "Plantillas",
    icon: FileType,
    url: "/dashboard/templates",
    requiredRole: UserRole.ADMIN,
  },
  {
    title: "Reportes",
    icon: BarChart3,
    url: "/dashboard/reports",
    requiredRoles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.VICERRECTOR, UserRole.COORDINADOR],
  },
  {
    title: "Configuracion",
    icon: Settings,
    url: "/dashboard/settings",
    requiredRole: UserRole.ADMIN,
  },
];

function getRoleBadgeColor(role: string) {
  switch (role) {
    case "admin":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "moderator":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
}

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { hasRole, hasAnyRole } = usePermissions();
  const pathname = usePathname();
  const { settings } = useSettings();

  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ?? "";
  const logoUrl = settings?.institution?.logoPath
    ? `${apiBase}${settings.institution.logoPath}`
    : null;
  const institutionName = settings?.institution?.name ?? "DMS";

  const shouldShowMenuItem = (item: MenuItem): boolean => {
    if (!item.requiredRole && !item.requiredRoles) {
      return true;
    }
    if (item.requiredRole && !hasRole(item.requiredRole)) {
      return false;
    }
    if (item.requiredRoles && !hasAnyRole(item.requiredRoles)) {
      return false;
    }
    return true;
  };

  return (
    <Sidebar>
      {/* Header */}
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={institutionName}
              className="h-8 w-8 object-contain rounded shrink-0"
            />
          ) : (
            <Building2 className="h-6 w-6 shrink-0" />
          )}
          <span className="font-semibold truncate">{institutionName}</span>
        </div>
      </SidebarHeader>

      {/* Content - Menu de navegacion */}
      <SidebarContent>
        {/* Menu Principal */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.filter(shouldShowMenuItem).map((item, index) =>
                item.items?.length ? (
                  <Collapsible
                    key={item.title}
                    defaultOpen={index === 1}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          {item.icon && <item.icon className="h-4 w-4 mr-2" />}
                          {item.title}{" "}
                          <Plus className="ml-auto group-data-[state=open]/collapsible:hidden" />
                          <Minus className="ml-auto group-data-[state=closed]/collapsible:hidden" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === subItem.url}
                              >
                                <Link
                                  href={subItem.url}
                                  className="flex items-center"
                                >
                                  {subItem.icon && (
                                    <subItem.icon className="h-4 w-4 mr-2" />
                                  )}
                                  {subItem.title}
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url} className="flex items-center">
                        <item.icon className="h-4 w-4 mr-2" />
                        {item.title}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ),
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Menu de Administracion */}
        {shouldShowMenuItem({
          title: "",
          icon: Home,
          url: "",
          requiredRoles: [
            UserRole.ADMIN,
            UserRole.DIRECTOR,
            UserRole.VICERRECTOR,
            UserRole.COORDINADOR,
          ],
        }) && (
          <SidebarGroup>
            <SidebarGroupLabel>Administracion</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => {
                  if (!shouldShowMenuItem(item)) {
                    return null;
                  }

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                      >
                        <Link href={item.url} className="flex items-center">
                          <item.icon className="h-4 w-4 mr-2" />
                          {item.title}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer - Informacion del usuario */}
      <SidebarFooter className="border-t p-4">
        <div className="flex flex-col gap-2">
          <div className="text-sm">
            <div className="font-medium">{user?.name}</div>
            <div className="text-xs text-muted-foreground">{user?.email}</div>
            <div className="mt-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(
                  user?.role || "",
                )}`}
              >
                {user?.role?.toUpperCase()}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar Sesion</span>
          </button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
