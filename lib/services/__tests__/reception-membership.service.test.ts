import api from "@/lib/axios";
import { documentsService } from "@/lib/services/documents.service";
import type { DirectoryMembership } from "@/lib/types";

jest.mock("@/lib/axios", () => ({
  get: jest.fn(),
  patch: jest.fn(),
  put: jest.fn(),
  post: jest.fn(),
  delete: jest.fn(),
}));

function membership(): DirectoryMembership {
  return {
    users: [{ directoryId: 5, userId: "u-2", peerRead: false }],
    roles: [{ directoryId: 5, roleId: 3, peerRead: true }],
    delegates: [],
  };
}

beforeEach(() => jest.clearAllMocks());

describe("documentsService reception membership", () => {
  it("reads membership from the directory membership endpoint", async () => {
    const readback = membership();
    jest.mocked(api.get).mockResolvedValueOnce({ data: readback });

    await expect(documentsService.getReceptionMembership(5)).resolves.toEqual(readback);
    expect(api.get).toHaveBeenCalledWith("/directories/5/reception/membership");
  });

  it("posts exactly one user participant with the peer flag", async () => {
    jest.mocked(api.post).mockResolvedValueOnce({
      data: { directoryId: 5, userId: "u-2", peerRead: true },
    });

    await documentsService.setReceptionParticipant(5, { userId: "u-2", peerRead: true });

    expect(api.post).toHaveBeenCalledWith("/directories/5/reception/participants", {
      userId: "u-2",
      peerRead: true,
    });
  });

  it("posts exactly one role participant with the peer flag", async () => {
    jest.mocked(api.post).mockResolvedValueOnce({
      data: { directoryId: 5, roleId: 3, peerRead: false },
    });

    await documentsService.setReceptionParticipant(5, { roleId: 3, peerRead: false });

    expect(api.post).toHaveBeenCalledWith("/directories/5/reception/participants", {
      roleId: 3,
      peerRead: false,
    });
  });

  it("rejects a participant payload with two or zero targets before any request", async () => {
    await expect(
      documentsService.setReceptionParticipant(5, {
        userId: "u-2",
        roleId: 3,
        peerRead: true,
      }),
    ).rejects.toThrow();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("removes a user participant with an encoded user path", async () => {
    jest.mocked(api.delete).mockResolvedValueOnce({ data: { removed: true } });

    await documentsService.removeReceptionUserParticipant(5, "u-2 a/b");

    expect(api.delete).toHaveBeenCalledWith(
      "/directories/5/reception/participants/users/u-2%20a%2Fb",
    );
  });

  it("removes a role participant with a validated numeric role path", async () => {
    jest.mocked(api.delete).mockResolvedValueOnce({ data: { removed: true } });

    await documentsService.removeReceptionRoleParticipant(5, 3);

    expect(api.delete).toHaveBeenCalledWith(
      "/directories/5/reception/participants/roles/3",
    );
    await expect(
      documentsService.removeReceptionRoleParticipant(5, 0),
    ).rejects.toThrow();
  });

  it("patches a delegate with every flag explicitly present", async () => {
    jest.mocked(api.patch).mockResolvedValueOnce({
      data: {
        directoryId: 5,
        userId: "u-2",
        full: false,
        configure: true,
        manageParticipants: false,
        readAll: true,
        review: true,
        manageDelegates: false,
        manageStructure: false,
      },
    });

    await documentsService.setReceptionDelegate(5, "u-2", {
      configure: true,
      review: true,
    });

    expect(api.patch).toHaveBeenCalledWith("/directories/5/reception/delegates/u-2", {
      full: false,
      configure: true,
      manageParticipants: false,
      readAll: true,
      review: true,
      manageDelegates: false,
      manageStructure: false,
    });
  });

  it("removes a delegate with an encoded user path", async () => {
    jest.mocked(api.delete).mockResolvedValueOnce({ data: { removed: true } });

    await documentsService.removeReceptionDelegate(5, "u-2 a/b");

    expect(api.delete).toHaveBeenCalledWith(
      "/directories/5/reception/delegates/u-2%20a%2Fb",
    );
  });

  it("searches users with bounded query parameters", async () => {
    jest.mocked(api.get).mockResolvedValueOnce({
      data: [{ id: "u-2", name: "Ana", email: "ana@dms.test" }],
    });

    await documentsService.searchReceptionUserRecipients(5, "  an  ", 20);

    expect(api.get).toHaveBeenCalledWith("/directories/5/reception/recipients/users", {
      params: { q: "an", limit: 20 },
    });
    await expect(
      documentsService.searchReceptionUserRecipients(5, "a"),
    ).rejects.toThrow();
  });

  it("searches roles with an optional bounded query", async () => {
    jest.mocked(api.get).mockResolvedValueOnce({
      data: [{ id: 3, key: "profesor", label: "Profesor" }],
    });

    await documentsService.searchReceptionRoleRecipients(5, undefined, 20);
    expect(api.get).toHaveBeenCalledWith("/directories/5/reception/recipients/roles", {
      params: { limit: 20 },
    });

    jest.mocked(api.get).mockResolvedValueOnce({ data: [] });
    await documentsService.searchReceptionRoleRecipients(5, "pro", 10);
    expect(api.get).toHaveBeenLastCalledWith(
      "/directories/5/reception/recipients/roles",
      { params: { q: "pro", limit: 10 } },
    );
  });

  it("rejects invalid directory identifiers before any request", async () => {
    await expect(documentsService.getReceptionMembership(0)).rejects.toThrow();
    await expect(documentsService.getReceptionMembership(1.5)).rejects.toThrow();
    expect(api.get).not.toHaveBeenCalled();
  });
});
