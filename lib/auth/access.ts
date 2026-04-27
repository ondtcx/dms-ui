import {
  COVERED_ROUTE_KEYS,
  ROUTE_POLICIES,
  type RouteAccessPolicy,
} from "@/lib/auth/route-policy";

export interface NavigationItem {
  title: string;
  href: string;
  route?: string;
  items?: NavigationItem[];
}

interface AccessOptions {
  coveredRoutes?: string[];
  routePolicies?: Record<string, RouteAccessPolicy>;
}

export function hasPermission(
  permissions: string[] | undefined,
  permission: string,
): boolean {
  return Boolean(permissions?.includes(permission));
}

export function hasAnyPermission(
  permissions: string[] | undefined,
  requiredPermissions: string[],
): boolean {
  return requiredPermissions.some((permission) => hasPermission(permissions, permission));
}

export function hasAllPermissions(
  permissions: string[] | undefined,
  requiredPermissions: string[],
): boolean {
  return requiredPermissions.every((permission) => hasPermission(permissions, permission));
}

export function getRoutePolicy(
  route: string,
  routePolicies: Record<string, RouteAccessPolicy> = ROUTE_POLICIES,
): RouteAccessPolicy | null {
  return routePolicies[route] ?? null;
}

export function canAccessPolicy(
  permissions: string[] | undefined,
  policy: RouteAccessPolicy,
): boolean {
  if (policy.allOf?.length && !hasAllPermissions(permissions, policy.allOf)) {
    return false;
  }

  if (policy.anyOf?.length && !hasAnyPermission(permissions, policy.anyOf)) {
    return false;
  }

  return true;
}

export function canAccessRoute(
  route: string,
  permissions: string[] | undefined,
  options: AccessOptions = {},
): boolean {
  const coveredRoutes = options.coveredRoutes ?? COVERED_ROUTE_KEYS;
  const routePolicies = options.routePolicies ?? ROUTE_POLICIES;
  const policy = getRoutePolicy(route, routePolicies);

  if (policy) {
    return canAccessPolicy(permissions, policy);
  }

  return !coveredRoutes.includes(route);
}

export function filterNavigationItems(
  items: NavigationItem[],
  permissions: string[] | undefined,
): NavigationItem[] {
  return items.reduce<NavigationItem[]>((acc, item) => {
    const filteredChildren = item.items
      ? filterNavigationItems(item.items, permissions)
      : undefined;
    const route = item.route ?? item.href;
    const isVisible = canAccessRoute(route, permissions);

    if (!isVisible) {
      return acc;
    }

    acc.push({
      ...item,
      items: filteredChildren,
    });
    return acc;
  }, []);
}

export function getUnauthorizedFallbackPath(): string {
  return "/errors/unauthorized";
}
