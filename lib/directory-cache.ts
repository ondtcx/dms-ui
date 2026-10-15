import type { QueryClient } from "@tanstack/react-query";

/** Invalida las vistas que pueden cambiar después de modificar una carpeta. */
export function invalidateDirectoryQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ["directories"] });
  queryClient.invalidateQueries({ queryKey: ["directory-breadcrumb"] });
  queryClient.invalidateQueries({ queryKey: ["directory-current"] });
  queryClient.invalidateQueries({ queryKey: ["directory-navigation-summary"] });
  queryClient.invalidateQueries({ queryKey: ["directory-accessible"] });
  queryClient.invalidateQueries({ queryKey: ["directory-reception"] });
  queryClient.invalidateQueries({ queryKey: ["documents"] });
}
