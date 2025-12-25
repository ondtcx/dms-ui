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
import { Home, FileText, Users, Settings, LogOut, FileType, FolderKanban } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@/lib/types";
import { LucideIcon } from "lucide-react";

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

  const menuItems: MenuItem[] = [
    {
      title: "Home",
      icon: Home,
      url: "/dashboard",
    },
    {
      title: "Documentos",
      icon: FileText,
      url: "/dashboard/documents",
    },
    {
      title: "Plantillas",
      icon: FileType,
      url: "/dashboard/templates",
    },
    {
      title: "Categorías",
      icon: FolderKanban,
      url: "/dashboard/categories",
      requiredRole: UserRole.ADMIN, // ✅ Solo ADMIN
    },
    {
      title: "Usuarios",
      icon: Users,
      url: "/dashboard/users",
      requiredRole: UserRole.ADMIN, // ✅ Solo ADMIN
    },
    {
      title: "Configuración",
      icon: Settings,
      url: "/dashboard/settings",
      requiredRole: UserRole.ADMIN, // ✅ Solo ADMIN
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
            <SidebarGroup>
              <SidebarGroupLabel>Navegación</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => {
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

        {/* Main Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </SidebarProvider>
  );
}
