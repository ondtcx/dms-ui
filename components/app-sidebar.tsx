"use client";

import { displayRoleName } from "@/lib/auth/normalizers";
import { useAuth } from "@/lib/contexts/AuthContext";
import { usePermissions } from "@/hooks/use-permissions";
import { useSettings } from "@/lib/contexts/SettingsContext";
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
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Archive,
  Home,
  Users,
  LogOut,
  FolderKanban,
  Layers,
  Building2,
  GraduationCap,
  Tags,
  PlusCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";

export interface MenuItem {
  title: string;
  icon: LucideIcon;
  url: string;
  route?: string;
  isActive?: boolean;
  items?: MenuItem[];
}

export const mainMenuItems: MenuItem[] = [
  {
    title: "Dashboard",
    icon: Home,
    url: "/dashboard/home",
    isActive: true,
  },
  {
    title: "Registro documental",
    icon: PlusCircle,
    url: "/dashboard/document-registration",
    route: "/dashboard/documents",
  },
  {
    title: "Archivo y consulta",
    icon: Archive,
    url: "/dashboard/documents",
  },
];

export const adminMenuItems: MenuItem[] = [
  {
    title: "Usuarios",
    icon: Users,
    url: "/dashboard/users",
  },
  {
    title: "Categorias",
    icon: FolderKanban,
    url: "/dashboard/categories",
  },
  {
    title: "Subtipos de Documento",
    icon: Tags,
    url: "/dashboard/document-types",
  },
  {
    title: "Años Lectivos",
    icon: GraduationCap,
    url: "/dashboard/academic-years",
  },
  {
    title: "Departamentos",
    icon: Building2,
    url: "/dashboard/departments",
  },
  {
    title: "Secciones",
    icon: Layers,
    url: "/dashboard/sections",
  },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { canAccessRoute } = usePermissions();
  const pathname = usePathname();
  const { settings } = useSettings();

  const filterItems = (items: MenuItem[]): MenuItem[] => {
    return items.reduce<MenuItem[]>((acc, item) => {
      const visibleChildren = item.items ? filterItems(item.items) : undefined;

      if (!canAccessRoute(item.route ?? item.url)) {
        return acc;
      }

      acc.push({ ...item, items: visibleChildren });
      return acc;
    }, []);
  };

  const visibleMainMenuItems = filterItems(mainMenuItems);
  const visibleAdminMenuItems = filterItems(adminMenuItems);

  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ?? "";
  const logoUrl = settings?.institution?.logoPath
    ? `${apiBase}${settings.institution.logoPath}`
    : null;
  const institutionName = settings?.institution?.name ?? "DMS";

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
              {visibleMainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url} className="flex items-center w-full">
                      <item.icon className="h-4 w-4 mr-2 shrink-0" />
                      <span className="flex-1 truncate">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Menu de Administracion */}
        {visibleAdminMenuItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administracion</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAdminMenuItems.map((item) => {
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

      {/* Footer - Selector de año lectivo + informacion del usuario */}
      <SidebarFooter className="border-t p-4">
        {/* <div className="pb-2">
          <AcademicYearSelector />
        </div> */}
        <div className="flex flex-col gap-2">
          <div className="text-sm">
            <div className="font-medium">{user?.name}</div>
            <div className="text-xs text-muted-foreground">{user?.email}</div>
            <div className="mt-1">
              <span
                className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
              >
                {displayRoleName(user ?? {})}
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
