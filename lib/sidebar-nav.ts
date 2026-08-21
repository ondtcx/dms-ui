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
  item: Pick<MenuItem, "url"> & { items?: readonly unknown[] },
  pathname: string,
): boolean {
  if (item.items && item.items.length > 0) {
    return pathname.startsWith(item.url + "/");
  }
  return pathname === item.url;
}
