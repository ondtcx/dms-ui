import {
  canAccessRoute,
  filterNavigationItems,
  getRoutePolicy,
  type NavigationItem,
} from "@/lib/auth/access";

describe("auth access helpers", () => {
  it("allows a mapped route when the user has the required capability", () => {
    expect(canAccessRoute("/dashboard/admin/roles", ["roles:read"])).toBe(true);
    expect(getRoutePolicy("/dashboard/admin/roles")?.anyOf).toEqual(["roles:read"]);
  });

  it("fails closed for covered routes without an explicit policy", () => {
    expect(
      canAccessRoute("/dashboard/users", ["role:admin"], {
        coveredRoutes: ["/dashboard/users"],
        routePolicies: {},
      }),
    ).toBe(false);
  });

  it("filters navigation items with the same access contract used by direct routes", () => {
    const items: NavigationItem[] = [
      { title: "Usuarios", href: "/dashboard/users", route: "/dashboard/users" },
      { title: "Roles", href: "/dashboard/admin/roles", route: "/dashboard/admin/roles" },
      { title: "Documentos", href: "/dashboard/documents", route: "/dashboard/documents" },
    ];

    expect(
      filterNavigationItems(items, ["roles:read"]).map((item) => item.title),
    ).toEqual(["Roles", "Documentos"]);
  });
});
