import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useDirectorySubmission } from "@/hooks/use-directory-submission";
import { documentsService } from "@/lib/services/documents.service";
import type { Directory, ReceptionSettings } from "@/lib/types";

let currentUser: { id: string } | null = { id: "actor-1" };

jest.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: () => ({ user: currentUser }),
}));

jest.mock("@/lib/services/documents.service", () => ({
  documentsService: {
    getDirectoryBreadcrumb: jest.fn(),
    getReception: jest.fn(),
  },
}));

function folder(
  overrides: Partial<Directory> & Pick<Directory, "id" | "name" | "createdById">,
): Directory {
  return { parentId: null, createdAt: "", updatedAt: "", ...overrides };
}

function settings(
  directoryId: number,
  overrides: Partial<ReceptionSettings> = {},
): ReceptionSettings {
  const { capabilities, ...rest } = overrides;
  return {
    directoryId,
    enabled: true,
    singleDocumentPerParticipant: false,
    ...rest,
    capabilities: {
      configure: false,
      manageParticipants: false,
      readAll: false,
      review: false,
      manageDelegates: false,
      manageStructure: false,
      owner: false,
      discover: true,
      submit: false,
      peerRead: false,
      ...(capabilities ?? {}),
    },
  };
}

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderSubmission(
  directoryId: number | null,
  enabled = true,
  client = makeClient(),
) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const view = renderHook(
    () => useDirectorySubmission(directoryId, enabled),
    { wrapper },
  );
  return { ...view, client };
}

beforeEach(() => {
  jest.clearAllMocks();
  currentUser = { id: "actor-1" };
});

describe("useDirectorySubmission", () => {
  it("keeps the null root ordinary without fetching folder capabilities", async () => {
    const { result } = renderSubmission(null);
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(result.current.canSubmit).toBe(true);
    expect(result.current.isReception).toBe(false);
    expect(result.current.singleQuota).toBe(false);
    expect(documentsService.getDirectoryBreadcrumb).not.toHaveBeenCalled();
    expect(documentsService.getReception).not.toHaveBeenCalled();
  });

  it.each([0, -3, Number("abc")])(
    "denies an invalid positive identifier %s without fetching",
    async (directoryId) => {
      const { result } = renderSubmission(directoryId);
      await waitFor(() => expect(result.current.busy).toBe(false));
      expect(result.current.canSubmit).toBe(false);
      expect(documentsService.getDirectoryBreadcrumb).not.toHaveBeenCalled();
    },
  );

  it("keeps an ordinary folder uploadable without requesting reception", async () => {
    jest
      .mocked(documentsService.getDirectoryBreadcrumb)
      .mockResolvedValue([
        folder({ id: 7, name: "Archivo", createdById: "other", receptionEnabled: false }),
      ]);
    const { result } = renderSubmission(7);
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(result.current.canSubmit).toBe(true);
    expect(result.current.isReception).toBe(false);
    expect(documentsService.getReception).not.toHaveBeenCalled();
  });

  it("allows a live participant whose reception capabilities include submit", async () => {
    jest.mocked(documentsService.getDirectoryBreadcrumb).mockResolvedValue([
      folder({ id: 7, name: "Bandeja", createdById: "other", receptionEnabled: true }),
    ]);
    jest
      .mocked(documentsService.getReception)
      .mockResolvedValue(settings(7, { capabilities: { submit: true } as never }));
    const { result } = renderSubmission(7);
    await waitFor(() => expect(result.current.canSubmit).toBe(true));
    expect(result.current.isReception).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("never derives submit authority from owner, review, readAll or an elevated role", async () => {
    jest.mocked(documentsService.getDirectoryBreadcrumb).mockResolvedValue([
      folder({ id: 7, name: "Bandeja", createdById: "other", receptionEnabled: true }),
    ]);
    jest.mocked(documentsService.getReception).mockResolvedValue(
      settings(7, {
        capabilities: {
          owner: true,
          review: true,
          readAll: true,
          configure: true,
          submit: false,
        } as never,
      }),
    );
    const { result } = renderSubmission(7);
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(result.current.isReception).toBe(true);
    expect(result.current.canSubmit).toBe(false);
  });

  it("denies a positive folder whose authorized metadata omits the current target", async () => {
    jest
      .mocked(documentsService.getDirectoryBreadcrumb)
      .mockResolvedValue([folder({ id: 99, name: "Otra", createdById: "other" })]);
    const { result } = renderSubmission(7);
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(result.current.canSubmit).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(documentsService.getReception).not.toHaveBeenCalled();
  });

  it("denies a positive folder whose reception flag is not a boolean", async () => {
    jest
      .mocked(documentsService.getDirectoryBreadcrumb)
      .mockResolvedValue([folder({ id: 7, name: "Dudosa", createdById: "other" })]);
    const { result } = renderSubmission(7);
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(result.current.canSubmit).toBe(false);
    expect(documentsService.getReception).not.toHaveBeenCalled();
  });

  it("denies a positive folder when the current identity is missing", async () => {
    currentUser = null;
    jest
      .mocked(documentsService.getDirectoryBreadcrumb)
      .mockResolvedValue([folder({ id: 7, name: "Archivo", createdById: "other" })]);
    const { result } = renderSubmission(7);
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(result.current.canSubmit).toBe(false);
    expect(documentsService.getReception).not.toHaveBeenCalled();
  });

  it("fails closed when a known reception returns 400 instead of converting to ordinary", async () => {
    jest.mocked(documentsService.getDirectoryBreadcrumb).mockResolvedValue([
      folder({ id: 7, name: "Bandeja", createdById: "other", receptionEnabled: true }),
    ]);
    jest
      .mocked(documentsService.getReception)
      .mockRejectedValue({ response: { status: 400 } });
    const { result } = renderSubmission(7);
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(result.current.isReception).toBe(true);
    expect(result.current.canSubmit).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  it("hides submission and reports an error when reception readback is forbidden", async () => {
    jest.mocked(documentsService.getDirectoryBreadcrumb).mockResolvedValue([
      folder({ id: 7, name: "Bandeja", createdById: "other", receptionEnabled: true }),
    ]);
    jest
      .mocked(documentsService.getReception)
      .mockRejectedValue({ response: { status: 403 } });
    const { result } = renderSubmission(7);
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(result.current.canSubmit).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  it("rejects a reception readback that lacks the full boolean capability set", async () => {
    jest.mocked(documentsService.getDirectoryBreadcrumb).mockResolvedValue([
      folder({ id: 7, name: "Bandeja", createdById: "other", receptionEnabled: true }),
    ]);
    jest.mocked(documentsService.getReception).mockResolvedValue({
      directoryId: 7,
      enabled: true,
      singleDocumentPerParticipant: false,
      capabilities: { submit: true },
    } as never);
    const { result } = renderSubmission(7);
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(result.current.canSubmit).toBe(false);
  });

  it("exposes the single-document quota only from a settled valid readback", async () => {
    jest.mocked(documentsService.getDirectoryBreadcrumb).mockResolvedValue([
      folder({ id: 7, name: "Bandeja", createdById: "other", receptionEnabled: true }),
    ]);
    jest.mocked(documentsService.getReception).mockResolvedValue(
      settings(7, {
        singleDocumentPerParticipant: true,
        capabilities: { submit: true } as never,
      }),
    );
    const { result } = renderSubmission(7);
    await waitFor(() => expect(result.current.canSubmit).toBe(true));
    expect(result.current.singleQuota).toBe(true);
  });

  it("blocks submission while a folder metadata refetch is pending", async () => {
    jest
      .mocked(documentsService.getDirectoryBreadcrumb)
      .mockResolvedValueOnce([
        folder({ id: 7, name: "Archivo", createdById: "other", receptionEnabled: false }),
      ]);
    const { result, client } = renderSubmission(7);
    await waitFor(() => expect(result.current.canSubmit).toBe(true));

    let resolveRefetch!: (value: Directory[]) => void;
    jest
      .mocked(documentsService.getDirectoryBreadcrumb)
      .mockImplementation(() => new Promise((resolve) => (resolveRefetch = resolve)));
    await act(async () => {
      void client.invalidateQueries({ queryKey: ["directory-breadcrumb"] });
    });
    await waitFor(() => expect(result.current.busy).toBe(true));
    expect(result.current.canSubmit).toBe(false);
    await act(async () => {
      resolveRefetch([
        folder({ id: 7, name: "Archivo", createdById: "other", receptionEnabled: false }),
      ]);
    });
    await waitFor(() => expect(result.current.canSubmit).toBe(true));
  });

  it("does not request capabilities while the hook is disabled", async () => {
    renderSubmission(7, false);
    await waitFor(() =>
      expect(documentsService.getDirectoryBreadcrumb).not.toHaveBeenCalled(),
    );
  });

  it("denies submission when the hook is disabled even with a warm permitted cache", async () => {
    jest
      .mocked(documentsService.getDirectoryBreadcrumb)
      .mockResolvedValue([
        folder({ id: 7, name: "Archivo", createdById: "other", receptionEnabled: false }),
      ]);
    const client = makeClient();
    const first = renderSubmission(7, true, client);
    await waitFor(() => expect(first.result.current.canSubmit).toBe(true));

    const second = renderSubmission(7, false, client);
    expect(second.result.current.canSubmit).toBe(false);
    expect(second.result.current.busy).toBe(false);
    expect(documentsService.getDirectoryBreadcrumb).toHaveBeenCalledTimes(1);
  });

  it("denies the ordinary root when there is no authenticated identity", async () => {
    currentUser = null;
    const { result } = renderSubmission(null);
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(result.current.canSubmit).toBe(false);
  });
});
