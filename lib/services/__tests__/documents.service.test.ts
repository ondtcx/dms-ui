import api from "@/lib/axios";
import { documentsService } from "@/lib/services/documents.service";
import type { DocumentAuditPageWire } from "@/lib/types";

jest.mock("@/lib/axios", () => ({
  put: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

it.each(["normal", "permanent", "until"] as const)("routes retention %s using the version number and exact body", async (mode) => {
  const updated = { id: 99, version: 2, expiresAt: null };
  jest.mocked(api.patch).mockResolvedValueOnce({ data: updated });
  const payload = mode === "until" ? { mode, preserveUntil: "2099-01-01T23:59:59.999Z" } : { mode };
  await expect(documentsService.updateVersionRetention(7, 2, payload)).resolves.toEqual(updated);
  expect(api.patch).toHaveBeenCalledWith("/documents/7/versions/2/retention", payload);
});

describe("documentsService legacy editing metadata", () => {
  it("excludes origin dates from the editing contract at compile time", () => {
    const acceptsUploadIdentity: Extract<"name" | "documentNumber", keyof Parameters<typeof documentsService.update>[1]> extends never
      ? false : true = true;
    expect(acceptsUploadIdentity).toBe(true);
    const acceptsOriginDate: "originDate" extends keyof Parameters<
      typeof documentsService.update
    >[1]
      ? true
      : false = false;
    expect(acceptsOriginDate).toBe(false);
  });

  it("preserves untrimmed descriptions and nested academic serialization", async () => {
    const document = { id: 7 };
    jest.mocked(api.patch).mockResolvedValueOnce({ data: document });
    await expect(
      documentsService.update(7, {
        description: "  ",
        categoryId: 2,
        documentTypeId: 12,
        isPublic: false,
        directoryId: 4,
        courseId: 3,
        subjectId: 5,
        academicYearId: 8,
      }),
    ).resolves.toEqual(document);
    expect(api.patch).toHaveBeenCalledWith("/documents/7", {
      description: "  ",
      categoryId: 2,
      documentTypeId: 12,
      isPublic: false,
      directoryId: 4,
      academic: { courseId: 3, subjectId: 5, academicYearId: 8 },
    });
  });

  it("forwards editable identity and explicit null without replaying a document type", async () => {
    jest.mocked(api.patch).mockResolvedValueOnce({ data: { id: 7 } });
    await documentsService.update(7, { name: "New title", documentNumber: null });
    expect(api.patch).toHaveBeenCalledWith("/documents/7", {
      name: "New title", documentNumber: null,
    });
  });

  it("keeps partial edits optional without upload validation", async () => {
    jest.mocked(api.patch).mockResolvedValue({ data: { id: 7 } });
    await documentsService.update(7, {});
    await documentsService.update(7, { description: "" });
    expect(api.patch).toHaveBeenNthCalledWith(1, "/documents/7", {});
    expect(api.patch).toHaveBeenNthCalledWith(2, "/documents/7", {
      description: "",
    });
  });
});

describe("documentsService.saveContent", () => {
  it("sends the fallback content and returns the saved document", async () => {
    const document = { id: 7, title: "notes.txt" };
    jest.mocked(api.put).mockResolvedValueOnce({ data: document });

    await expect(
      documentsService.saveContent(7, "updated text"),
    ).resolves.toEqual(document);
    expect(api.put).toHaveBeenCalledWith("/documents/7/content", {
      content: "updated text",
    });
  });
});

describe("documentsService directory integration", () => {
  it("passes directoryId while listing documents", async () => {
    jest
      .mocked(api.get)
      .mockResolvedValueOnce({ data: { data: [], meta: {} } });
    await documentsService.getAll({ directoryId: 4, page: 1 });
    expect(api.get).toHaveBeenCalledWith("/documents", {
      params: { directoryId: 4, page: 1 },
    });
  });

  it("passes documentTypeId while listing documents", async () => {
    jest
      .mocked(api.get)
      .mockResolvedValueOnce({ data: { data: [], meta: {} } });
    await documentsService.getAll({ documentTypeId: 12, page: 1 });
    expect(api.get).toHaveBeenCalledWith("/documents", {
      params: { documentTypeId: 12, page: 1 },
    });
  });

  it("supports directory navigation and CRUD endpoints", async () => {
    jest
      .mocked(api.get)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] });
    jest.mocked(api.post).mockResolvedValueOnce({ data: { id: 1 } });
    jest.mocked(api.patch).mockResolvedValueOnce({ data: { id: 1 } });
    jest.mocked(api.delete).mockResolvedValueOnce({});

    await documentsService.listDirectories(null);
    await documentsService.getDirectoryBreadcrumb(1);
    await documentsService.createDirectory({ name: "Reports", parentId: null });
    await documentsService.updateDirectory(1, { name: "Annual reports" });
    await documentsService.deleteDirectory(1);

    expect(api.get).toHaveBeenNthCalledWith(1, "/directories", {
      params: { parentId: null },
    });
    expect(api.get).toHaveBeenNthCalledWith(2, "/directories/1/breadcrumb");
    expect(api.post).toHaveBeenCalledWith("/directories", {
      name: "Reports",
      parentId: null,
    });
    expect(api.patch).toHaveBeenCalledWith("/directories/1", {
      name: "Annual reports",
    });
    expect(api.delete).toHaveBeenCalledWith("/directories/1");
  });

  it("uses the summary, accessible list, and idempotent visit contracts", async () => {
    jest
      .mocked(api.get)
      .mockResolvedValueOnce({ data: { recent: [], mostUsed: [] } })
      .mockResolvedValueOnce({
        data: {
          data: [],
          meta: { page: 2, limit: 10, total: 0, totalPages: 0 },
        },
      });
    jest.mocked(api.post).mockResolvedValueOnce({ data: undefined });

    await documentsService.getDirectoryNavigationSummary();
    await documentsService.getAccessibleDirectories({ page: 2, limit: 10 });
    await documentsService.recordDirectoryVisit(9, "event-uuid");

    expect(api.get).toHaveBeenNthCalledWith(1, "/directories/summary");
    expect(api.get).toHaveBeenNthCalledWith(2, "/directories/accessible", {
      params: { page: 2, limit: 10 },
    });
    expect(api.post).toHaveBeenCalledWith("/directories/9/visits", {
      eventId: "event-uuid",
    });
  });

  it("moves a document and sends an upload destination", async () => {
    jest.mocked(api.patch).mockResolvedValueOnce({ data: { id: 8 } });
    await documentsService.moveToDirectory(8, null);
    expect(api.patch).toHaveBeenCalledWith("/documents/8/directory", {
      directoryId: null,
    });

    jest.mocked(api.post).mockResolvedValueOnce({ data: { id: 8 } });
    await documentsService.upload(new File(["content"], "notes.txt"), {
      description: "Agenda",
      directoryId: 4,
      documentTypeId: 12,
    });
    const formData = jest.mocked(api.post).mock.calls.at(-1)?.[1] as FormData;
    expect(formData.get("directoryId")).toBe("4");
  });
});

describe("documentsService upload metadata", () => {
  it.each(["single", "multiple"] as const)("serializes trimmed optional name and number in %s uploads and omits blanks", async (mode) => {
    jest.mocked(api.post).mockResolvedValue({ data: mode === "single" ? { id: 1 } : [] });
    const file = new File(["x"], "original.txt");
    for (const value of ["  manual / 7  ", "  "]) {
      const data = { description: "Agenda", documentTypeId: 12, name: value, documentNumber: value };
      if (mode === "single") await documentsService.upload(file, data);
      else await documentsService.uploadMultiple([file], [data]);
      const form = jest.mocked(api.post).mock.calls.at(-1)![1] as FormData;
      const fields = mode === "single" ? Object.fromEntries(form.entries()) : JSON.parse(form.get("metadata") as string)[0];
      if (value.trim()) expect(fields).toMatchObject({ name: "manual / 7", documentNumber: "manual / 7" });
      else {
        expect(fields).not.toHaveProperty("name");
        expect(fields).not.toHaveProperty("documentNumber");
      }
    }
  });
  it.each(["single", "multiple"] as const)(
    "omits manual year, course and subject in %s uploads",
    async (mode) => {
      const file = new File(["content"], "notes.txt");
      for (const academicYearId of [2, undefined]) {
        jest
          .mocked(api.post)
          .mockResolvedValueOnce({ data: mode === "single" ? { id: 1 } : [] });
        const data = {
          documentTypeId: 12,
          academicYearId,
          courseId: 3,
          subjectId: 4,
          description: "Existing description",
          originDate: "2024-02-29",
        };
        if (mode === "single") await documentsService.upload(file, data);
        else await documentsService.uploadMultiple([file], [data]);
        const payload = jest.mocked(api.post).mock.calls.at(-1)![1] as FormData;
        expect(payload.get("academic")).toBeNull();
        const fields =
          mode === "single"
            ? Object.fromEntries(payload.entries())
            : JSON.parse(payload.get("metadata") as string)[0];
        expect(fields).toMatchObject({
          description: "Existing description",
          documentTypeId: mode === "single" ? "12" : 12,
          originDate: "2024-02-29",
        });
        expect(fields).not.toHaveProperty("academicYearId");
        expect(fields).not.toHaveProperty("courseId");
        expect(fields).not.toHaveProperty("subjectId");
      }
    },
  );

  it.each(["single", "multiple"] as const)(
    "trims required descriptions in %s upload FormData",
    async (mode) => {
      const file = new File(["content"], "notes.txt");
      for (const description of ["  Meeting agenda\nFollow-up  "]) {
        jest
          .mocked(api.post)
          .mockResolvedValueOnce({ data: mode === "single" ? { id: 1 } : [] });
        const metadata = { documentTypeId: 12, description };
        if (mode === "single") await documentsService.upload(file, metadata);
        else await documentsService.uploadMultiple([file], [metadata]);

        const [endpoint, payload] = jest.mocked(api.post).mock.calls.at(-1)!;
        const formData = payload as FormData;
        expect(endpoint).toBe(
          mode === "single"
            ? "/documents/upload"
            : "/documents/upload-multiple",
        );
        const fields =
          mode === "single"
            ? Object.fromEntries(formData.entries())
            : JSON.parse(formData.get("metadata") as string)[0];
        expect(fields.description).toBe(description.trim());
        expect(String(fields.documentTypeId)).toBe("12");
      }
    },
  );

  it("includes the selected document type in a single-file upload", async () => {
    jest.mocked(api.post).mockResolvedValueOnce({ data: { id: 1 } });

    await documentsService.upload(new File(["content"], "notes.txt"), {
      description: "Agenda",
      documentTypeId: 12,
    });

    const formData = jest.mocked(api.post).mock.calls[0][1] as FormData;
    expect(formData.get("documentTypeId")).toBe("12");
  });

  it("uses ordered independent metadata and a common destination for a batch", async () => {
    jest.mocked(api.post).mockResolvedValueOnce({ data: [] });
    const files = [new File(["one"], "one.txt"), new File(["two"], "two.txt")];

    await documentsService.uploadMultiple(
      files,
      [
        { documentTypeId: 12, description: "One" },
        { documentTypeId: 13, description: "Two" },
      ],
      7,
    );

    const formData = jest.mocked(api.post).mock.calls[0][1] as FormData;
    expect(formData.getAll("files")).toHaveLength(2);
    expect(JSON.parse(formData.get("metadata") as string)).toEqual([
      { documentTypeId: 12, description: "One" },
      { documentTypeId: 13, description: "Two" },
    ]);
    expect(formData.get("directoryId")).toBe("7");
  });
  it.each(["single", "multiple"] as const)(
    "forwards Axios transport percentage for %s",
    async (mode) => {
      jest
        .mocked(api.post)
        .mockResolvedValue({ data: mode === "single" ? { id: 1 } : [] });
      const onProgress = jest.fn();
      const file = new File(["x"], "one.txt");
      const data = { description: "One", documentTypeId: 12 };
      if (mode === "single")
        await documentsService.upload(file, data, onProgress);
      else
        await documentsService.uploadMultiple([file], [data], null, onProgress);
      const config = jest.mocked(api.post).mock.calls.at(-1)![2]!;
      config.onUploadProgress!({ loaded: 5, total: 10 } as any);
      config.onUploadProgress!({ loaded: 10, total: 10 } as any);
      expect(onProgress.mock.calls).toEqual([[50], [100]]);
    },
  );
  it("rejects missing batch metadata but accepts an omitted description", async () => {
    const file = new File(["x"], "one.txt");
    await expect(documentsService.uploadMultiple([file], [])).rejects.toThrow();
    await expect(
      documentsService.uploadMultiple(
        [file],
        [{ description: " ", documentTypeId: 12 }],
      ),
    ).resolves.toEqual([]);
    const requestBody = jest.mocked(api.post).mock.calls.at(-1)![1] as FormData;
    const metadata = JSON.parse(requestBody.get("metadata") as string);
    expect(metadata).toEqual([{ documentTypeId: 12 }]);
  });

  it("treats a null document type as generic and omits it from both upload contracts", async () => {
    const file = new File(["content"], "notes.txt");
    jest.mocked(api.post).mockResolvedValueOnce({ data: { id: 1 } });
    await documentsService.upload(file, {
      description: "Agenda",
      documentTypeId: null,
    });
    const single = jest.mocked(api.post).mock.calls.at(-1)![1] as FormData;
    expect(single.has("documentTypeId")).toBe(false);
    expect(single.get("description")).toBe("Agenda");

    jest.mocked(api.post).mockResolvedValueOnce({ data: [] });
    await documentsService.uploadMultiple([file], [
      { description: "Agenda", documentTypeId: null },
    ]);
    const batch = jest.mocked(api.post).mock.calls.at(-1)![1] as FormData;
    expect(JSON.parse(batch.get("metadata") as string)).toEqual([
      { description: "Agenda" },
    ]);
  });

  it.each([0, -1, 1.5, "12"])(
    "rejects an invalid concrete document type %p",
    async (documentTypeId) => {
      const file = new File(["content"], "notes.txt");
      await expect(
        documentsService.upload(file, { documentTypeId } as any),
      ).rejects.toThrow(/tipo de documento/);
      await expect(
        documentsService.uploadMultiple([file], [{ documentTypeId } as any]),
      ).rejects.toThrow(/tipo de documento/);
    },
  );
});

describe("documentsService document audit trail", () => {
  it("requests the per-document audit endpoint with typed pagination", async () => {
    const page = {
      data: [{ id: "audit-1", action: "VIEW", resource: "DOCUMENT" }],
      total: 25,
      page: 2,
      limit: 20,
      totalPages: 2,
    };
    jest.mocked(api.get).mockResolvedValueOnce({ data: page });
    await expect(documentsService.getAudit(42, { page: 2, limit: 20 })).resolves.toEqual(page);
    expect(api.get).toHaveBeenCalledWith("/documents/42/audit", {
      params: { page: 2, limit: 20 },
    });
  });

  it("derives totalPages when the backend omits it", async () => {
    jest.mocked(api.get).mockResolvedValueOnce({
      data: { data: [], total: 45, page: 1, limit: 20 },
    });
    await expect(documentsService.getAudit(42, { page: 1, limit: 20 })).resolves.toMatchObject({
      data: [],
      total: 45,
      page: 1,
      limit: 20,
      totalPages: 3,
    });
  });

  it("accepts the backend wire page where totalPages is optional and normalizes it", async () => {
    const wirePage: DocumentAuditPageWire = {
      data: [],
      total: 45,
      page: 1,
      limit: 20,
    };
    jest.mocked(api.get).mockResolvedValueOnce({ data: wirePage });
    await expect(
      documentsService.getAudit(42, { page: 1, limit: 20 }),
    ).resolves.toEqual({
      data: [],
      total: 45,
      page: 1,
      limit: 20,
      totalPages: 3,
    });
  });
});
