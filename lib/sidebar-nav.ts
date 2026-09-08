import type { MenuItem } from "@/components/app-sidebar";
import type { Directory } from "@/lib/types";

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
  if (item.activationPaths || (item.items && item.items.length > 0)) {
    return paths.some((path) => pathname === path || pathname.startsWith(path + "/"));
  }
  return pathname === item.url;
}

export function filterAuthorizedNavItems<T extends {
  requiredPermission?: string;
  requiredPermissions?: readonly string[];
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
      (!item.requiredPermissions || item.requiredPermissions.some((permission) => permissions.has(permission))) &&
      (!item.items || item.items.length > 0),
    );
}

/** Merge ranked lists without exposing duplicate entries or an unbounded sidebar. */
export function mergeDirectoryNavigation(
  recent: readonly Directory[] = [],
  mostUsed: readonly Directory[] = [],
  limit = 10,
): Directory[] {
  const merged: Directory[] = [];
  const seen = new Set<number>();
  for (const directory of [...recent, ...mostUsed]) {
    if (seen.has(directory.id)) continue;
    seen.add(directory.id);
    merged.push(directory);
    if (merged.length >= limit) break;
  }
  return merged;
}
