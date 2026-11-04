import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AuthoringDocumentDetailPage from "../page";
import { authoringService } from "@/lib/services/authoring.service";
import type { AuthoringDocument } from "@/lib/types/authoring";

jest.mock("@/guards/ProtectedRoute", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: () => ({
    user:
      (globalThis as { __mockUser?: unknown }).__mockUser ?? {
        id: 1,
        name: "Ana Torres",
        role: "admin",
      },
  }),
}));

function setMockUser(user: unknown) {
  (globalThis as { __mockUser?: unknown }).__mockUser = user;
}

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "1" }),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/services/authoring.service", () => ({
  authoringService: {
    getDocument: jest.fn(),
    previewDocument: jest.fn(),
    emit: jest.fn(),
    archive: jest.fn(),
    approve: jest.fn(),
    returnDocument: jest.fn(),
  },
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const baseDocument = {
  id: 1,
  name: "Acta de consejo",
  documentNumber: null,
  currentVersion: 2,
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-02T10:00:00.000Z",
  uploadedBy: { id: "user-1", name: "Ana Torres" },
  templateData: {
    template: { id: 3, name: "Acta institucional" },
  },
  versions: [],
  contentVersions: [],
  authoring: {
    id: 10,
    status: "APPROVED",
    events: [],
  },
} as unknown as AuthoringDocument;

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AuthoringDocumentDetailPage />
    </QueryClientProvider>,
  );
}

describe("Authoring document detail protections", () => {
  beforeAll(() => {
    global.URL.createObjectURL = jest.fn(() => "blob:preview");
    global.URL.revokeObjectURL = jest.fn();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    setMockUser(undefined);
    jest.mocked(authoringService.previewDocument).mockResolvedValue(
      new Blob(["pdf"], { type: "application/pdf" }),
    );
  });

  it("requires confirmation before emitting and shows the assigned number afterwards", async () => {
    setMockUser({ id: "user-1", name: "Ana Torres", role: "secretario" });
    let current = baseDocument;
    const emitted = {
      ...baseDocument,
      documentNumber: "DOC-2026-0007",
      authoring: {
        ...baseDocument.authoring,
        status: "EMITTED",
        emittedAt: "2026-11-04T10:00:00.000Z",
        emittedByName: "Ana Torres",
      },
    } as unknown as AuthoringDocument;
    jest
      .mocked(authoringService.getDocument)
      .mockImplementation(() => Promise.resolve(current));
    jest.mocked(authoringService.emit).mockImplementation(() => {
      current = emitted;
      return Promise.resolve(emitted);
    });

    mount();
    await screen.findByRole("heading", { name: "Acta de consejo" });

    fireEvent.click(
      screen.getByRole("button", { name: "Emitir y numerar" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Acta institucional/)).toBeInTheDocument();
    expect(authoringService.emit).not.toHaveBeenCalled();

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Emitir y numerar" }),
    );

    await waitFor(() =>
      expect(authoringService.emit).toHaveBeenCalledWith(baseDocument.id),
    );
    expect((await screen.findAllByText("DOC-2026-0007")).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: "Auditar accesos" }),
    ).toHaveAttribute("href", "/dashboard/documents/1/audit");
  });

  it("does not offer emission to a reviewer who is not the creator", async () => {
    setMockUser({ id: "reviewer-1", name: "Revisor", role: "rector" });
    jest.mocked(authoringService.getDocument).mockResolvedValue(baseDocument);

    mount();
    await screen.findByRole("heading", { name: "Acta de consejo" });

    expect(
      screen.queryByRole("button", { name: "Emitir y numerar" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Solo el creador puede emitirlo/),
    ).toBeInTheDocument();
  });

  it("requires confirmation before archiving an emitted document", async () => {
    const emitted = {
      ...baseDocument,
      documentNumber: "DOC-2026-0007",
      authoring: {
        ...baseDocument.authoring,
        status: "EMITTED",
        emittedAt: "2026-11-04T10:00:00.000Z",
      },
    } as unknown as AuthoringDocument;
    jest.mocked(authoringService.getDocument).mockResolvedValue(emitted);
    jest.mocked(authoringService.archive).mockResolvedValue({
      ...emitted,
      authoring: { ...emitted.authoring, status: "ARCHIVED" },
    });

    mount();
    await screen.findByRole("heading", { name: "Acta de consejo" });

    fireEvent.click(screen.getByRole("button", { name: "Archivar" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/quedará archivado/)).toBeInTheDocument();
    expect(authoringService.archive).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Archivar" }));

    await waitFor(() =>
      expect(authoringService.archive).toHaveBeenCalledWith(emitted.id),
    );
  });

  it("hides review actions when another user is the assigned reviewer", async () => {
    setMockUser({ id: 1, name: "Ana Torres", role: "rector" });
    jest.mocked(authoringService.getDocument).mockResolvedValue({
      ...baseDocument,
      authoring: {
        ...baseDocument.authoring,
        status: "IN_REVIEW",
        reviewerId: 99,
        reviewerName: "Otro Revisor",
      },
    } as unknown as AuthoringDocument);

    mount();

    expect(await screen.findByText("Otro Revisor")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Aprobar" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Devolver" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/solo el revisor asignado puede aprobar o devolver/i),
    ).toBeInTheDocument();
  });

  it("explains the fallback when no reviewer is assigned", async () => {
    setMockUser({ id: 1, name: "Ana Torres", role: "docente" });
    jest.mocked(authoringService.getDocument).mockResolvedValue({
      ...baseDocument,
      authoring: {
        ...baseDocument.authoring,
        status: "IN_REVIEW",
        reviewerId: null,
        reviewerName: null,
      },
    } as unknown as AuthoringDocument);

    mount();

    expect(await screen.findByText(/sin revisor asignado/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Aprobar" }),
    ).not.toBeInTheDocument();
  });

  it("shows review actions to the assigned reviewer", async () => {
    setMockUser({ id: 1, name: "Ana Torres", role: "docente" });
    jest.mocked(authoringService.getDocument).mockResolvedValue({
      ...baseDocument,
      authoring: {
        ...baseDocument.authoring,
        status: "IN_REVIEW",
        reviewerId: 1,
        reviewerName: "Ana Torres",
      },
    } as unknown as AuthoringDocument);

    mount();

    expect(
      await screen.findByRole("button", { name: "Aprobar" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Devolver" })).toBeInTheDocument();
  });

  it("shows the server reason when emission fails and keeps the dialog open", async () => {
    setMockUser({ id: "user-1", name: "Ana Torres", role: "secretario" });
    jest.mocked(authoringService.getDocument).mockResolvedValue(baseDocument);
    jest.mocked(authoringService.emit).mockRejectedValue({
      response: {
        data: {
          message: ["Falta el número de acta", "Falta la fecha de emisión"],
        },
      },
    });

    mount();
    await screen.findByRole("heading", { name: "Acta de consejo" });

    fireEvent.click(screen.getByRole("button", { name: "Emitir y numerar" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Emitir y numerar" }),
    );

    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent(
      /Falta el número de acta; Falta la fecha de emisión/i,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
