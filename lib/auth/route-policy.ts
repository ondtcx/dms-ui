export interface RouteAccessPolicy {
  key: string;
  href: string;
  anyOf?: string[];
  allOf?: string[];
}

export const ROUTE_POLICIES: Record<string, RouteAccessPolicy> = {
  "/dashboard/users": {
    key: "users",
    href: "/dashboard/users",
    anyOf: ["role:admin"],
  },
  "/dashboard/settings": {
    key: "settings",
    href: "/dashboard/settings",
    anyOf: ["role:admin"],
  },
  "/dashboard/academic-years": {
    key: "academic-years",
    href: "/dashboard/academic-years",
    anyOf: ["role:admin", "role:rector"],
  },
  "/dashboard/admin/roles": {
    key: "roles",
    href: "/dashboard/admin/roles",
    anyOf: ["roles:read"],
  },
  "/dashboard/workflows": {
    key: "workflows",
    href: "/dashboard/workflows",
    anyOf: [
      "role:admin",
      "role:rector",
      "role:vicerrector",
      "role:coordinador",
      "role:secretario",
      "role:moderador",
    ],
  },
  "/dashboard/requests": {
    key: "requests",
    href: "/dashboard/requests",
    anyOf: ["role:profesor", "role:secretario"],
  },
  "/dashboard/requests/new": {
    key: "requests-new",
    href: "/dashboard/requests/new",
    anyOf: ["role:profesor", "role:secretario"],
  },
  "/dashboard/departments": {
    key: "departments",
    href: "/dashboard/departments",
    anyOf: ["role:admin", "role:rector", "role:vicerrector"],
  },
  "/dashboard/sections": {
    key: "sections",
    href: "/dashboard/sections",
    anyOf: ["role:admin"],
  },
  "/dashboard/categories": {
    key: "categories",
    href: "/dashboard/categories",
    anyOf: ["role:admin"],
  },
  "/dashboard/document-types": {
    key: "document-types",
    href: "/dashboard/document-types",
    anyOf: ["role:admin"],
  },
  "/dashboard/templates": {
    key: "templates",
    href: "/dashboard/templates",
    anyOf: ["role:admin"],
  },
  "/dashboard/reports": {
    key: "reports",
    href: "/dashboard/reports",
    anyOf: ["role:admin", "role:rector", "role:vicerrector", "role:coordinador"],
  },
};

export const COVERED_ROUTE_KEYS = Object.keys(ROUTE_POLICIES);

export const ROLES_WRITE_PERMISSION = "roles:write";
