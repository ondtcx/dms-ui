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
  Settings,
  Trash2,
  Calendar,
  Minus,
  Plus,
  Building2,
  Archive,
  Folder,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@/lib/types";
import { documentsService, directoryQueryKeys } from "@/lib/services/documents.service";
import { mergeDirectoryNavigation } from "@/lib/sidebar-nav";
import { LucideIcon } from "lucide-react";
import { filterAuthorizedNavItems, isNavItemActive } from "@/lib/sidebar-nav";

export interface MenuItem {
  title: string;
  icon: LucideIcon;
  url: string;
  isActive?: boolean;
  items?: MenuItem[];
  requiredRole?: UserRole;
  requiredRoles?: UserRole[];
  requiredPermission?: string;
  requiredPermissions?: string[];
  activationPaths?: string[];
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

export const adminMenuItems: MenuItem[] = [
  {
    title: "Configuración",
    icon: Settings,
    url: "/dashboard/settings",
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
  const { hasRole, hasAnyRole, hasPermission, hasAnyPermission } = usePermissions();
  const pathname = usePathname();
  const { settings } = useSettings();
  const directorySummary = useQuery({
    queryKey: directoryQueryKeys.summary,
    queryFn: documentsService.getDirectoryNavigationSummary,
    enabled: Boolean(user),
    staleTime: 60_000,
  });

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
  const highlightedDirectories = mergeDirectoryNavigation(
    directorySummary.data?.recent,
    directorySummary.data?.mostUsed,
  );

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
    if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
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
                          isActive={isNavItemActive(item, pathname)}
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
                                isActive={isNavItemActive(subItem, pathname)}
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
                      isActive={isNavItemActive(item, pathname)}
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
              <Collapsible
                defaultOpen={isNavItemActive({ url: "/dashboard/directories", items: [{}] }, pathname)}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={isNavItemActive({ url: "/dashboard/directories", items: [{}] }, pathname)}
                      tooltip="Directorios"
                      className="data-[active=true]:border-sidebar-primary data-[active=true]:border-l-2 data-[active=true]:pl-[6px]!"
                    >
                      <Folder className="h-4 w-4 mr-2" />
                      Directorios
                      <Plus className="ml-auto group-data-[state=open]/collapsible:hidden" />
                      <Minus className="ml-auto group-data-[state=closed]/collapsible:hidden" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {directorySummary.isLoading ? (
                        <SidebarMenuSubItem><span className="px-2 text-xs text-muted-foreground">Cargando...</span></SidebarMenuSubItem>
                      ) : directorySummary.isError ? (
                        <SidebarMenuSubItem>
                          <button
                            type="button"
                            className="px-2 text-left text-xs text-destructive hover:underline"
                            onClick={() => directorySummary.refetch()}
                          >
                            No se pudieron cargar. Reintentar
                          </button>
                        </SidebarMenuSubItem>
                      ) : highlightedDirectories.length === 0 ? (
                        <SidebarMenuSubItem><span className="px-2 text-xs text-muted-foreground">Sin directorios recientes</span></SidebarMenuSubItem>
                      ) : highlightedDirectories.map((directory) => (
                        <SidebarMenuSubItem key={directory.id}>
                          <SidebarMenuSubButton asChild isActive={false}>
                            <Link href={`/dashboard/documents?directoryId=${directory.id}`} title={directory.name}>
                              <Folder className="h-4 w-4" />
                              <span>{directory.name}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isNavItemActive({ url: "/dashboard/directories" }, pathname)}>
                          <Link href="/dashboard/directories"><Folder className="h-4 w-4" /><span>Todos</span></Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isNavItemActive({ url: "/dashboard/directories/new" }, pathname)}>
                          <Link href="/dashboard/directories/new"><Plus className="h-4 w-4" /><span>Crear nuevo</span></Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Menu de Administracion */}
        {(hasAnyPermission([
          "users.manage",
          "categories.manage",
          "document-types.manage",
          "templates.manage",
          "roles.manage",
        ]) || hasAnyRole([UserRole.ADMIN, UserRole.RECTOR, UserRole.VICERRECTOR, UserRole.COORDINADOR])) && (
          <SidebarGroup>
            <SidebarGroupLabel>Administracion</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filterAuthorizedNavItems(adminMenuItems, new Set(
                  ["users.manage", "categories.manage", "document-types.manage", "templates.manage", "roles.manage"].filter(hasPermission),
                )).map((item) => {
                  const visibleSubItems = item.items?.filter(shouldShowMenuItem) ?? [];

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
                        defaultOpen={isNavItemActive(item, pathname)}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              isActive={isNavItemActive(item, pathname)}
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
                                    isActive={isNavItemActive(subItem, pathname)}
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
                        isActive={isNavItemActive(item, pathname)}
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
            <DropdownMenuItem onClick={logout}>Cerrar Sesión</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
