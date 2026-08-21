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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  FileText,
  Users,
  Settings,
  FolderKanban,
  Trash2,
  FileType,
  Calendar,
  Minus,
  Plus,
  Building2,
  Archive,
  GraduationCap,
  Tags,
  UserRound,
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
    title: "Calendario",
    icon: Calendar,
    url: "/dashboard/calendar",
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

export const accountMenuItems: MenuItem[] = [
  {
    title: "Mi Cuenta",
    icon: UserRound,
    url: "/dashboard/mi-cuenta",
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
    title: "Categorias",
    icon: FolderKanban,
    url: "/dashboard/categories",
    requiredRole: UserRole.ADMIN,
  },
  {
    title: "Tipos de Documento",
    icon: Tags,
    url: "/dashboard/document-types",
    requiredRole: UserRole.ADMIN,
  },
  {
    title: "Plantillas",
    icon: FileType,
    url: "/dashboard/templates",
    requiredRole: UserRole.ADMIN,
  },
  {
    title: "Configuracion",
    icon: Settings,
    url: "/dashboard/settings",
    requiredRole: UserRole.ADMIN,
    items: [
      {
        title: "Años Lectivos",
        icon: GraduationCap,
        url: "/dashboard/academic-years",
        requiredRoles: [UserRole.ADMIN, UserRole.RECTOR],
      },
    ],
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
  const userInitials = (user?.name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0])
    .join("")
    .toUpperCase() || "US";

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
    <Sidebar collapsible="icon">
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
                        <SidebarMenuButton
                          isActive={pathname.startsWith(item.url + "/")}
                          tooltip={item.title}
                          className="data-[active=true]:border-sidebar-primary data-[active=true]:border-l-2 data-[active=true]:pl-[6px]!"
                        >
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
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      tooltip={item.title}
                      className="data-[active=true]:border-sidebar-primary data-[active=true]:border-l-2 data-[active=true]:pl-[6px]!"
                    >
                      <Link
                        href={item.url}
                        className="flex items-center w-full"
                      >
                        <item.icon className="h-4 w-4 mr-2 shrink-0" />
                        <span className="flex-1 truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ),
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Menu de Cuenta */}
        <SidebarGroup>
          <SidebarGroupLabel>Cuenta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className="data-[active=true]:border-sidebar-primary data-[active=true]:border-l-2 data-[active=true]:pl-[6px]!"
                  >
                    <Link href={item.url} className="flex items-center">
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.title}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
            UserRole.RECTOR,
            UserRole.VICERRECTOR,
            UserRole.COORDINADOR,
          ],
        }) && (
          <SidebarGroup>
            <SidebarGroupLabel>Administracion</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => {
                  const visibleSubItems =
                    item.items?.filter(shouldShowMenuItem) ?? [];

                  if (item.items && visibleSubItems.length === 0) {
                    return null;
                  }
                  if (!item.items && !shouldShowMenuItem(item)) {
                    return null;
                  }

                  if (item.items) {
                    return (
                      <Collapsible
                        key={item.title}
                        defaultOpen={pathname.startsWith(item.url + "/")}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              isActive={pathname.startsWith(item.url + "/")}
                              tooltip={item.title}
                              className="data-[active=true]:border-sidebar-primary data-[active=true]:border-l-2 data-[active=true]:pl-[6px]!"
                            >
                              {item.icon && (
                                <item.icon className="h-4 w-4 mr-2" />
                              )}
                              {item.title}
                              <Plus className="ml-auto group-data-[state=open]/collapsible:hidden" />
                              <Minus className="ml-auto group-data-[state=closed]/collapsible:hidden" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {visibleSubItems.map((subItem) => (
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
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                        tooltip={item.title}
                        className="data-[active=true]:border-sidebar-primary data-[active=true]:border-l-2 data-[active=true]:pl-[6px]!"
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Abrir menú de cuenta"
              className="flex w-full items-center justify-center rounded-md p-1 outline-hidden transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:p-0"
            >
              <Avatar>
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div>{user?.name ?? "Usuario"}</div>
              <span
                className={`mt-1 inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${getRoleBadgeColor(
                  user?.role || "",
                )}`}
              >
                {user?.role?.toUpperCase() ?? "USUARIO"}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/mi-cuenta">Mi Cuenta</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout}>Cerrar Sesión</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
