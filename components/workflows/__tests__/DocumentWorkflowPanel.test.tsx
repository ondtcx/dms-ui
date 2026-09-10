import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DocumentWorkflowPanel } from "@/components/workflows/DocumentWorkflowPanel";
import { getWorkflowTraceability } from "@/lib/document-traceability";
import { workflowsService } from "@/lib/services/workflows.service";
import type { ApplicableWorkflowDefinition } from "@/lib/types/workflows";

const hasPermission = jest.fn(() => true);

jest.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1", role: "secretary" } }),
}));

jest.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ hasPermission, isAdmin: () => false }),
}));

jest.mock("@/lib/services/workflows.service", () => ({
  workflowsService: {
    history: jest.fn(),
    getStartableDefinitions: jest.fn(),
    start: jest.fn(),
    transition: jest.fn(),
    reassign: jest.fn(),
  },
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <select aria-label="Flujo de trabajo aplicable" value={value} onChange={(event) => onValueChange(event.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: () => <option value="">Selecciona una definición</option>,
}));

const definitions: ApplicableWorkflowDefinition[] = [{
  id: 10,
  name: "Aprobación institucional",
  description: "Documentos oficiales",
  categoryId: null,
  allowedInitiatorRoles: ["secretary"],
  isActive: true,
  versions: [{
    id: 20,
    templateId: 10,
    version: 2,
    isActive: true,
    snapshot: {},
    stages: [{ id: 30, order: 1, roleKey: "rector" }],
  }],
}];

const originalWorkflowFeatureValue = process.env.NEXT_PUBLIC_WORKFLOW_FEATURE_ENABLED;

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DocumentWorkflowPanel documentId={123} documentOwnerId="user-1" />
    </QueryClientProvider>,
  );
}

describe("workflow event traceability", () => {
  it("keeps workflow events separate and labels supplied actor and timestamp", () => {
    expect(getWorkflowTraceability({ action: "APPROVE", performedBy: "Ana", createdAt: "2026-09-01T10:00:00.000Z" })).toEqual({
      label: "Aprobar",
      actor: "Ana",
      time: "2026-09-01T10:00:00.000Z",
    });
  });

  it("uses explicit fallbacks for partial workflow metadata", () => {
    expect(getWorkflowTraceability({ action: "REJECT", performedBy: null, createdAt: null })).toEqual({
      label: "Rechazar",
      actor: "Actor no disponible",
      time: "Fecha no disponible",
    });
  });
});

describe("document workflow initiation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_WORKFLOW_FEATURE_ENABLED = "true";
    hasPermission.mockReturnValue(true);
    jest.mocked(workflowsService.history).mockResolvedValue([]);
    jest.mocked(workflowsService.getStartableDefinitions).mockResolvedValue(definitions);
    jest.mocked(workflowsService.start).mockResolvedValue({} as any);
  });

  afterEach(() => {
    if (originalWorkflowFeatureValue === undefined) {
      delete process.env.NEXT_PUBLIC_WORKFLOW_FEATURE_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_WORKFLOW_FEATURE_ENABLED = originalWorkflowFeatureValue;
    }
  });

  it("does not request workflow data when the feature is disabled", async () => {
    process.env.NEXT_PUBLIC_WORKFLOW_FEATURE_ENABLED = "false";

    renderPanel();

    expect(await screen.findByText("Los flujos de trabajo están desactivados para este entorno.")).toBeInTheDocument();
    expect(workflowsService.history).not.toHaveBeenCalled();
    expect(workflowsService.getStartableDefinitions).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Iniciar flujo de trabajo" })).not.toBeInTheDocument();
  });

  it("keeps a single applicable version unselected until the user explicitly selects it", async () => {
    renderPanel();

    await screen.findByRole("button", { name: "Iniciar flujo de trabajo" });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar flujo de trabajo" }));

    const confirm = screen.getByRole("button", { name: "Confirmar" });
    expect(confirm).toBeDisabled();
    expect(screen.getByRole("option", { name: "Aprobación institucional · versión 2" })).toBeInTheDocument();
  });

  it("starts only the explicitly selected applicable version", async () => {
    renderPanel();

    await screen.findByRole("button", { name: "Iniciar flujo de trabajo" });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar flujo de trabajo" }));
    fireEvent.change(screen.getByLabelText("Flujo de trabajo aplicable"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(workflowsService.start).toHaveBeenCalledWith(123, { versionId: 20, comment: undefined }));
  });

  it("shows the applicable-definition error without an empty state or initiation action", async () => {
    jest.mocked(workflowsService.getStartableDefinitions).mockRejectedValue(new Error("offline"));
    renderPanel();

    expect(await screen.findByText("No se pudieron cargar los flujos de trabajo aplicables.")).toBeInTheDocument();
    expect(screen.queryByText("No hay flujos de trabajo activos compatibles con este documento.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Iniciar flujo de trabajo" })).not.toBeInTheDocument();
  });

  it("shows applicable-definition loading without empty or selectable content while the query is unresolved", async () => {
    jest.mocked(workflowsService.getStartableDefinitions).mockImplementation(() => new Promise(() => {}));
    renderPanel();

    expect(await screen.findByText("Buscando flujos de trabajo aplicables...")).toBeInTheDocument();
    expect(screen.queryByText("No hay flujos de trabajo activos compatibles con este documento.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Iniciar flujo de trabajo" })).not.toBeInTheDocument();
  });

  it("shows the no-eligible-definition explanation without an initiation action", async () => {
    jest.mocked(workflowsService.getStartableDefinitions).mockResolvedValue([]);
    renderPanel();

    expect(await screen.findByText("No hay flujos de trabajo activos compatibles con este documento.")).toBeInTheDocument();
    expect(screen.queryByText("No se pudieron cargar los flujos de trabajo aplicables.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Iniciar flujo de trabajo" })).not.toBeInTheDocument();
  });

  it("shows a history error without presenting history as empty or allowing initiation", async () => {
    jest.mocked(workflowsService.history).mockRejectedValue(new Error("offline"));
    renderPanel();

    expect(await screen.findByText("No se pudo cargar el historial del flujo de trabajo.")).toBeInTheDocument();
    expect(screen.queryByText("Este documento aún no participa en un flujo de trabajo.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Iniciar flujo de trabajo" })).not.toBeInTheDocument();
  });
});
