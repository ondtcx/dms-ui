import type { QueryClient } from "@tanstack/react-query";

/** Invalidates every view whose result can change after a directory mutation. */
export function invalidateDirectoryQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ["directories"] });
  queryClient.invalidateQueries({ queryKey: ["directory-breadcrumb"] });
  queryClient.invalidateQueries({ queryKey: ["directory-navigation-summary"] });
  queryClient.invalidateQueries({ queryKey: ["directory-accessible"] });
  queryClient.invalidateQueries({ queryKey: ["documents"] });
}
