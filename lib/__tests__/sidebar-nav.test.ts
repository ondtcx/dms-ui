import { isNavItemActive, filterAuthorizedNavItems, mergeDirectoryNavigation } from "@/lib/sidebar-nav";

describe("isNavItemActive (REQ-1 / REQ-2)", () => {
  it("matches a leaf item by exact pathname", () => {
    expect(isNavItemActive({ url: "/dashboard/documents" }, "/dashboard/documents")).toBe(true);
    expect(isNavItemActive({ url: "/dashboard/documents" }, "/dashboard/trash")).toBe(false);
  });

  it("matches a parent item on any sub-route", () => {
    expect(
      isNavItemActive(
        { url: "/dashboard/academic-years", items: [{}] },
        "/dashboard/academic-years/123",
      ),
    ).toBe(true);
  });

  it("does not match a parent on a sibling path sharing a prefix (slash boundary)", () => {
    expect(
      isNavItemActive(
        { url: "/dashboard/academic-years", items: [{}] },
        "/dashboard/academic",
      ),
    ).toBe(false);
  });

  it("does not match an unrelated path", () => {
    expect(isNavItemActive({ url: "/dashboard/documents" }, "/dashboard/trash")).toBe(false);
  });

  it("does not treat a dashboard leaf as active on a deeper route", () => {
    expect(isNavItemActive({ url: "/dashboard" }, "/dashboard/documents")).toBe(false);
  });

  it("matches Settings only at slash boundaries and its legacy paths", () => {
    const settings = {
      url: "/dashboard/settings",
      activationPaths: [
        "/dashboard/settings",
        "/dashboard/users",
        "/dashboard/academic-years",
        "/dashboard/categories",
        "/dashboard/document-types",
        "/dashboard/templates",
        "/dashboard/roles",
        "/dashboard/workflows",
      ],
    };
    expect(isNavItemActive(settings, "/dashboard/settings")).toBe(true);
    expect(isNavItemActive(settings, "/dashboard/users/42")).toBe(true);
    expect(isNavItemActive(settings, "/dashboard/categories/edit")).toBe(true);
    expect(isNavItemActive(settings, "/dashboard/document-types/new")).toBe(true);
    expect(isNavItemActive(settings, "/dashboard/templates/7")).toBe(true);
    expect(isNavItemActive(settings, "/dashboard/roles/7")).toBe(true);
    expect(isNavItemActive(settings, "/dashboard/academic-years/2026")).toBe(true);
    expect(isNavItemActive(settings, "/dashboard/workflows")).toBe(true);
    expect(isNavItemActive(settings, "/dashboard/workflows/definition/1")).toBe(true);
    expect(isNavItemActive(settings, "/dashboard/settings-extra")).toBe(false);
    expect(isNavItemActive(settings, "/dashboard/workflow-settings")).toBe(false);
    expect(isNavItemActive(settings, "/dashboard/templates-extra")).toBe(false);
    expect(isNavItemActive(settings, "/dashboard")).toBe(false);
  });

  it("filters destinations by permission without hiding independently authorized items", () => {
    const items = [
      { url: "/dashboard/users", requiredPermission: "users.manage" },
      { url: "/dashboard/categories", requiredPermission: "categories.manage" },
    ];
    expect(filterAuthorizedNavItems(items, new Set(["categories.manage"]))).toEqual([items[1]]);
  });

  it("shows a Users destination to either users.manage or roles.manage authorities", () => {
    const users = {
      url: "/dashboard/settings?section=users",
      requiredPermissions: ["users.manage", "roles.manage"],
    };

    expect(filterAuthorizedNavItems([users], new Set(["roles.manage"]))).toEqual([users]);
    expect(filterAuthorizedNavItems([users], new Set(["documents.read"]))).toEqual([]);
  });
});

describe("mergeDirectoryNavigation", () => {
  const directory = (id: number) => ({
    id, name: `Directory ${id}`, parentId: null, createdById: "user", createdAt: "", updatedAt: "",
  });

  it("keeps recent order, deduplicates most-used entries, and caps the result", () => {
    expect(mergeDirectoryNavigation([directory(1), directory(2)], [directory(2), directory(3)], 3).map((item) => item.id))
      .toEqual([1, 2, 3]);
  });
});
