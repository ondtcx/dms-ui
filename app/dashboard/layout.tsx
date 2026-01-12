// src/app/dashboard/layout.tsx
"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { usePermissions } from "@/hooks/use-permissions";
import {
  SidebarProvider,
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
} from "@/components/ui/sidebar";
import {
  Home,
  FileText,
  Users,
  Settings,
  LogOut,
  FolderKanban,
  Trash2,
  FileType,
  Share2,
  CheckCircle2,
  BarChart3,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@/lib/types";
import { LucideIcon } from "lucide-react";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";

interface MenuItem {
  title: string;
  icon: LucideIcon;
  url: string;
  requiredRole?: UserRole;
  requiredRoles?: UserRole[];
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const { hasRole, hasAnyRole } = usePermissions();
  const pathname = usePathname();

  const mainMenuItems: MenuItem[] = [
    {
      title: "Dashboard",
      icon: Home,
      url: "/dashboard",
    },
    {
      title: "Documentos",
      icon: FileText,
      url: "/dashboard/documents",
    },
    {
      title: "Calendario",
      icon: Calendar,
      url: "/dashboard/calendar",
    },
    {
      title: "Compartidos",
      icon: Share2,
      url: "/dashboard/shares",
    },
    {
      title: "Aprobaciones",
      icon: CheckCircle2,
      url: "/dashboard/workflows",
    },
    {
      title: "Papelera",
      icon: Trash2,
      url: "/dashboard/trash",
    },
  ];

  const adminMenuItems: MenuItem[] = [
    {
      title: "Usuarios",
      icon: Users,
      url: "/dashboard/users",
      requiredRole: UserRole.ADMIN,
    },
    {
      title: "Categorías",
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
      requiredRoles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.COORDINADOR],
    },
    {
      title: "Configuración",
      icon: Settings,
      url: "/dashboard/settings",
      requiredRole: UserRole.ADMIN,
    },
  ];

  // Función para verificar si debe mostrar un item del menú
  const shouldShowMenuItem = (item: MenuItem): boolean => {
    // Si no tiene requisitos de rol, mostrar siempre
    if (!item.requiredRole && !item.requiredRoles) {
      return true;
    }

    // Verificar rol único
    if (item.requiredRole && !hasRole(item.requiredRole)) {
      return false;
    }

    // Verificar múltiples roles
    if (item.requiredRoles && !hasAnyRole(item.requiredRoles)) {
      return false;
    }

    return true;
  };

  // Función para obtener el color del badge según el rol
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "moderator":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          {/* Header */}
          <SidebarHeader className="border-b p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              <span className="font-semibold">DMS</span>
            </div>
          </SidebarHeader>

          {/* Content - Menú de navegación */}
          <SidebarContent>
            {/* Menú Principal */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {mainMenuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                      >
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Menú de Administración */}
            <SidebarGroup>
              <SidebarGroupLabel>Administración</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminMenuItems.map((item) => {
                    // ✅ Solo mostrar si tiene permisos
                    if (!shouldShowMenuItem(item)) {
                      return null;
                    }

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.url}
                        >
                          <Link href={item.url}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          {/* Footer - Información del usuario */}
          <SidebarFooter className="border-t p-4">
            <div className="flex flex-col gap-2">
              <div className="text-sm">
                <div className="font-medium">{user?.name}</div>
                <div className="text-xs text-muted-foreground">
                  {user?.email}
                </div>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(
                      user?.role || ""
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
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content with Header */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="border-b bg-background sticky top-0 z-40">
            <div className="flex h-16 items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold">
                  {pathname === "/dashboard" && "Dashboard"}
                  {pathname === "/dashboard/documents" && "Documentos"}
                  {pathname === "/dashboard/shares" && "Compartidos"}
                  {pathname === "/dashboard/workflows" && "Aprobaciones"}
                  {pathname === "/dashboard/trash" && "Papelera"}
                  {pathname === "/dashboard/users" && "Usuarios"}
                  {pathname === "/dashboard/categories" && "Categorías"}
                  {pathname === "/dashboard/templates" && "Plantillas"}
                  {pathname === "/dashboard/reports" && "Reportes"}
                  {pathname === "/dashboard/settings" && "Configuración"}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <NotificationsDropdown />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
