import type { MenuItem } from "@/components/app-sidebar";

/**
 * Pure decision for whether a nav item should render as active.
 *
 * - Parent items (those that own sub-items) are active on any sub-route,
 *   using a slash boundary so `/dashboard/academic` does NOT match
 *   `/dashboard/academic-years`.
 * - Leaf items require an exact pathname match.
 */
export function isNavItemActive(
  item: Pick<MenuItem, "url"> & {
    items?: readonly unknown[];
    activationPaths?: readonly string[];
  },
  pathname: string,
): boolean {
  const paths = item.activationPaths ?? [item.url];
  if (item.items && item.items.length > 0) {
    return paths.some((path) => pathname === path || pathname.startsWith(path + "/"));
  }
  return pathname === item.url;
}

export function filterAuthorizedNavItems<T extends {
  requiredPermission?: string;
  items?: readonly T[];
}>(items: readonly T[], permissions: ReadonlySet<string>): T[] {
  return items
    .map((item) => ({
      ...item,
      items: item.items
        ? filterAuthorizedNavItems(item.items, permissions)
        : item.items,
    }))
    .filter((item) =>
      (!item.requiredPermission || permissions.has(item.requiredPermission)) &&
      (!item.items || item.items.length > 0),
    );
}
