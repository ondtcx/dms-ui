import api from "@/lib/axios";
import { documentsService } from "@/lib/services/documents.service";

jest.mock("@/lib/axios", () => ({
  put: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

describe("documentsService.saveContent", () => {
  it("sends the fallback content and returns the saved document", async () => {
    const document = { id: 7, title: "notes.txt" };
    jest.mocked(api.put).mockResolvedValueOnce({ data: document });

    await expect(documentsService.saveContent(7, "updated text")).resolves.toEqual(document);
    expect(api.put).toHaveBeenCalledWith("/documents/7/content", { content: "updated text" });
  });
});

describe("documentsService directory integration", () => {
  it("passes directoryId while listing documents", async () => {
    jest.mocked(api.get).mockResolvedValueOnce({ data: { data: [], meta: {} } });
    await documentsService.getAll({ directoryId: 4, page: 1 });
    expect(api.get).toHaveBeenCalledWith("/documents", { params: { directoryId: 4, page: 1 } });
  });

  it("supports directory navigation and CRUD endpoints", async () => {
    jest.mocked(api.get).mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [] });
    jest.mocked(api.post).mockResolvedValueOnce({ data: { id: 1 } });
    jest.mocked(api.patch).mockResolvedValueOnce({ data: { id: 1 } });
    jest.mocked(api.delete).mockResolvedValueOnce({});

    await documentsService.listDirectories(null);
    await documentsService.getDirectoryBreadcrumb(1);
    await documentsService.createDirectory({ name: "Reports", parentId: null });
    await documentsService.updateDirectory(1, { name: "Annual reports" });
    await documentsService.deleteDirectory(1);

    expect(api.get).toHaveBeenNthCalledWith(1, "/directories", { params: { parentId: null } });
    expect(api.get).toHaveBeenNthCalledWith(2, "/directories/1/breadcrumb");
    expect(api.post).toHaveBeenCalledWith("/directories", { name: "Reports", parentId: null });
    expect(api.patch).toHaveBeenCalledWith("/directories/1", { name: "Annual reports" });
    expect(api.delete).toHaveBeenCalledWith("/directories/1");
  });

  it("uses the summary, accessible list, and idempotent visit contracts", async () => {
    jest.mocked(api.get)
      .mockResolvedValueOnce({ data: { recent: [], mostUsed: [] } })
      .mockResolvedValueOnce({ data: { data: [], meta: { page: 2, limit: 10, total: 0, totalPages: 0 } } });
    jest.mocked(api.post).mockResolvedValueOnce({ data: undefined });

    await documentsService.getDirectoryNavigationSummary();
    await documentsService.getAccessibleDirectories({ page: 2, limit: 10 });
    await documentsService.recordDirectoryVisit(9, "event-uuid");

    expect(api.get).toHaveBeenNthCalledWith(1, "/directories/summary");
    expect(api.get).toHaveBeenNthCalledWith(2, "/directories/accessible", { params: { page: 2, limit: 10 } });
    expect(api.post).toHaveBeenCalledWith("/directories/9/visits", { eventId: "event-uuid" });
  });

  it("moves a document and sends an upload destination", async () => {
    jest.mocked(api.patch).mockResolvedValueOnce({ data: { id: 8 } });
    await documentsService.moveToDirectory(8, null);
    expect(api.patch).toHaveBeenCalledWith("/documents/8/directory", { directoryId: null });

    jest.mocked(api.post).mockResolvedValueOnce({ data: { id: 8 } });
    await documentsService.upload(new File(["content"], "notes.txt"), {
      directoryId: 4,
      documentTypeId: 12,
    });
    const formData = jest.mocked(api.post).mock.calls.at(-1)?.[1] as FormData;
    expect(formData.get("directoryId")).toBe("4");
  });
});

describe("documentsService upload metadata", () => {
  it("includes the selected document type in a single-file upload", async () => {
    jest.mocked(api.post).mockResolvedValueOnce({ data: { id: 1 } });

    await documentsService.upload(new File(["content"], "notes.txt"), {
      documentTypeId: 12,
    });

    const formData = jest.mocked(api.post).mock.calls[0][1] as FormData;
    expect(formData.get("documentTypeId")).toBe("12");
  });

  it("uses one common document type for a multiple-file upload", async () => {
    jest.mocked(api.post).mockResolvedValueOnce({ data: [] });
    const files = [
      new File(["one"], "one.txt"),
      new File(["two"], "two.txt"),
    ];

    await documentsService.uploadMultiple(files, { documentTypeId: 12 });

    const formData = jest.mocked(api.post).mock.calls[0][1] as FormData;
    expect(formData.getAll("files")).toHaveLength(2);
    expect(formData.get("documentTypeId")).toBe("12");
  });
});
