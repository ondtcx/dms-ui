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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Home,
  FileText,
  Settings,
  Clock3,
  FilePlus2,
  Trash2,
  Minus,
  Plus,
  Building2,
  Archive,
  Folder,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
    title: "Inicio",
    icon: Home,
    url: "/dashboard",
    isActive: true,
  },
  {
    title: "Documentos",
    icon: FileText,
    url: "/dashboard/documents",
    items: [
      {
        title: "Recientemente accedido",
        icon: Clock3,
        url: "/dashboard/documents?view=recent-accessed",
      },
      {
        title: "Recientemente creado",
        icon: FilePlus2,
        url: "/dashboard/documents?view=recent-created",
      },
      {
        title: "Todos los documentos",
        icon: FileText,
        url: "/dashboard/documents?view=all",
      },
      {
        title: "Papelera",
        icon: Trash2,
        url: "/dashboard/documents?view=trash",
      },
      {
        title: "Nuevo Documento",
        icon: Plus,
        url: "/dashboard/documents?action=new",
      },
    ],
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
    activationPaths: [
      "/dashboard/settings",
      "/dashboard/users",
      "/dashboard/categories",
      "/dashboard/document-types",
      "/dashboard/templates",
      "/dashboard/roles",
      "/dashboard/academic-years",
      "/dashboard/workflows",
    ],
  },
];

export function AppSidebar() {
  const { user } = useAuth();
  const { hasRole, hasAnyRole, hasPermission, hasAnyPermission } = usePermissions();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const currentUrl = queryString ? `${pathname}?${queryString}` : pathname;
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
  const institutionName = settings?.institution?.name?.trim() || "Institución no configurada";
  const schoolYearName = settings?.schoolYear?.name?.trim() || "Año lectivo no disponible";
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
          <div className="min-w-0">
            <span className="block truncate font-semibold">{institutionName}</span>
            <span className="block truncate text-xs text-sidebar-foreground/70">{schoolYearName}</span>
          </div>
        </div>
      </SidebarHeader>

      {/* Content - Menu de navegacion */}
      <SidebarContent>
        {/* Menu Principal */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.filter(shouldShowMenuItem).map((item, index) => {
                const isDocumentsSubmenu = item.title === "Documentos";

                return item.items?.length ? (
                  <Collapsible
                    key={item.title}
                    defaultOpen={index === 1}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          isActive={isNavItemActive(item, currentUrl)}
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
                                isActive={isNavItemActive(subItem, currentUrl)}
                                className={
                                  isDocumentsSubmenu
                                    ? "min-h-7 h-auto items-start overflow-visible [&>span:last-child]:whitespace-normal [&>span:last-child]:break-words [&>span:last-child]:leading-tight [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip"
                                    : undefined
                                }
                              >
                                <Link
                                  href={subItem.url}
                                  className={isDocumentsSubmenu ? "flex items-start" : "flex items-center"}
                                >
                                  {subItem.icon && (
                                    <subItem.icon
                                      className={
                                        isDocumentsSubmenu
                                          ? "h-4 w-4 mr-2 shrink-0 self-start"
                                          : "h-4 w-4 mr-2"
                                      }
                                    />
                                  )}
                                  {isDocumentsSubmenu ? (
                                    <span className="min-w-0 flex-1 whitespace-normal break-words leading-tight">
                                      {subItem.title}
                                    </span>
                                  ) : (
                                    subItem.title
                                  )}
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
                      isActive={isNavItemActive(item, currentUrl)}
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
                );
              })}
              <Collapsible
                defaultOpen={isNavItemActive({ url: "/dashboard/directories", items: [{}] }, currentUrl)}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={isNavItemActive({ url: "/dashboard/directories", items: [{}] }, currentUrl)}
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
                        <SidebarMenuSubButton asChild isActive={isNavItemActive({ url: "/dashboard/directories" }, currentUrl)}>
                          <Link href="/dashboard/directories"><Folder className="h-4 w-4" /><span>Todos</span></Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={isNavItemActive({ url: "/dashboard/directories/new" }, currentUrl)}>
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
          "workflow.templates.manage",
        ]) || hasAnyRole([UserRole.ADMIN, UserRole.RECTOR, UserRole.VICERRECTOR, UserRole.COORDINADOR])) && (
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filterAuthorizedNavItems(adminMenuItems, new Set(
                    ["users.manage", "categories.manage", "document-types.manage", "templates.manage", "roles.manage", "workflow.templates.manage"].filter(hasPermission),
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
                        defaultOpen={isNavItemActive(item, currentUrl)}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              isActive={isNavItemActive(item, currentUrl)}
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
                                    isActive={isNavItemActive(subItem, currentUrl)}
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
                        isActive={isNavItemActive(item, currentUrl)}
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

      <SidebarRail />
    </Sidebar>
  );
}
