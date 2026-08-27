import userEvent from "@testing-library/user-event";
import { render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DashboardHomePage from "../page";
import { documentsService } from "@/lib/services/documents.service";
import { UserRole } from "@/lib/types";

let mockRole = UserRole.USER;

jest.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", name: "Ana", role: mockRole },
  }),
}));

jest.mock("@/lib/contexts/SettingsContext", () => ({
  useSettings: () => ({
    settings: {
      institution: { name: "Instituto" },
      schoolYear: { name: "2026", isActive: true },
    },
  }),
}));

jest.mock("@/lib/services/documents.service", () => ({
  documentsService: { getDashboardSummary: jest.fn() },
}));

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

const summary = {
  pendingOfficializationCount: 1,
  pendingOfficialization: [
    {
      id: 7,
      documentNumber: "DOC-7",
      description: null,
      createdAt: "2026-08-20T10:00:00.000Z",
      updatedAt: "2026-08-20T10:00:00.000Z",
      uploadedBy: { id: "user-1", name: "Ana", email: "ana@example.com" },
      category: { id: 1, name: "Notas", color: "#123456", icon: "file" },
      versions: [{ id: 1, version: 1, filename: "notas.docx", mimetype: "application/docx", size: 10 }],
      workflow: { id: 1, status: "DRAFT", currentState: null },
    },
  ],
  pendingHasMore: false,
  recent: [
    {
      id: 8,
      documentNumber: null,
      description: null,
      createdAt: "2026-08-19T10:00:00.000Z",
      updatedAt: "2026-08-19T10:00:00.000Z",
      uploadedBy: { id: "user-1", name: "Ana", email: "ana@example.com" },
      category: null,
      versions: [],
      workflow: null,
    },
  ],
  recentHasMore: false,
  generatedAt: "2026-08-20T10:00:00.000Z",
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DashboardHomePage />
    </QueryClientProvider>,
  );
}

describe("DashboardHomePage", () => {
  beforeEach(() => jest.clearAllMocks());

  afterEach(() => {
    mockRole = UserRole.USER;
  });

  it("renders the work-first hierarchy and opens rows through existing routes", async () => {
    jest.mocked(documentsService.getDashboardSummary).mockResolvedValue(summary as never);

    renderPage();

    expect(await screen.findByRole("heading", { name: "Pendientes de oficialización" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /nuevo documento/i })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /notas\.docx/i })).toHaveAttribute(
      "href",
      "/dashboard/documents/7",
    );
    expect(await screen.findByRole("link", { name: /documento sin nombre/i })).toHaveAttribute(
      "href",
      "/dashboard/documents/8",
    );
    expect(screen.queryByText("Panel de gestión")).not.toBeInTheDocument();
    expect(screen.queryByText("Plantillas")).not.toBeInTheDocument();
    expect(documentsService.getDashboardSummary).toHaveBeenCalledTimes(1);
  });

  it("shows the pending continuation when more pending work exists", async () => {
    jest.mocked(documentsService.getDashboardSummary).mockResolvedValue({
      ...summary,
      pendingHasMore: true,
    } as never);
    renderPage();

    const pendingLink = await screen.findByRole("link", { name: /ver todos/i });
    const pendingSection = pendingLink.closest("section");
    expect(pendingSection).not.toBeNull();
    expect(pendingLink).toHaveAttribute(
      "href",
      "/dashboard/documents",
    );
  });

  it("does not show a pending continuation when the result is bounded", async () => {
    jest.mocked(documentsService.getDashboardSummary).mockResolvedValue(summary as never);
    renderPage();

    const pendingSection = (await screen.findByRole("heading", { name: "Pendientes de oficialización" })).closest("section");
    expect(pendingSection).not.toBeNull();
    expect(within(pendingSection as HTMLElement).queryByRole("link", { name: /ver todos/i })).not.toBeInTheDocument();
  });

  it("allows ordinary users to activate authorized secondary destinations only", async () => {
    jest.mocked(documentsService.getDashboardSummary).mockResolvedValue(summary as never);
    const user = userEvent.setup();
    renderPage();

    const documentsLink = await screen.findByRole("link", { name: /^documentos ver y gestionar$/i });
    const calendarLink = screen.getByRole("link", { name: /^calendario vista por fecha$/i });
    expect(documentsLink).toHaveAttribute("href", "/dashboard/documents");
    expect(calendarLink).toHaveAttribute("href", "/dashboard/calendar");
    expect(screen.queryByRole("link", { name: /plantillas/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /usuarios/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /configuración/i })).not.toBeInTheDocument();

    await user.click(documentsLink);
    await user.click(calendarLink);
    expect(documentsLink).toHaveAttribute("href", "/dashboard/documents");
    expect(calendarLink).toHaveAttribute("href", "/dashboard/calendar");
  });

  it("hides template and batch creation from an ordinary role", async () => {
    mockRole = UserRole.USER;
    jest.mocked(documentsService.getDashboardSummary).mockResolvedValue(summary as never);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /nuevo documento/i }));
    expect(screen.queryByText("Desde Plantilla")).not.toBeInTheDocument();
    expect(screen.queryByText("Generar en Lote")).not.toBeInTheDocument();
  });

  it("shows template and batch creation to an authorized role", async () => {
    mockRole = UserRole.ADMIN;
    jest.mocked(documentsService.getDashboardSummary).mockResolvedValue(summary as never);
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: /nuevo documento/i }));
    await waitFor(() => {
      expect(screen.getByText("Desde Plantilla")).toBeInTheDocument();
      expect(screen.getByText("Generar en Lote")).toBeInTheDocument();
    });
  });

  it("shows the templates quick link to an authorized role", async () => {
    mockRole = UserRole.RECTOR;
    jest.mocked(documentsService.getDashboardSummary).mockResolvedValue(summary as never);
    renderPage();

    expect(await screen.findByText("Plantillas")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /plantillas/i })).toHaveAttribute(
      "href",
      "/dashboard/templates",
    );
  });

  it("distinguishes a successful zero state from an unavailable summary", async () => {
    jest.mocked(documentsService.getDashboardSummary).mockResolvedValue({
      ...summary,
      pendingOfficializationCount: 0,
      pendingOfficialization: [],
    } as never);
    renderPage();
    expect(await screen.findByText(/no hay pendientes de oficialización/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver documentos/i })).toHaveAttribute(
      "href",
      "/dashboard/documents",
    );
  });

  it("offers retry without presenting an error as zero", async () => {
    jest.mocked(documentsService.getDashboardSummary).mockRejectedValue(new Error("offline"));
    renderPage();
    expect(await screen.findByText(/no se pudo cargar el resumen/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
    expect(screen.queryByText(/0 pendientes/i)).not.toBeInTheDocument();
  });

  it("explains permission denial and offers safe retry and navigation", async () => {
    jest.mocked(documentsService.getDashboardSummary).mockRejectedValue({ response: { status: 403 } });
    renderPage();

    expect(await screen.findByText(/no tienes permisos para consultar este resumen/i)).toBeInTheDocument();
    expect(screen.getByText(/tu acceso a los documentos se mantiene protegido/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ir a documentos/i })).toHaveAttribute("href", "/dashboard/documents");
    expect(screen.queryByText(/no se pudo cargar el resumen/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/0 pendientes/i)).not.toBeInTheDocument();
  });

  it("keeps the loading layout accessible while the summary is pending", async () => {
    jest.mocked(documentsService.getDashboardSummary).mockReturnValue(new Promise(() => {}) as never);
    renderPage();

    expect(screen.getByLabelText("Cargando resumen")).toBeInTheDocument();
    expect(screen.getByLabelText("Cargando documentos")).toBeInTheDocument();
    expect(screen.queryByText(/0 pendientes/i)).not.toBeInTheDocument();
  });

  it("announces that the count is unavailable when the summary fails", async () => {
    jest.mocked(documentsService.getDashboardSummary).mockRejectedValue(new Error("offline"));
    renderPage();

    expect((await screen.findByText(/conteo no disponible/i)).parentElement).toHaveAttribute("role", "status");
    expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
  });

  it("distinguishes an empty repository from an unavailable summary", async () => {
    jest.mocked(documentsService.getDashboardSummary).mockResolvedValue({
      ...summary,
      pendingOfficializationCount: 0,
      pendingOfficialization: [],
      recent: [],
    } as never);
    renderPage();

    expect(await screen.findByText(/no hay documentos recientes/i)).toBeInTheDocument();
    expect(screen.getByText(/no hay pendientes de oficialización/i)).toBeInTheDocument();
    expect(screen.queryByText(/no se pudo cargar/i)).not.toBeInTheDocument();
  });

  it("preserves long metadata in accessible names and keeps rows link-shaped", async () => {
    const longFilename = `${"acta-de-reunion-".repeat(12)}.pdf`;
    jest.mocked(documentsService.getDashboardSummary).mockResolvedValue({
      ...summary,
      pendingOfficialization: [{ ...summary.pendingOfficialization[0], versions: [{ ...summary.pendingOfficialization[0].versions[0], filename: longFilename }] }],
    } as never);
    renderPage();

    const row = await screen.findByRole("link", { name: new RegExp(longFilename) });
    expect(row).toHaveAttribute("href", "/dashboard/documents/7");
    expect(screen.getByTitle(longFilename)).toBeInTheDocument();
  });

  it("keeps the primary action and document rows in keyboard focus order", async () => {
    jest.mocked(documentsService.getDashboardSummary).mockResolvedValue({ ...summary, pendingHasMore: true } as never);
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("link", { name: /notas\.docx/i });
    await user.tab();
    expect(document.activeElement).toHaveAccessibleName("Nuevo documento");
    await user.tab();
    expect(document.activeElement).toHaveAccessibleName(/ver todos/i);
    await user.tab();
    expect(document.activeElement).toHaveAccessibleName(/notas\.docx/i);
  });
});
