import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import WorkflowAdministration from "@/components/workflows/WorkflowAdministration";
import { workflowsService } from "@/lib/services/workflows.service";
import type { WorkflowDefinitionDetail } from "@/lib/types/workflows";

jest.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}));

jest.mock("@/lib/services/workflows.service", () => ({
  workflowsService: {
    getDefinitions: jest.fn(),
    getDefinition: jest.fn(),
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

const definition = {
  id: 7,
  name: "Aprobación institucional",
  description: "Revisión para documentos oficiales",
  isActive: true,
  allowedInitiatorRoles: ["secretary"],
  versions: [
    {
      id: 12,
      templateId: 7,
      version: 2,
      isActive: true,
      snapshot: {},
      stages: [
        { id: 121, order: 2, roleKey: "rector" },
        { id: 120, order: 1, roleKey: "secretary" },
      ],
    },
  ],
};

const detail = {
  ...definition,
  counts: { versions: 1, executions: 3, usage: 3, executionHistory: 2 },
  usage: { executionCount: 3, activeCount: 1 },
  history: [{ id: 99, status: "APPROVED", currentState: "Finalizado" }],
} as unknown as WorkflowDefinitionDetail;

const originalWorkflowFeatureValue = process.env.NEXT_PUBLIC_WORKFLOW_FEATURE_ENABLED;

function renderSurface() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <WorkflowAdministration />
    </QueryClientProvider>,
  );
}

describe("WorkflowAdministration", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_WORKFLOW_FEATURE_ENABLED = "true";
    jest.mocked(workflowsService.getDefinitions).mockReset();
    jest.mocked(workflowsService.getDefinition).mockReset();
    jest.mocked(workflowsService.createVersion).mockReset();
    jest.mocked(workflowsService.validate).mockReset();
    jest.mocked(workflowsService.activate).mockReset();
    jest.mocked(workflowsService.deactivate).mockReset();
  });

  afterEach(() => {
    if (originalWorkflowFeatureValue === undefined) {
      delete process.env.NEXT_PUBLIC_WORKFLOW_FEATURE_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_WORKFLOW_FEATURE_ENABLED = originalWorkflowFeatureValue;
    }
  });

  it("does not query workflow definitions when the feature is disabled", async () => {
    process.env.NEXT_PUBLIC_WORKFLOW_FEATURE_ENABLED = "false";

    renderSurface();

    expect(await screen.findByText("Los flujos de trabajo están desactivados para este entorno.")).toBeInTheDocument();
    expect(workflowsService.getDefinitions).not.toHaveBeenCalled();
    expect(workflowsService.getDefinition).not.toHaveBeenCalled();
  });

  it("renders the selected definition detail with ordered stages and read-only history", async () => {
    jest
      .mocked(workflowsService.getDefinitions)
      .mockResolvedValue([definition]);
    jest.mocked(workflowsService.getDefinition).mockResolvedValue(detail);

    renderSurface();

    expect(
      await screen.findByText("Aprobación institucional"),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Uso: 3 ejecuciones · 1 activas"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ruta: 1. secretary → 2. rector"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Historial de ejecuciones (solo lectura)"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /editar historial/i }),
    ).not.toBeInTheDocument();
  });

  it("explains missing usage and history instead of fabricating counts", async () => {
    jest
      .mocked(workflowsService.getDefinitions)
      .mockResolvedValue([definition]);
    jest.mocked(workflowsService.getDefinition).mockResolvedValue({
      ...detail,
      usage: null,
      history: null,
      counts: undefined,
    });

    renderSurface();

    expect(
      await screen.findByText(
        "Uso e historial no disponibles para esta definición.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Uso: 0 ejecuciones/)).not.toBeInTheDocument();
  });

  it("keeps list loading, error, and empty states exclusive", async () => {
    jest
      .mocked(workflowsService.getDefinitions)
      .mockImplementation(() => new Promise(() => {}));
    const loadingView = renderSurface();

    expect(await screen.findByText("Cargando definiciones...")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Todavía no hay definiciones. Crea la primera para empezar a usar flujos de trabajo.",
      ),
    ).not.toBeInTheDocument();
    loadingView.unmount();
    cleanup();

    jest
      .mocked(workflowsService.getDefinitions)
      .mockRejectedValue(new Error("offline"));
    renderSurface();

    expect(
      await screen.findByText(
        "No se pudieron cargar las definiciones. Intenta nuevamente.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Cargando definiciones...")).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Todavía no hay definiciones. Crea la primera para empezar a usar flujos de trabajo.",
      ),
    ).not.toBeInTheDocument();

    cleanup();
    jest.mocked(workflowsService.getDefinitions).mockResolvedValue([]);
    renderSurface();

    expect(
      await screen.findByText(
        "Todavía no hay definiciones. Crea la primera para empezar a usar flujos de trabajo.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Cargando definiciones...")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps detail loading, error, and empty states exclusive", async () => {
    jest.mocked(workflowsService.getDefinitions).mockResolvedValue([definition]);
    jest
      .mocked(workflowsService.getDefinition)
      .mockImplementation(() => new Promise(() => {}));
    const loadingView = renderSurface();

    expect(await screen.findByText("Cargando detalle...")).toBeInTheDocument();
    expect(screen.queryByText("No se pudo cargar el detalle. Intenta nuevamente.")).not.toBeInTheDocument();
    expect(screen.queryByText("No hay detalle disponible para esta definición.")).not.toBeInTheDocument();
    loadingView.unmount();
    cleanup();

    jest.mocked(workflowsService.getDefinition).mockRejectedValue(new Error("offline"));
    renderSurface();

    expect(await screen.findByText("No se pudo cargar el detalle. Intenta nuevamente.")).toBeInTheDocument();
    expect(screen.queryByText("Cargando detalle...")).not.toBeInTheDocument();
    expect(screen.queryByText("No hay detalle disponible para esta definición.")).not.toBeInTheDocument();

    cleanup();
    jest.mocked(workflowsService.getDefinition).mockResolvedValue(null as unknown as WorkflowDefinitionDetail);
    renderSurface();

    expect(await screen.findByText("No hay detalle disponible para esta definición.")).toBeInTheDocument();
    expect(screen.queryByText("Cargando detalle...")).not.toBeInTheDocument();
    expect(screen.queryByText("No se pudo cargar el detalle. Intenta nuevamente.")).not.toBeInTheDocument();
  });

  it("prevents activation after validation reports an invalid version", async () => {
    const inactiveDefinition = {
      ...definition,
      isActive: false,
      versions: definition.versions.map((version) => ({
        ...version,
        isActive: false,
      })),
    };
    jest
      .mocked(workflowsService.getDefinitions)
      .mockResolvedValue([inactiveDefinition]);
    jest
      .mocked(workflowsService.getDefinition)
      .mockResolvedValue({ ...detail, ...inactiveDefinition });
    jest.mocked(workflowsService.validate).mockResolvedValue({
      versionId: 12,
      valid: false,
      issues: [{ path: "stages", message: "Debe existir una etapa" }],
    });

    renderSurface();

    const activateButton = await screen.findByRole("button", {
      name: "Activar versión",
    });
    expect(activateButton).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Validar versión" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "stages: Debe existir una etapa",
    );
    expect(activateButton).toBeDisabled();
    expect(workflowsService.activate).not.toHaveBeenCalled();
  });

  it("activates and deactivates the selected version after valid validation", async () => {
    const detailForState = (isActive: boolean) => ({
      ...detail,
      isActive,
      versions: detail.versions.map((version) => ({ ...version, isActive })),
    });
    let currentDetail = detailForState(false);

    jest
      .mocked(workflowsService.getDefinitions)
      .mockResolvedValue([detailForState(false)]);
    jest
      .mocked(workflowsService.getDefinition)
      .mockImplementation(async () => currentDetail);
    jest.mocked(workflowsService.validate).mockResolvedValue({
      versionId: 12,
      valid: true,
      issues: [],
    });
    jest.mocked(workflowsService.activate).mockImplementation(
      async (templateId, versionId) => {
        currentDetail = detailForState(true);
        return currentDetail.versions[0];
      },
    );
    jest.mocked(workflowsService.deactivate).mockImplementation(
      async (templateId, versionId) => {
        currentDetail = detailForState(false);
        return currentDetail.versions[0];
      },
    );

    renderSurface();

    const activateButton = await screen.findByRole("button", {
      name: "Activar versión",
    });
    expect(activateButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Validar versión" }));
    await waitFor(() =>
      expect(workflowsService.validate).toHaveBeenCalledWith(7, 12),
    );
    expect(await screen.findByRole("button", { name: "Activar versión" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Activar versión" }));
    await waitFor(() =>
      expect(workflowsService.activate).toHaveBeenCalledWith(7, 12),
    );
    expect(await screen.findByRole("button", { name: "Desactivar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Activar versión" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Activa", { exact: true })).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Desactivar" }));
    await waitFor(() =>
      expect(workflowsService.deactivate).toHaveBeenCalledWith(7, 12),
    );
    expect(await screen.findByRole("button", { name: "Activar versión" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desactivar" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Inactiva", { exact: true })).toHaveLength(2);
  });

  it("creates a new version from an immutable historical version", async () => {
    jest.mocked(workflowsService.getDefinitions).mockResolvedValue([definition]);
    jest.mocked(workflowsService.getDefinition).mockResolvedValue(detail);
    jest.mocked(workflowsService.createVersion).mockResolvedValue({} as never);

    renderSurface();

    await screen.findByText("Versión 2");
    fireEvent.click(
      screen.getByRole("button", { name: "Editar como nueva versión" }),
    );
    fireEvent.change(screen.getByLabelText("Rol de nueva etapa 1"), {
      target: { value: "coordinator" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar nueva versión" }));

    await waitFor(() =>
      expect(workflowsService.createVersion).toHaveBeenCalledWith(7, {
        baseVersionId: 12,
        stages: [
          { id: 120, order: 1, roleKey: "coordinator" },
          { id: 121, order: 2, roleKey: "rector" },
        ],
      }),
    );
    expect(screen.getByText("Historial de ejecuciones (solo lectura)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /editar historial/i })).not.toBeInTheDocument();
  });

  it("prevents duplicate new-version submissions while the mutation is pending", async () => {
    let resolveVersion: (value: unknown) => void = () => undefined;
    const pendingVersion = new Promise((resolve) => {
      resolveVersion = resolve;
    });
    jest.mocked(workflowsService.getDefinitions).mockResolvedValue([definition]);
    jest.mocked(workflowsService.getDefinition).mockResolvedValue(detail);
    jest.mocked(workflowsService.createVersion).mockReturnValue(pendingVersion as never);

    renderSurface();

    await screen.findByText("Versión 2");
    fireEvent.click(
      screen.getByRole("button", { name: "Editar como nueva versión" }),
    );
    const saveButton = screen.getByRole("button", {
      name: "Guardar nueva versión",
    });
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);

    await waitFor(() => expect(saveButton).toBeDisabled());
    expect(workflowsService.createVersion).toHaveBeenCalledTimes(1);
    resolveVersion({});
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Guardar nueva versión" }),
      ).not.toBeInTheDocument(),
    );
  });
});
