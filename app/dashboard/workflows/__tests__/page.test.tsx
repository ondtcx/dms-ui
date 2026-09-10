import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import WorkflowsPage from "@/app/dashboard/workflows/page";
import { workflowsService } from "@/lib/services/workflows.service";

let canManage = true;

jest.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ hasPermission: () => canManage }),
}));

jest.mock("@/lib/services/workflows.service", () => ({
  workflowsService: {
    getDefinitions: jest.fn(),
    getDefinition: jest.fn(),
    createDefinition: jest.fn(),
    createVersion: jest.fn(),
    validate: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
  },
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const definitions = [
  {
    id: 1,
    name: "Aprobación institucional",
    description: "Revisión para documentos oficiales",
    isActive: true,
    allowedInitiatorRoles: ["secretary"],
    versions: [
      {
        id: 11,
        templateId: 1,
        version: 1,
        isActive: false,
        snapshot: {},
        stages: [
          { id: 111, order: 2, roleKey: "director" },
          { id: 112, order: 1, roleKey: "secretary" },
        ],
      },
      {
        id: 12,
        templateId: 1,
        version: 2,
        isActive: true,
        snapshot: {},
        stages: [{ id: 121, order: 1, roleKey: "rector" }],
      },
    ],
  },
];

const originalWorkflowFeatureValue = process.env.NEXT_PUBLIC_WORKFLOW_FEATURE_ENABLED;

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <WorkflowsPage />
    </QueryClientProvider>,
  );
}

describe("Workflow administration definition states", () => {
  beforeEach(() => {
    canManage = true;
    process.env.NEXT_PUBLIC_WORKFLOW_FEATURE_ENABLED = "true";
    jest.mocked(workflowsService.getDefinitions).mockReset();
    jest.mocked(workflowsService.getDefinition).mockReset();
    jest
      .mocked(workflowsService.getDefinition)
      .mockResolvedValue(definitions[0]);
  });

  afterEach(() => {
    if (originalWorkflowFeatureValue === undefined) {
      delete process.env.NEXT_PUBLIC_WORKFLOW_FEATURE_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_WORKFLOW_FEATURE_ENABLED = originalWorkflowFeatureValue;
    }
  });

  it("keeps workflow data and mutation controls absent for an unauthorized bookmark", () => {
    canManage = false;
    renderPage();

    expect(
      screen.getByText("No tienes permiso para administrar flujos de trabajo."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Definiciones existentes"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /crear|activar/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps the guarded administration surface available for an authorized bookmark", async () => {
    jest.mocked(workflowsService.getDefinitions).mockResolvedValue(definitions);
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Flujos de trabajo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Crear definición" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No tienes permiso para administrar flujos de trabajo."),
    ).not.toBeInTheDocument();
  });

  it("renders loading without empty or definition details", async () => {
    jest
      .mocked(workflowsService.getDefinitions)
      .mockImplementation(() => new Promise(() => {}));
    renderPage();

    expect(
      await screen.findByText("Cargando definiciones..."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Todavía no hay definiciones. Crea la primera para empezar a usar flujos de trabajo.",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Aprobación institucional"),
    ).not.toBeInTheDocument();
  });

  it("renders an actionable error without empty or definition details", async () => {
    jest
      .mocked(workflowsService.getDefinitions)
      .mockRejectedValue(new Error("offline"));
    renderPage();

    expect(
      await screen.findByText(
        "No se pudieron cargar las definiciones. Intenta nuevamente.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Todavía no hay definiciones. Crea la primera para empezar a usar flujos de trabajo.",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Aprobación institucional"),
    ).not.toBeInTheDocument();
  });

  it("renders the empty explanation without definition details", async () => {
    jest.mocked(workflowsService.getDefinitions).mockResolvedValue([]);
    renderPage();

    expect(
      await screen.findByText(
        "Todavía no hay definiciones. Crea la primera para empezar a usar flujos de trabajo.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Aprobación institucional"),
    ).not.toBeInTheDocument();
  });

  it("renders every version and its stages in configured order", async () => {
    jest.mocked(workflowsService.getDefinitions).mockResolvedValue(definitions);
    renderPage();

    expect(
      await screen.findByText("Aprobación institucional"),
    ).toBeInTheDocument();
    expect(await screen.findByText("Versión 1")).toBeInTheDocument();
    expect(await screen.findByText("Versión 2")).toBeInTheDocument();
    expect(
      screen.getByText("Ruta: 1. secretary → 2. director"),
    ).toBeInTheDocument();
    expect(screen.getByText("Ruta: 1. rector")).toBeInTheDocument();
    expect(
      screen.queryByText("Cargando definiciones..."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Todavía no hay definiciones. Crea la primera para empezar a usar flujos de trabajo.",
      ),
    ).not.toBeInTheDocument();
  });

  it("does not expose a definition-level activation shortcut", async () => {
    jest.mocked(workflowsService.getDefinitions).mockResolvedValue([
      {
        ...definitions[0],
        versions: definitions[0].versions.map((version) =>
          version.id === 12 ? { ...version, isActive: false } : version,
        ),
      },
    ]);
    renderPage();

    expect(await screen.findByText("Versión 2")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Activar" }),
    ).not.toBeInTheDocument();
  });

  it("keeps activation disabled until the selected version is validated", async () => {
    jest
      .mocked(workflowsService.getDefinitions)
      .mockResolvedValue([{ ...definitions[0], isActive: false }]);
    renderPage();

    expect(await screen.findByText("Versión 2")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Activar versión" }),
    ).toBeDisabled();
  });
});
