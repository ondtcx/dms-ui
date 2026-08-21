import { isNavItemActive } from "@/lib/sidebar-nav";

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
});
