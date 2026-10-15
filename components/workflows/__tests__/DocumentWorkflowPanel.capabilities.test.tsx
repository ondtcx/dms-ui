import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { DocumentWorkflowPanel } from "@/components/workflows/DocumentWorkflowPanel";
import { workflowsService } from "@/lib/services/workflows.service";
import type { WorkflowActionCapabilities } from "@/lib/workflow-action-capabilities";
import {
  WorkflowStatus,
  WorkflowTransitionAction,
  type ApplicableWorkflowDefinition,
  type WorkflowAssignment,
  type WorkflowExecution,
} from "@/lib/types/workflows";

let mockCurrentUser: { id: string; role: string } | null = { id: "user-1", role: "secretary" };
let mockAdmin = false;
const mockHasPermission = jest.fn(() => true);

jest.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockCurrentUser }),
}));

jest.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ hasPermission: mockHasPermission, isAdmin: () => mockAdmin }),
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

function caps(overrides: Partial<WorkflowActionCapabilities> = {}): WorkflowActionCapabilities {
  return {
    scope: "ordinary",
    submit: false,
    approve: false,
    requestChanges: false,
    reject: false,
    cancel: false,
    reassign: false,
    reassignAssignmentIds: [],
    ...overrides,
  };
}

function execution(overrides: Partial<WorkflowExecution> = {}): WorkflowExecution {
  return {
    id: 90,
    documentId: 123,
    status: WorkflowStatus.IN_PROGRESS,
    currentState: "rector",
    currentStateOrder: 1,
    active: true,
    initiatedById: "user-2",
    documentVersionId: 55,
    definitionVersion: definitions[0].versions[0],
    assignments: [{
      id: 1,
      workflowId: 90,
      stageDefinitionId: 30,
      userId: "someone-else",
      roleKeySnapshot: "rector",
      status: "PENDING",
      stageDefinition: { order: 1, roleKey: "rector" },
    }],
    transitions: [],
    events: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

interface PanelProps {
  documentId?: number;
  documentVersionId?: number;
  documentOwnerId?: string;
}

function renderPanel(props: PanelProps = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const element = (current: PanelProps) => (
    <QueryClientProvider client={queryClient}>
      <DocumentWorkflowPanel
        documentId={current.documentId ?? 123}
        documentOwnerId={current.documentOwnerId ?? "user-1"}
        documentVersionId={current.documentVersionId}
      />
    </QueryClientProvider>
  );
  let current = props;
  const view = render(element(current));
  return {
    ...view,
    queryClient,
    rerenderPanel: (next: PanelProps = current) => {
      current = next;
      view.rerender(element(next));
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

function invalidateHistory(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "document-workflows",
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentUser = { id: "user-1", role: "secretary" };
  mockAdmin = false;
  mockHasPermission.mockReturnValue(true);
  jest.mocked(workflowsService.history).mockResolvedValue([]);
  jest.mocked(workflowsService.getStartableDefinitions).mockResolvedValue(definitions);
  jest.mocked(workflowsService.transition).mockResolvedValue({} as WorkflowExecution);
  jest.mocked(workflowsService.start).mockResolvedValue({} as WorkflowExecution);
  jest.mocked(workflowsService.reassign).mockResolvedValue({} as WorkflowAssignment);
});

const DECISION_BUTTONS = ["Aprobar", "Solicitar cambios", "Rechazar"];
const PANEL_ACTIONS = [...DECISION_BUTTONS, "Cancelar flujo de trabajo", "Reenviar versión corregida", "Reasignar"];

describe("workflow capability authority", () => {
  it("offers no decisions when the snapshot is absent despite assignment and admin", async () => {
    mockAdmin = true;
    jest.mocked(workflowsService.history).mockResolvedValue([execution()]);
    renderPanel();

    // Esperamos al historial resuelto y visible antes de afirmar que no habilita acciones.
    expect(await screen.findByText("Etapa actual: rector")).toBeInTheDocument();
    for (const name of PANEL_ACTIONS) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });

  it("grants nothing when the snapshot is present but every flag is false", async () => {
    jest.mocked(workflowsService.history).mockResolvedValue([execution({ actionCapabilities: caps() })]);
    renderPanel();

    expect(await screen.findByText("Etapa actual: rector")).toBeInTheDocument();
    for (const name of PANEL_ACTIONS) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });

  it("does not infer correction submit from CHANGES_REQUESTED status or ownership without a snapshot", async () => {
    jest.mocked(workflowsService.history).mockResolvedValue([
      execution({ status: WorkflowStatus.CHANGES_REQUESTED }),
    ]);
    renderPanel({ documentVersionId: 77 });

    expect(await screen.findByText("Etapa actual: rector")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reenviar versión corregida" })).not.toBeInTheDocument();
    for (const name of DECISION_BUTTONS) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });

  it("offers no decisions when the snapshot scope is malformed", async () => {
    jest.mocked(workflowsService.history).mockResolvedValue([
      execution({ actionCapabilities: { ...caps({ approve: true }), scope: "weird" } as unknown as WorkflowActionCapabilities }),
    ]);
    renderPanel();

    expect(await screen.findByText("Etapa actual: rector")).toBeInTheDocument();
    for (const name of DECISION_BUTTONS) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });

  it("grants approve from the snapshot even when the actor has no matching assignment", async () => {
    jest.mocked(workflowsService.history).mockResolvedValue([
      execution({ actionCapabilities: caps({ approve: true }) }),
    ]);
    renderPanel();

    expect(await screen.findByRole("button", { name: "Aprobar" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Solicitar cambios" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rechazar" })).not.toBeInTheDocument();
  });

  it("keeps cancel independent from the decision flags", async () => {
    jest.mocked(workflowsService.history).mockResolvedValue([
      execution({ actionCapabilities: caps({ cancel: true }) }),
    ]);
    renderPanel();

    expect(await screen.findByRole("button", { name: "Cancelar flujo de trabajo" })).toBeInTheDocument();
    for (const name of DECISION_BUTTONS) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });

  it("keeps correction submit independent from the decision flags", async () => {
    jest.mocked(workflowsService.history).mockResolvedValue([
      execution({ status: WorkflowStatus.CHANGES_REQUESTED, actionCapabilities: caps({ submit: true }) }),
    ]);
    renderPanel({ documentVersionId: 77 });

    expect(await screen.findByRole("button", { name: "Reenviar versión corregida" })).toBeEnabled();
    for (const name of DECISION_BUTTONS) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });

  it("does not let a missing global start permission override the backend submit flag", async () => {
    mockHasPermission.mockReturnValue(false);
    jest.mocked(workflowsService.history).mockResolvedValue([
      execution({ status: WorkflowStatus.CHANGES_REQUESTED, actionCapabilities: caps({ submit: true }) }),
    ]);
    renderPanel({ documentVersionId: 77 });

    expect(await screen.findByRole("button", { name: "Reenviar versión corregida" })).toBeEnabled();
  });

  it.each([
    ["the reassign flag set with an empty list", caps({ reassign: true, reassignAssignmentIds: [] })],
    ["the reassign flag unset with a listed id", caps({ reassign: false, reassignAssignmentIds: [1] })],
  ])("offers no reassign for an inconsistent snapshot (%s) even for an admin", async (_label, snapshot) => {
    mockAdmin = true;
    jest.mocked(workflowsService.history).mockResolvedValue([execution({ actionCapabilities: snapshot })]);
    renderPanel();

    await screen.findByText("Etapa actual: rector");
    expect(screen.queryByRole("button", { name: "Reasignar" })).not.toBeInTheDocument();
  });

  it("offers reassign only for the exact listed pending assignment id without admin", async () => {
    jest.mocked(workflowsService.history).mockResolvedValue([
      execution({
        actionCapabilities: caps({ reassign: true, reassignAssignmentIds: [1] }),
        assignments: [
          { id: 1, workflowId: 90, stageDefinitionId: 30, userId: "user-9", roleKeySnapshot: "rector", status: "PENDING", stageDefinition: { order: 1, roleKey: "rector" } },
          { id: 2, workflowId: 90, stageDefinitionId: 30, userId: "user-8", roleKeySnapshot: "rector", status: "PENDING", stageDefinition: { order: 1, roleKey: "rector" } },
        ],
      }),
    ]);
    renderPanel();

    await screen.findByText("Etapa actual: rector");
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Reasignar" })).toHaveLength(1));
  });

  it("offers no reassign while the actor is an admin but the snapshot lacks the id", async () => {
    mockAdmin = true;
    jest.mocked(workflowsService.history).mockResolvedValue([
      execution({ actionCapabilities: caps({ reassign: true, reassignAssignmentIds: [2] }) }),
    ]);
    renderPanel();

    await screen.findByText("Etapa actual: rector");
    expect(screen.queryByRole("button", { name: "Reasignar" })).not.toBeInTheDocument();
  });

  it("blocks a stale reassign dispatch when the refreshed snapshot changes the exact assignment id", async () => {
    jest.mocked(workflowsService.history).mockResolvedValue([
      execution({ actionCapabilities: caps({ reassign: true, reassignAssignmentIds: [1] }) }),
    ]);
    const { queryClient } = renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Reasignar" }));
    queryClient.setQueryData(["document-workflows", "user-1", 123], [
      execution({ actionCapabilities: caps({ reassign: true, reassignAssignmentIds: [2] }) }),
    ]);
    fireEvent.change(screen.getByPlaceholderText("ID del usuario"), { target: { value: "user-2" } });
    fireEvent.change(screen.getByPlaceholderText("Motivo obligatorio"), { target: { value: "Reasignación" } });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Reasignar" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(workflowsService.reassign).not.toHaveBeenCalled();
  });

  it("lets a non-owner without global permissions decide and dispatch from the snapshot", async () => {
    mockCurrentUser = { id: "outsider", role: "guest" };
    mockHasPermission.mockReturnValue(false);
    jest.mocked(workflowsService.history).mockResolvedValue([
      execution({ actionCapabilities: caps({ approve: true, cancel: true }) }),
    ]);
    renderPanel();

    expect(await screen.findByRole("button", { name: "Aprobar" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Solicitar cambios" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aprobar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(workflowsService.transition).toHaveBeenCalledWith(90, {
      action: WorkflowTransitionAction.APPROVE,
      comment: undefined,
      versionId: 55,
    }));
  });

  it("blocks an open decision when the cache is revoked in the same tick as confirm", async () => {
    jest.mocked(workflowsService.history).mockResolvedValue([
      execution({ actionCapabilities: caps({ approve: true }) }),
    ]);
    const { queryClient } = renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Aprobar" }));
    act(() => {
      queryClient.setQueryData(["document-workflows", "user-1", 123], [execution({ actionCapabilities: caps() })]);
      fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(workflowsService.transition).not.toHaveBeenCalled();
  });
});

describe("workflow start authority", () => {
  it("lets a non-owner delegate start from server-filtered definitions", async () => {
    jest.mocked(workflowsService.history).mockResolvedValue([]);
    renderPanel({ documentOwnerId: "other-owner" });

    fireEvent.click(await screen.findByRole("button", { name: "Iniciar flujo de trabajo" }));
    fireEvent.change(screen.getByLabelText("Flujo de trabajo aplicable"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(workflowsService.start).toHaveBeenCalledWith(123, { versionId: 20, comment: undefined }));
  });

  it("hides start without the narrowed workflow.start permission", async () => {
    mockHasPermission.mockReturnValue(false);
    jest.mocked(workflowsService.history).mockResolvedValue([]);
    renderPanel({ documentOwnerId: "other-owner" });

    await waitFor(() => expect(screen.queryByRole("button", { name: "Iniciar flujo de trabajo" })).not.toBeInTheDocument());
    expect(workflowsService.getStartableDefinitions).not.toHaveBeenCalled();
  });

  it("blocks start when the selected definition disappears from the settled list", async () => {
    jest.mocked(workflowsService.history).mockResolvedValue([]);
    jest.mocked(workflowsService.getStartableDefinitions)
      .mockResolvedValueOnce(definitions)
      .mockResolvedValueOnce([]);
    const { queryClient } = renderPanel({ documentOwnerId: "other-owner" });

    fireEvent.click(await screen.findByRole("button", { name: "Iniciar flujo de trabajo" }));
    fireEvent.change(screen.getByLabelText("Flujo de trabajo aplicable"), { target: { value: "20" } });
    await queryClient.invalidateQueries({
      predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "document-workflow-definitions",
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(workflowsService.getStartableDefinitions).toHaveBeenCalledTimes(2));
    expect(workflowsService.start).not.toHaveBeenCalled();
  });
});

describe("workflow actor-scoped context", () => {
  it("scopes history to the current actor instead of reusing another actor's snapshot", async () => {
    jest.mocked(workflowsService.history)
      .mockResolvedValueOnce([execution({ actionCapabilities: caps({ approve: true }) })])
      .mockResolvedValueOnce([execution({ actionCapabilities: caps({ cancel: true }) })]);
    const { rerenderPanel } = renderPanel();

    expect(await screen.findByRole("button", { name: "Aprobar" })).toBeInTheDocument();

    mockCurrentUser = { id: "user-2", role: "secretary" };
    rerenderPanel();

    await waitFor(() => expect(screen.queryByRole("button", { name: "Aprobar" })).not.toBeInTheDocument());
    expect(await screen.findByRole("button", { name: "Cancelar flujo de trabajo" })).toBeInTheDocument();
  });

  it("does not toast or close a new-actor context when an old-actor operation settles", async () => {
    const pending = (() => {
      let resolve!: (value: WorkflowExecution) => void;
      const promise = new Promise<WorkflowExecution>((res) => { resolve = res; });
      return { promise, resolve };
    })();
    jest.mocked(workflowsService.history).mockResolvedValue([
      execution({ actionCapabilities: caps({ approve: true }) }),
    ]);
    jest.mocked(workflowsService.transition).mockReturnValue(pending.promise);
    const { rerenderPanel } = renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Aprobar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(workflowsService.transition).toHaveBeenCalledTimes(1));

    mockCurrentUser = { id: "user-2", role: "secretary" };
    rerenderPanel();
    await act(async () => { pending.resolve(execution()); });

    expect(toast.success).not.toHaveBeenCalled();
  });

  it("rekeys history on document change and never reuses the old document authority", async () => {
    jest.mocked(workflowsService.history).mockImplementation((id: number) =>
      Promise.resolve(
        id === 123
          ? [execution({ actionCapabilities: caps({ approve: true }) })]
          : [execution({ documentId: 456, actionCapabilities: caps({ cancel: true }) })],
      ),
    );
    const { rerenderPanel } = renderPanel({ documentId: 123 });

    expect(await screen.findByRole("button", { name: "Aprobar" })).toBeInTheDocument();

    rerenderPanel({ documentId: 456 });

    await waitFor(() => expect(workflowsService.history).toHaveBeenCalledWith(456));
    expect(await screen.findByRole("button", { name: "Cancelar flujo de trabajo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aprobar" })).not.toBeInTheDocument();
  });

  it("ignores an old-actor start settlement in a new-actor context", async () => {
    const pending = deferred<WorkflowExecution>();
    jest.mocked(workflowsService.history).mockResolvedValue([]);
    jest.mocked(workflowsService.start).mockReturnValue(pending.promise);
    const { rerenderPanel } = renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Iniciar flujo de trabajo" }));
    fireEvent.change(screen.getByLabelText("Flujo de trabajo aplicable"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(workflowsService.start).toHaveBeenCalledTimes(1));

    mockCurrentUser = { id: "user-2", role: "secretary" };
    rerenderPanel();
    await act(async () => { pending.resolve(execution()); });

    expect(toast.success).not.toHaveBeenCalled();
  });

  it("ignores an old-actor reassign settlement in a new-actor context", async () => {
    const pending = deferred<WorkflowAssignment>();
    jest.mocked(workflowsService.history).mockResolvedValue([
      execution({ actionCapabilities: caps({ reassign: true, reassignAssignmentIds: [1] }) }),
    ]);
    jest.mocked(workflowsService.reassign).mockReturnValue(pending.promise);
    const { rerenderPanel } = renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Reasignar" }));
    fireEvent.change(screen.getByPlaceholderText("ID del usuario"), { target: { value: "user-2" } });
    fireEvent.change(screen.getByPlaceholderText("Motivo obligatorio"), { target: { value: "Reasignación" } });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Reasignar" }));
    await waitFor(() => expect(workflowsService.reassign).toHaveBeenCalledTimes(1));

    mockCurrentUser = { id: "user-2", role: "secretary" };
    rerenderPanel();
    await act(async () => { pending.resolve({} as WorkflowAssignment); });

    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe("workflow per-action payload contracts", () => {
  it("propagates a backend decision error once and does not retry", async () => {
    jest.mocked(workflowsService.history).mockResolvedValue([
      execution({ actionCapabilities: caps({ approve: true }) }),
    ]);
    jest.mocked(workflowsService.transition).mockRejectedValueOnce({
      response: { status: 409, data: { message: "Versión ya no vigente" } },
    });
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Aprobar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Versión ya no vigente"));
    expect(workflowsService.transition).toHaveBeenCalledTimes(1);
  });

  it("requires a comment for CANCEL and carries the correction version for SUBMIT", async () => {
    jest.mocked(workflowsService.history).mockResolvedValue([
      execution({ status: WorkflowStatus.CHANGES_REQUESTED, actionCapabilities: caps({ cancel: true, submit: true }) }),
    ]);
    renderPanel({ documentVersionId: 77 });

    fireEvent.click(await screen.findByRole("button", { name: "Reenviar versión corregida" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(workflowsService.transition).toHaveBeenCalledWith(90, {
      action: WorkflowTransitionAction.SUBMIT,
      comment: undefined,
      versionId: 77,
    }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "Confirmar" })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Cancelar flujo de trabajo" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled());
  });

  it("dispatches the exact reassign target without a version field", async () => {
    jest.mocked(workflowsService.history).mockResolvedValue([
      execution({ actionCapabilities: caps({ reassign: true, reassignAssignmentIds: [1], approve: true }) }),
    ]);
    renderPanel({ documentVersionId: 77 });

    fireEvent.click(await screen.findByRole("button", { name: "Reasignar" }));
    fireEvent.change(screen.getByPlaceholderText("ID del usuario"), { target: { value: "user-5" } });
    fireEvent.change(screen.getByPlaceholderText("Motivo obligatorio"), { target: { value: "cambio" } });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Reasignar" }));

    await waitFor(() => expect(workflowsService.reassign).toHaveBeenCalledWith(90, 1, {
      userId: "user-5",
      reason: "cambio",
    }));
  });
});
