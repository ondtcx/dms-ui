import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/react";
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

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));

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

  it("renders recent documents and opens their rows through existing routes", async () => {
    jest.mocked(documentsService.getDashboardSummary).mockResolvedValue({
      ...summary,
      recent: [summary.pendingOfficialization[0], ...summary.recent],
    } as never);

    renderPage();

    expect(await screen.findByRole("heading", { name: "Documentos recientes" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Pendientes de oficialización" })).not.toBeInTheDocument();
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

  it("keeps recent documents navigation when more recent documents exist", async () => {
    jest.mocked(documentsService.getDashboardSummary).mockResolvedValue({
      ...summary,
      recentHasMore: true,
    } as never);
    renderPage();

    const recentSection = screen.getByRole("heading", { name: "Documentos recientes" }).closest("section")!;
    const recentLink = within(recentSection).getByRole("link", { name: /ver todos/i });
    expect(recentLink).toHaveAttribute(
      "href",
      "/dashboard/documents",
    );
  });

  it("keeps recent documents navigation even when the result is bounded", async () => {
    jest.mocked(documentsService.getDashboardSummary).mockResolvedValue(summary as never);
    renderPage();

    const recentSection = screen.getByRole("heading", { name: "Documentos recientes" }).closest("section")!;
    expect(within(recentSection).getByRole("link", { name: /ver todos/i })).toHaveAttribute("href", "/dashboard/documents");
    expect(screen.queryByRole("region", { name: "Pendientes de oficialización" })).not.toBeInTheDocument();
  });

  it("offers documents navigation without the removed secondary shortcuts", async () => {
    jest.mocked(documentsService.getDashboardSummary).mockResolvedValue(summary as never);
    const user = userEvent.setup();
    renderPage();

    const documentsLink = screen.getByRole("link", { name: /ver todos/i });
    expect(documentsLink).toHaveAttribute("href", "/dashboard/documents");
    expect(screen.queryByRole("link", { name: /calendario/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /plantillas/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /usuarios/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /configuración/i })).not.toBeInTheDocument();

    await user.click(documentsLink);
    expect(documentsLink).toHaveAttribute("href", "/dashboard/documents");
  });

  it("shows only the upload options to an ordinary role", async () => {
    mockRole = UserRole.USER;
    jest.mocked(documentsService.getDashboardSummary).mockResolvedValue(summary as never);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /nuevo documento/i }));
    expect(await screen.findByText("Subir Archivo")).toBeInTheDocument();
    expect(screen.getByText("Subir Múltiples Archivos")).toBeInTheDocument();
    expect(screen.queryByText("Desde Plantilla")).not.toBeInTheDocument();
    expect(screen.queryByText("Crear en Editor")).not.toBeInTheDocument();
    expect(screen.queryByText("Generar en Lote")).not.toBeInTheDocument();
    expect(screen.queryByText("Escanear Documento")).not.toBeInTheDocument();
  });

  it("shows only the upload options even for an authorized role", async () => {
    mockRole = UserRole.ADMIN;
    jest.mocked(documentsService.getDashboardSummary).mockResolvedValue(summary as never);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /nuevo documento/i }));
    expect(await screen.findByText("Subir Archivo")).toBeInTheDocument();
    expect(screen.getByText("Subir Múltiples Archivos")).toBeInTheDocument();
    expect(screen.queryByText("Desde Plantilla")).not.toBeInTheDocument();
    expect(screen.queryByText("Crear en Editor")).not.toBeInTheDocument();
    expect(screen.queryByText("Generar en Lote")).not.toBeInTheDocument();
    expect(screen.queryByText("Escanear Documento")).not.toBeInTheDocument();
  });

  it("navigates each upload choice to the matching documents dialog action", async () => {
    jest.mocked(documentsService.getDashboardSummary).mockResolvedValue(summary as never);
    renderPage();

    const trigger = await screen.findByRole("button", { name: /nuevo documento/i });
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByText("Subir Archivo"));
    expect(mockPush).toHaveBeenCalledWith(
      "/dashboard/documents?action=upload-single",
    );

    mockPush.mockClear();
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByText("Subir Múltiples Archivos"));
    expect(mockPush).toHaveBeenCalledWith(
      "/dashboard/documents?action=upload-multiple",
    );
  });

  it("does not restore removed shortcuts for a privileged role", async () => {
    mockRole = UserRole.RECTOR;
    jest.mocked(documentsService.getDashboardSummary).mockResolvedValue(summary as never);
    renderPage();

    expect(await screen.findByRole("link", { name: /documento sin nombre/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /plantillas/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver todos/i })).toHaveAttribute("href", "/dashboard/documents");
  });

  it("renders recent documents independently of an empty pending collection", async () => {
    jest.mocked(documentsService.getDashboardSummary).mockResolvedValue({
      ...summary,
      pendingOfficializationCount: 0,
      pendingOfficialization: [],
    } as never);
    renderPage();
    expect(await screen.findByRole("link", { name: /documento sin nombre/i })).toBeInTheDocument();
    expect(screen.queryByText(/no hay documentos recientes/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver todos/i })).toHaveAttribute(
      "href",
      "/dashboard/documents",
    );
  });

  it("announces unavailable recent documents without presenting an error as an empty list", async () => {
    jest.mocked(documentsService.getDashboardSummary).mockRejectedValue(new Error("offline"));
    renderPage();
    expect(await screen.findByText("Los documentos recientes no están disponibles.")).toHaveAttribute("role", "status");
    expect(screen.queryByText(/no hay documentos recientes/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reintentar/i })).not.toBeInTheDocument();
  });

  it("distinguishes permission denial and preserves documents navigation", async () => {
    jest.mocked(documentsService.getDashboardSummary).mockRejectedValue({ response: { status: 403 } });
    renderPage();

    expect(await screen.findByText("Los documentos recientes no están disponibles por permisos insuficientes.")).toHaveAttribute("role", "status");
    expect(screen.getByRole("link", { name: /ver todos/i })).toHaveAttribute("href", "/dashboard/documents");
    expect(screen.queryByText(/no hay documentos recientes/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /documento sin nombre/i })).not.toBeInTheDocument();
  });

  it("keeps the loading layout accessible while the summary is pending", async () => {
    jest.mocked(documentsService.getDashboardSummary).mockReturnValue(new Promise(() => {}) as never);
    renderPage();

    const loading = screen.getByRole("status", { name: "Cargando documentos" });
    expect(loading).toHaveAttribute("aria-busy", "true");
    expect(loading).toHaveAttribute("aria-live", "polite");
    expect(screen.queryByText(/no hay documentos recientes/i)).not.toBeInTheDocument();
  });

  it("keeps the primary upload action available when recent documents fail", async () => {
    jest.mocked(documentsService.getDashboardSummary).mockRejectedValue(new Error("offline"));
    renderPage();

    expect(await screen.findByText("Los documentos recientes no están disponibles.")).toHaveAttribute("role", "status");
    await userEvent.click(screen.getByRole("button", { name: /nuevo documento/i }));
    await userEvent.click(await screen.findByText("Subir Archivo"));
    expect(mockPush).toHaveBeenCalledWith("/dashboard/documents?action=upload-single");
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
    expect(screen.queryByText(/no están disponibles/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver todos/i })).toHaveAttribute("href", "/dashboard/documents");
  });

  it("preserves long metadata in accessible names and keeps rows link-shaped", async () => {
    const longFilename = `${"acta-de-reunion-".repeat(12)}.pdf`;
    jest.mocked(documentsService.getDashboardSummary).mockResolvedValue({
      ...summary,
      recent: [{ ...summary.pendingOfficialization[0], versions: [{ ...summary.pendingOfficialization[0].versions[0], filename: longFilename }] }],
    } as never);
    renderPage();

    const row = await screen.findByRole("link", { name: new RegExp(longFilename) });
    expect(row).toHaveAttribute("href", "/dashboard/documents/7");
    expect(screen.getByTitle(longFilename)).toBeInTheDocument();
  });

  it("keeps the primary action and document rows in keyboard focus order", async () => {
    jest.mocked(documentsService.getDashboardSummary).mockResolvedValue({ ...summary, recent: [summary.pendingOfficialization[0]] } as never);
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

  it("exposes supplied document number and current version metadata", async () => {
    jest.mocked(documentsService.getDashboardSummary).mockResolvedValue({
      ...summary,
      recent: [{ ...summary.recent[0], documentNumber: "DOC-8", versions: [{ id: 8, version: 3, filename: "acta.pdf", mimetype: "application/pdf", size: 10 }] }],
    } as never);

    renderPage();

    const row = await screen.findByRole("link", { name: /acta\.pdf/i });
    expect(row).toHaveTextContent("DOC-8");
    expect(row).toHaveTextContent("Versión 3");
  });

  it("uses explicit unavailable fallbacks when number and version are absent", async () => {
    jest.mocked(documentsService.getDashboardSummary).mockResolvedValue({
      ...summary,
      recent: [{ ...summary.recent[0], documentNumber: null, versions: [] }],
    } as never);

    renderPage();

    const row = await screen.findByRole("link", { name: /documento sin nombre/i });
    expect(row).toHaveTextContent("Número no disponible");
    expect(row).toHaveTextContent("Versión no disponible");
  });
});
