import api from "@/lib/axios";
import { usersService } from "@/lib/services/users.service";
import { sharesService } from "@/lib/services/shares.service";
import { displayRoleName, normalizeShare, normalizeUser } from "@/lib/auth/normalizers";

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe("role contract alignment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("submits roleId for user mutations and normalizes dynamic role metadata", async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: {
        id: "user-1",
        name: "Ana",
        email: "ana@example.com",
        roleId: "role-admin",
        role: { id: "role-admin", name: "Administrador" },
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    });

    const created = await usersService.create({
      name: "Ana",
      email: "ana@example.com",
      password: "secret123",
      roleId: "role-admin",
    });

    expect(api.post).toHaveBeenCalledWith("/users", {
      name: "Ana",
      email: "ana@example.com",
      password: "secret123",
      roleId: "role-admin",
    });
    expect(created.roleId).toBe("role-admin");
    expect(displayRoleName(created)).toBe("Administrador");
  });

  it("omits empty roleId values from user mutations", async () => {
    (api.patch as jest.Mock).mockResolvedValue({
      data: {
        id: "user-1",
        name: "Ana",
        email: "ana@example.com",
        roleId: null,
        role: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    });

    await usersService.update("user-1", {
      name: "Ana",
      email: "ana@example.com",
      roleId: "",
    });

    expect(api.patch).toHaveBeenCalledWith("/users/user-1", {
      name: "Ana",
      email: "ana@example.com",
    });
  });

  it("submits roleId for share creation and keeps fallback labels for legacy reads", async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: {
        id: 10,
        documentId: 5,
        document: { id: 5, versions: [], createdAt: "2026-01-01T00:00:00.000Z" },
        userId: null,
        user: null,
        roleId: "role-reviewer",
        role: null,
        departmentId: null,
        department: null,
        courseId: null,
        course: null,
        canView: true,
        canDownload: true,
        canEdit: false,
        canShare: false,
        isPublicLink: false,
        shareToken: "token",
        requiresPassword: false,
        expiresAt: null,
        maxViews: null,
        viewCount: 0,
        sharedBy: { id: "user-1", name: "Ana", email: "ana@example.com" },
        sharedById: "user-1",
        revokedAt: null,
        revokedBy: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    });

    const created = await sharesService.create({
      documentId: 5,
      roleId: "role-reviewer",
      canView: true,
    });

    expect(api.post).toHaveBeenCalledWith("/shares", {
      documentId: 5,
      roleId: "role-reviewer",
      canView: true,
    });
    expect(created.roleId).toBe("role-reviewer");
    expect(displayRoleName(created)).toBe("role-reviewer");
  });

  it("normalizes legacy string roles and dynamic role objects consistently", () => {
    expect(
      displayRoleName(
        normalizeUser({
          id: "user-2",
          name: "Luis",
          email: "luis@example.com",
          role: "secretario",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        }),
      ),
    ).toBe("secretario");

    expect(
      displayRoleName(
        normalizeShare({
          id: 11,
          documentId: 7,
          document: { id: 7, versions: [], createdAt: "2026-01-01T00:00:00.000Z" },
          userId: null,
          user: null,
          roleId: "role-viewer",
          roleSummary: { id: "role-viewer", name: "Lector" },
          departmentId: null,
          department: null,
          courseId: null,
          course: null,
          canView: true,
          canDownload: true,
          canEdit: false,
          canShare: false,
          isPublicLink: false,
          shareToken: "token-2",
          requiresPassword: false,
          expiresAt: null,
          maxViews: null,
          viewCount: 0,
          sharedBy: { id: "user-1", name: "Ana", email: "ana@example.com" },
          sharedById: "user-1",
          revokedAt: null,
          revokedBy: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        }),
      ),
    ).toBe("Lector");
  });
});
