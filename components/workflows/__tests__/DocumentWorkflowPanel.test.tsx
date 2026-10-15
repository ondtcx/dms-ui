import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { DocumentWorkflowPanel } from "@/components/workflows/DocumentWorkflowPanel";
import { getWorkflowTraceability } from "@/lib/document-traceability";
import { workflowsService } from "@/lib/services/workflows.service";
import type { WorkflowActionCapabilities } from "@/lib/workflow-action-capabilities";
import { WorkflowStatus, WorkflowTransitionAction, type ApplicableWorkflowDefinition, type WorkflowAssignment, type WorkflowExecution } from "@/lib/types/workflows";

const hasPermission = jest.fn(() => true);
const isAdmin = jest.fn(() => false);

jest.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1", role: "secretary" } }),
}));

jest.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ hasPermission, isAdmin }),
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

function renderPanel(props: { documentVersionId?: number } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <DocumentWorkflowPanel documentId={123} documentOwnerId="user-1" {...props} />
    </QueryClientProvider>,
  );
  return { ...view, queryClient };
}

function caps(overrides: Partial<WorkflowActionCapabilities> = {}): WorkflowActionCapabilities {
  return {
    scope: "ordinary",
    submit: false,
    approve: true,
    requestChanges: true,
    reject: true,
    cancel: true,
    reassign: true,
    reassignAssignmentIds: [1],
    ...overrides,
  };
}

const boundExecution = (overrides: Partial<WorkflowExecution> = {}): WorkflowExecution => ({
  id: 90,
  documentId: 123,
  status: WorkflowStatus.IN_PROGRESS,
  currentState: "rector",
  currentStateOrder: 1,
  active: true,
  initiatedById: "user-2",
  documentVersionId: 55,
  actionCapabilities: caps(),
  definitionVersion: definitions[0].versions[0],
  assignments: [{
    id: 1,
    workflowId: 90,
    stageDefinitionId: 30,
    userId: "user-1",
    roleKeySnapshot: "rector",
    status: "PENDING",
    stageDefinition: { order: 1, roleKey: "rector" },
  }],
  transitions: [],
  events: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
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

  it.each([undefined, "false", "malformed"])("allows authorized initiation despite legacy flag %s", async (value) => {
    if (value === undefined) delete process.env.NEXT_PUBLIC_WORKFLOW_FEATURE_ENABLED;
    else process.env.NEXT_PUBLIC_WORKFLOW_FEATURE_ENABLED = value;

    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Iniciar flujo de trabajo" }));
    fireEvent.change(screen.getByLabelText("Flujo de trabajo aplicable"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(workflowsService.history).toHaveBeenCalledWith(123);
    expect(workflowsService.getStartableDefinitions).toHaveBeenCalledWith(123);
    await waitFor(() => expect(workflowsService.start).toHaveBeenCalledWith(123, { versionId: 20, comment: undefined }));
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

  it("hides the panel when no applicable definitions exist", async () => {
    jest.mocked(workflowsService.getStartableDefinitions).mockResolvedValue([]);
    renderPanel();

    await waitFor(() => expect(screen.queryByText("Flujo de trabajo")).not.toBeInTheDocument());
    expect(screen.queryByText("No se pudieron cargar los flujos de trabajo aplicables.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Iniciar flujo de trabajo" })).not.toBeInTheDocument();
  });

  it("hides the panel when applicable definitions have no versions", async () => {
    jest.mocked(workflowsService.getStartableDefinitions).mockResolvedValue([{ ...definitions[0], versions: [] }]);
    renderPanel();

    await waitFor(() => expect(screen.queryByText("Flujo de trabajo")).not.toBeInTheDocument());
  });

  it.each([undefined, "false", "malformed"])("hides empty history without start permission despite legacy flag %s", async (value) => {
    if (value === undefined) delete process.env.NEXT_PUBLIC_WORKFLOW_FEATURE_ENABLED;
    else process.env.NEXT_PUBLIC_WORKFLOW_FEATURE_ENABLED = value;
    hasPermission.mockReturnValue(false);
    renderPanel();

    await waitFor(() => expect(screen.queryByText("Flujo de trabajo")).not.toBeInTheDocument());
    expect(workflowsService.getStartableDefinitions).not.toHaveBeenCalled();
  });

  it("keeps completed workflow history when no applicable definitions exist", async () => {
    jest.mocked(workflowsService.getStartableDefinitions).mockResolvedValue([]);
    jest.mocked(workflowsService.history).mockResolvedValue([{
      id: 90,
      documentId: 123,
      status: WorkflowStatus.APPROVED,
      currentState: null,
      currentStateOrder: 1,
      active: false,
      initiatedById: "user-1",
      definitionVersion: definitions[0].versions[0],
      assignments: [],
      transitions: [],
      events: [],
      createdAt: "2026-01-01T00:00:00.000Z",
    }]);
    renderPanel();

    expect(await screen.findByText("Etapa actual: Finalizado")).toBeInTheDocument();
    expect(screen.getByText("Historial de transiciones")).toBeInTheDocument();
  });

  it("disables resubmission and explains when the document version is missing", async () => {
    jest.mocked(workflowsService.history).mockResolvedValue([boundExecution({
      status: WorkflowStatus.CHANGES_REQUESTED,
      actionCapabilities: caps({ submit: true }),
    })]);

    renderPanel();

    const submit = await screen.findByRole("button", { name: "Reenviar versión corregida" });
    expect(submit).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("No hay una versión del documento disponible para reenviar.");
    fireEvent.click(submit);
    expect(workflowsService.transition).not.toHaveBeenCalled();
  });

  it("shows a history error without presenting history as empty or allowing initiation", async () => {
    jest.mocked(workflowsService.history).mockRejectedValue(new Error("offline"));
    renderPanel();

    expect(await screen.findByText("No se pudo cargar el historial del flujo de trabajo.")).toBeInTheDocument();
    expect(screen.queryByText("Este documento aún no participa en un flujo de trabajo.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Iniciar flujo de trabajo" })).not.toBeInTheDocument();
  });

  it("keeps history errors visible even when the user cannot start a workflow", async () => {
    hasPermission.mockReturnValue(false);
    jest.mocked(workflowsService.history).mockRejectedValue(new Error("offline"));
    renderPanel();

    expect(await screen.findByText("No se pudo cargar el historial del flujo de trabajo.")).toBeInTheDocument();
    expect(screen.getByText("Flujo de trabajo")).toBeInTheDocument();
  });

  it("keeps the panel visible while history is unresolved despite empty definitions", async () => {
    jest.mocked(workflowsService.history).mockImplementation(() => new Promise(() => {}));
    jest.mocked(workflowsService.getStartableDefinitions).mockResolvedValue([]);
    renderPanel();

    expect(await screen.findByText("Cargando flujo de trabajo...")).toBeInTheDocument();
    expect(screen.getByText("Flujo de trabajo")).toBeInTheDocument();
  });
});

describe("document workflow decision version binding", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hasPermission.mockReturnValue(true);
    jest.mocked(workflowsService.history).mockResolvedValue([boundExecution()]);
    jest.mocked(workflowsService.transition).mockResolvedValue({} as WorkflowExecution);
  });

  it("sends the workflow-bound reviewed version when approving", async () => {
    renderPanel({ documentVersionId: 77 });

    fireEvent.click(await screen.findByRole("button", { name: "Aprobar" }));

    expect(await screen.findByText(/versión revisada vinculada: 55/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(workflowsService.transition).toHaveBeenCalledWith(90, {
      action: WorkflowTransitionAction.APPROVE,
      comment: undefined,
      versionId: 55,
    }));
  });

  it("sends the workflow-bound reviewed version when requesting changes", async () => {
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Solicitar cambios" }));
    fireEvent.change(screen.getByPlaceholderText("Comentario obligatorio"), { target: { value: "Ajustar redacción" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(workflowsService.transition).toHaveBeenCalledWith(90, {
      action: WorkflowTransitionAction.REQUEST_CHANGES,
      comment: "Ajustar redacción",
      versionId: 55,
    }));
  });

  it("sends the workflow-bound reviewed version when rejecting", async () => {
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Rechazar" }));
    fireEvent.change(screen.getByPlaceholderText("Comentario obligatorio"), { target: { value: "No cumple requisitos" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(workflowsService.transition).toHaveBeenCalledWith(90, {
      action: WorkflowTransitionAction.REJECT,
      comment: "No cumple requisitos",
      versionId: 55,
    }));
  });

  it.each([undefined, null, 0, -1, 2.5, Number.NaN])(
    "fails closed with a Spanish alert when the reviewed version is %s",
    async (value) => {
      jest.mocked(workflowsService.history).mockResolvedValue([
        boundExecution({ documentVersionId: value as number | null | undefined }),
      ]);
      renderPanel();

      const approve = await screen.findByRole("button", { name: "Aprobar" });
      expect(approve).toBeDisabled();
      expect(screen.getByRole("alert")).toHaveTextContent("No hay una versión revisada válida");
      fireEvent.click(approve);
      expect(workflowsService.transition).not.toHaveBeenCalled();
    },
  );

  it("blocks confirmation and never switches to the refreshed version after a stale decision", async () => {
    const { queryClient } = renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Aprobar" }));
    queryClient.setQueryData(["document-workflows", "user-1", 123], [boundExecution({ documentVersionId: 99 })]);

    await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled());
    expect(screen.getByText(/cambió/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(workflowsService.transition).not.toHaveBeenCalled();
  });

  it("blocks confirmation when the execution is replaced after opening the decision", async () => {
    const { queryClient } = renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Aprobar" }));
    queryClient.setQueryData(["document-workflows", "user-1", 123], [boundExecution({ id: 91, documentVersionId: 99 })]);

    await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(workflowsService.transition).not.toHaveBeenCalled();
  });

  it("blocks confirmation while the history is refetching", async () => {
    jest.mocked(workflowsService.history).mockResolvedValueOnce([boundExecution()]);
    const { queryClient } = renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Aprobar" }));
    jest.mocked(workflowsService.history).mockImplementation(() => new Promise(() => {}));
    queryClient.invalidateQueries({ queryKey: ["document-workflows", "user-1", 123] });

    await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(workflowsService.transition).not.toHaveBeenCalled();
  });

  it("disables and blocks decisions when the history errors after cached data", async () => {
    jest.mocked(workflowsService.history)
      .mockResolvedValueOnce([boundExecution()])
      .mockRejectedValueOnce(new Error("offline"));
    const { queryClient } = renderPanel();

    await screen.findByRole("button", { name: "Aprobar" });
    queryClient.invalidateQueries({ queryKey: ["document-workflows", "user-1", 123] });

    await waitFor(() => expect(screen.getByText("No se pudo cargar el historial del flujo de trabajo.")).toBeInTheDocument());
    const approve = screen.queryByRole("button", { name: "Aprobar" });
    if (approve) {
      expect(approve).toBeDisabled();
      fireEvent.click(approve);
    }
    expect(workflowsService.transition).not.toHaveBeenCalled();
  });

  it("keeps cancellation available without a reviewed version binding", async () => {
    jest.mocked(workflowsService.history).mockResolvedValue([boundExecution({ documentVersionId: null })]);
    renderPanel();

    const cancel = await screen.findByRole("button", { name: "Cancelar flujo de trabajo" });
    expect(cancel).not.toBeDisabled();
    fireEvent.click(cancel);
    fireEvent.change(screen.getByPlaceholderText("Comentario obligatorio"), { target: { value: "Anulado" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(workflowsService.transition).toHaveBeenCalledWith(90, {
      action: WorkflowTransitionAction.CANCEL,
      comment: "Anulado",
      versionId: undefined,
    }));
  });

  it("carries the bound provenance when cancelling with an available reviewed version", async () => {
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Cancelar flujo de trabajo" }));
    fireEvent.change(screen.getByPlaceholderText("Comentario obligatorio"), { target: { value: "Anulado" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(workflowsService.transition).toHaveBeenCalledWith(90, {
      action: WorkflowTransitionAction.CANCEL,
      comment: "Anulado",
      versionId: 55,
    }));
  });

  it("still submits the latest correction version for SUBMIT", async () => {
      jest.mocked(workflowsService.history).mockResolvedValue([boundExecution({ status: WorkflowStatus.CHANGES_REQUESTED, actionCapabilities: caps({ submit: true }) })]);
    renderPanel({ documentVersionId: 77 });

    fireEvent.click(await screen.findByRole("button", { name: "Reenviar versión corregida" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(workflowsService.transition).toHaveBeenCalledWith(90, {
      action: WorkflowTransitionAction.SUBMIT,
      comment: undefined,
      versionId: 77,
    }));
  });

  it.each([undefined, 0, -1, 2.5, Number.NaN])(
    "fails closed for SUBMIT when the latest version is %s",
    async (value) => {
    jest.mocked(workflowsService.history).mockResolvedValue([boundExecution({ status: WorkflowStatus.CHANGES_REQUESTED, actionCapabilities: caps({ submit: true }) })]);
      renderPanel({ documentVersionId: value as number | undefined });

      const submit = await screen.findByRole("button", { name: "Reenviar versión corregida" });
      expect(submit).toBeDisabled();
      expect(screen.getByRole("alert")).toHaveTextContent("No hay una versión del documento disponible para reenviar.");
      fireEvent.click(submit);
      expect(workflowsService.transition).not.toHaveBeenCalled();
    },
  );
});

describe("document workflow single-operation guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hasPermission.mockReturnValue(true);
    isAdmin.mockReturnValue(false);
    jest.mocked(workflowsService.history).mockResolvedValue([boundExecution()]);
    jest.mocked(workflowsService.transition).mockResolvedValue({} as WorkflowExecution);
    jest.mocked(workflowsService.start).mockResolvedValue({} as WorkflowExecution);
    jest.mocked(workflowsService.reassign).mockResolvedValue({} as WorkflowAssignment);
  });

  it("sends only one transition when the confirmation fires twice in the same tick", async () => {
    const pending = deferred<WorkflowExecution>();
    jest.mocked(workflowsService.transition).mockReturnValue(pending.promise);
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Aprobar" }));
    const confirm = screen.getByRole("button", { name: "Confirmar" });
    act(() => {
      confirm.click();
      confirm.click();
    });

    await waitFor(() => expect(workflowsService.transition).toHaveBeenCalled());
    expect(workflowsService.transition).toHaveBeenCalledTimes(1);
    pending.resolve(boundExecution());
  });

  it("sends only one start when the confirmation fires twice in the same tick", async () => {
    const pending = deferred<WorkflowExecution>();
    jest.mocked(workflowsService.history).mockResolvedValue([]);
    jest.mocked(workflowsService.getStartableDefinitions).mockResolvedValue(definitions);
    jest.mocked(workflowsService.start).mockReturnValue(pending.promise);
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Iniciar flujo de trabajo" }));
    fireEvent.change(screen.getByLabelText("Flujo de trabajo aplicable"), { target: { value: "20" } });
    const confirm = screen.getByRole("button", { name: "Confirmar" });
    act(() => {
      confirm.click();
      confirm.click();
    });

    await waitFor(() => expect(workflowsService.start).toHaveBeenCalled());
    expect(workflowsService.start).toHaveBeenCalledTimes(1);
    pending.resolve(boundExecution());
  });

  it("sends only one reassignment when the confirmation fires twice in the same tick", async () => {
    const pending = deferred<WorkflowAssignment>();
    isAdmin.mockReturnValue(true);
    jest.mocked(workflowsService.reassign).mockReturnValue(pending.promise);
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Reasignar" }));
    fireEvent.change(screen.getByPlaceholderText("ID del usuario"), { target: { value: "user-2" } });
    fireEvent.change(screen.getByPlaceholderText("Motivo obligatorio"), { target: { value: "Reasignación" } });
    const confirm = within(screen.getByRole("dialog")).getByRole("button", { name: "Reasignar" });
    act(() => {
      confirm.click();
      confirm.click();
    });

    await waitFor(() => expect(workflowsService.reassign).toHaveBeenCalled());
    expect(workflowsService.reassign).toHaveBeenCalledTimes(1);
    pending.resolve({} as WorkflowAssignment);
  });

  it("disables the reassign and cancel triggers while a transition is pending", async () => {
    const pending = deferred<WorkflowExecution>();
    isAdmin.mockReturnValue(true);
    jest.mocked(workflowsService.transition).mockReturnValue(pending.promise);
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Aprobar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(workflowsService.transition).toHaveBeenCalledTimes(1));

    expect(screen.getByRole("button", { name: "Reasignar", hidden: true })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar flujo de trabajo", hidden: true })).toBeDisabled();
    pending.resolve(boundExecution());
  });

  it("disables the decision triggers while a reassignment is pending", async () => {
    const pending = deferred<WorkflowAssignment>();
    isAdmin.mockReturnValue(true);
    jest.mocked(workflowsService.reassign).mockReturnValue(pending.promise);
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Reasignar" }));
    fireEvent.change(screen.getByPlaceholderText("ID del usuario"), { target: { value: "user-2" } });
    fireEvent.change(screen.getByPlaceholderText("Motivo obligatorio"), { target: { value: "Reasignación" } });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Reasignar" }));
    await waitFor(() => expect(workflowsService.reassign).toHaveBeenCalledTimes(1));

    expect(screen.getByRole("button", { name: "Aprobar", hidden: true })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Solicitar cambios", hidden: true })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rechazar", hidden: true })).toBeDisabled();
    pending.resolve({} as WorkflowAssignment);
  });

  it("releases the operation lock after a failed transition and retries only on an explicit action", async () => {
    const failed = deferred<WorkflowExecution>();
    jest.mocked(workflowsService.transition)
      .mockReturnValueOnce(failed.promise)
      .mockResolvedValueOnce(boundExecution());
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Aprobar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(workflowsService.transition).toHaveBeenCalledTimes(1));
    failed.reject(new Error("offline"));

    await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar" })).not.toBeDisabled());
    expect(workflowsService.transition).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(workflowsService.transition).toHaveBeenCalledTimes(2));
  });

  it("releases the operation lock after a successful transition", async () => {
    const pending = deferred<WorkflowExecution>();
    jest.mocked(workflowsService.transition).mockReturnValueOnce(pending.promise);
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Aprobar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(workflowsService.transition).toHaveBeenCalledTimes(1));
    pending.resolve(boundExecution());

    await waitFor(() => expect(screen.getByRole("button", { name: "Aprobar" })).not.toBeDisabled());
  });

  it("blocks an open decision when the refreshed snapshot revokes the decision", async () => {
    const { queryClient } = renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Aprobar" }));
    queryClient.setQueryData(["document-workflows", "user-1", 123], [boundExecution({ actionCapabilities: caps({ approve: false }) })]);

    await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(workflowsService.transition).not.toHaveBeenCalled();
  });

  it("blocks an open decision when the execution becomes terminal", async () => {
    const { queryClient } = renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Aprobar" }));
    queryClient.setQueryData(["document-workflows", "user-1", 123], [
      boundExecution({ status: WorkflowStatus.APPROVED, active: false, currentState: null }),
    ]);

    await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(workflowsService.transition).not.toHaveBeenCalled();
  });

  it("keeps a snapshot-authorized decision authoritative when the client permission narrows later", async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Aprobar" }));
    hasPermission.mockReturnValue(false);
    fireEvent.change(screen.getByPlaceholderText("Comentario (opcional)"), { target: { value: "nota" } });

    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(workflowsService.transition).toHaveBeenCalledTimes(1));
  });

  it("blocks an open decision when the history errors during a refetch", async () => {
    jest.mocked(workflowsService.history)
      .mockResolvedValueOnce([boundExecution()])
      .mockRejectedValueOnce(new Error("offline"));
    const { queryClient } = renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: "Aprobar" }));
    queryClient.invalidateQueries({ queryKey: ["document-workflows", "user-1", 123] });

    await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled());
    expect(screen.getByText(/no está disponible/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(workflowsService.transition).not.toHaveBeenCalled();
  });

  it("surfaces a backend stale decision error once without retrying", async () => {
    const error = { response: { status: 409, data: { message: "La versión revisada ya no está vigente" } } };
    jest.mocked(workflowsService.transition).mockRejectedValueOnce(error);
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Aprobar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("La versión revisada ya no está vigente"));
    expect(workflowsService.transition).toHaveBeenCalledTimes(1);
  });
});
