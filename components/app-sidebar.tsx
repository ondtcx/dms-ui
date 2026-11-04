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
  Plus,
  ChevronRight,
  Building2,
  Folder,
  PlusCircle,
  Inbox,
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
    activationPaths: ["/dashboard/documents"],
    items: [
      {
        title: "Bandeja",
        icon: FileText,
        url: "/dashboard/documents",
      },
      {
        title: "Pendientes de revisión",
        icon: Inbox,
        url: "/dashboard/documents/pending",
      },
      {
        title: "Nuevo",
        icon: PlusCircle,
        url: "/dashboard/documents?action=new",
      },
    ],
  },
  // Archivo oculto del sidebar por decisión de producto — la ruta /dashboard/archive sigue disponible.
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
  const { settings, isLoading } = useSettings();
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
  const institutionName = isLoading
    ? "Institución"
    : settings?.institution?.name?.trim() || "Institución no configurada";
  const schoolYearName = isLoading
    ? "Cargando año lectivo…"
    : settings?.schoolYear?.name?.trim() || "Año lectivo no disponible";
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
    <Sidebar collapsible="icon" className="border-sidebar-border">
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border p-4">
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
        <nav aria-label="Navegación principal">
        {/* Menu Principal */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.filter(shouldShowMenuItem).map((item) => {
                return item.items?.length ? (
                  <Collapsible
                    key={`${item.title}-${currentUrl}`}
                    defaultOpen={isNavItemActive(item, currentUrl)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <div className="flex items-center gap-1">
                        <SidebarMenuButton
                          asChild
                          isActive={isNavItemActive(item, currentUrl)}
                          aria-current={
                            isNavItemActive(item, currentUrl) &&
                            !item.items?.some((subItem) =>
                              isNavItemActive(subItem, currentUrl),
                            )
                              ? "page"
                              : undefined
                          }
                          tooltip={item.title}
                          className="data-[active=true]:border-sidebar-primary-foreground data-[active=true]:font-medium data-[active=true]:border-l-2 data-[active=true]:pl-[6px]!"
                        >
                          <Link
                            href={item.url}
                            className="flex w-full items-center"
                          >
                            {item.icon && (
                              <item.icon className="h-4 w-4 mr-2 shrink-0" />
                            )}
                            <span className="flex-1 truncate">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Alternar ${item.title}`}
                            className="rounded-md p-1.5 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none group-data-[collapsible=icon]:hidden"
                          >
                            <ChevronRight
                              aria-hidden="true"
                              className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                            />
                          </button>
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                size="sm"
                                isActive={isNavItemActive(subItem, currentUrl)}
                                aria-current={isNavItemActive(subItem, currentUrl) ? "page" : undefined}
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
                      isActive={isNavItemActive(item, currentUrl)}
                      tooltip={item.title}
                      className="data-[active=true]:border-sidebar-primary-foreground data-[active=true]:font-medium data-[active=true]:border-l-2 data-[active=true]:pl-[6px]!"
                    >
                      <Link
                        href={item.url}
                        aria-current={
                          isNavItemActive(item, currentUrl)
                            ? "page"
                            : undefined
                        }
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
                      tooltip="Carpetas"
                      className="data-[active=true]:border-sidebar-primary-foreground data-[active=true]:font-medium data-[active=true]:border-l-2 data-[active=true]:pl-[6px]!"
                    >
                      <Folder className="h-4 w-4 mr-2" />
                      Carpetas
                      <ChevronRight
                        aria-hidden="true"
                        className="ml-auto size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="gap-1.5 py-1">
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
                        <SidebarMenuSubItem><span className="px-2 text-xs text-muted-foreground">Sin carpetas recientes</span></SidebarMenuSubItem>
                      ) : highlightedDirectories.map((directory) => (
                        <SidebarMenuSubItem key={directory.id}>
                          <SidebarMenuSubButton asChild size="sm" isActive={false}>
                            <Link href={`/dashboard/documents?directoryId=${directory.id}`} title={directory.name}>
                              <Folder className="h-4 w-4" />
                              <span>{directory.name}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild size="sm" isActive={isNavItemActive({ url: "/dashboard/documents" }, currentUrl)}>
                          <Link href="/dashboard/documents"><Folder className="h-4 w-4" /><span>Raíz</span></Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild size="sm" isActive={isNavItemActive({ url: "/dashboard/directories/new" }, currentUrl)}>
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
                              className="data-[active=true]:border-sidebar-primary-foreground data-[active=true]:font-medium data-[active=true]:border-l-2 data-[active=true]:pl-[6px]!"
                            >
                              {item.icon && (
                                <item.icon className="h-4 w-4 mr-2" />
                              )}
                              {item.title}
                              <ChevronRight
                                aria-hidden="true"
                                className="ml-auto size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                              />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub className="gap-1.5 py-1">
                              {visibleSubItems.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.title}>
                                  <SidebarMenuSubButton
                                    asChild
                                    size="sm"
                                    isActive={isNavItemActive(subItem, currentUrl)}
                                    aria-current={isNavItemActive(subItem, currentUrl) ? "page" : undefined}
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
                        className="data-[active=true]:border-sidebar-primary-foreground data-[active=true]:font-medium data-[active=true]:border-l-2 data-[active=true]:pl-[6px]!"
                      >
                        <Link
                          href={item.url}
                          aria-current={
                            isNavItemActive(item, currentUrl)
                              ? "page"
                              : undefined
                          }
                          className="flex items-center"
                        >
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
        </nav>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
