import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DocumentAuditPage from "../page";
import { documentsService } from "@/lib/services/documents.service";
import type { DocumentAuditEvent } from "@/lib/types";

let actor: { id: string; role: string; roles?: string[] } | null = {
  id: "admin-1",
  role: "admin",
};
let authLoading = false;
let paramsId = "42";

jest.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: () => ({ user: actor, loading: authLoading }),
}));
jest.mock("next/navigation", () => ({ useParams: () => ({ id: paramsId }) }));
jest.mock("@/lib/services/documents.service", () => ({
  documentsService: { getOne: jest.fn(), getAudit: jest.fn() },
}));

const event: DocumentAuditEvent = {
  id: "audit-1",
  action: "VIEW",
  resource: "DOCUMENT",
  resourceId: "42",
  documentId: 42,
  actorId: "user-1",
  actorEmail: "ana@example.com",
  actorName: "Ana",
  actorRole: "admin",
  ipAddress: null,
  userAgent: null,
  requestId: "req-1",
  metadata: null,
  createdAt: "2026-02-01T12:00:00.000Z",
};

const setup = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DocumentAuditPage />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  actor = { id: "admin-1", role: "admin" };
  authLoading = false;
  paramsId = "42";
  jest.mocked(documentsService.getOne).mockResolvedValue({ id: 42, name: "Reglamento Interno" } as never);
  jest.mocked(documentsService.getAudit).mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 1 });
});

describe("document audit page", () => {
  it('waits for the document and authorizes a secretario owner', async () => {
    actor = { id: 'owner', role: 'secretario' };
    let resolve!: (value: never) => void;
    jest.mocked(documentsService.getOne).mockImplementation(() => new Promise(done => { resolve = done; }));
    setup();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando');
    expect(documentsService.getAudit).not.toHaveBeenCalled();
    resolve({ id: 42, uploadedById: 'owner' } as never);
    await waitFor(() => expect(documentsService.getAudit).toHaveBeenCalledWith(42, { page: 1, limit: 20 }));
  });
  it("denies roles without audit access and never queries the endpoint", async () => {
    actor = { id: "reader", role: "docente" };
    setup();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("No tiene autorización"));
    expect(documentsService.getAudit).not.toHaveBeenCalled();
  });

  it("shows a loading state instead of a transient forbidden message while auth resolves", () => {
    actor = null;
    authLoading = true;
    setup();
    expect(screen.getByRole("status")).toHaveTextContent("Cargando");
    expect(screen.queryByText("No tiene autorización para consultar la auditoría de este documento.")).not.toBeInTheDocument();
    expect(documentsService.getAudit).not.toHaveBeenCalled();
  });

  it("authorizes through an effective RECTOR role beyond the primary role", async () => {
    actor = { id: "teacher", role: "profesor", roles: ["rector"] };
    setup();
    await waitFor(() =>
      expect(documentsService.getAudit).toHaveBeenCalledWith(42, { page: 1, limit: 20 }),
    );
  });

  it("denies the coordinator primary role and never queries the endpoint", async () => {
    actor = { id: "coord", role: "coordinador" };
    setup();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("No tiene autorización"));
    expect(documentsService.getAudit).not.toHaveBeenCalled();
  });

  it("denies an effective coordinator role beyond the primary role and never queries the endpoint", async () => {
    actor = { id: "teacher", role: "profesor", roles: ["coordinador"] };
    setup();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("No tiene autorización"));
    expect(documentsService.getAudit).not.toHaveBeenCalled();
  });

  it("keeps the document title behavior and lists the authorized events", async () => {
    jest.mocked(documentsService.getAudit).mockResolvedValue({
      data: [event],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    setup();
    expect(screen.getByRole("heading", { name: "Registro de actividad" })).toBeInTheDocument();
    expect(await screen.findByText("Reglamento Interno")).toBeInTheDocument();
    expect(await screen.findByText("Visualización")).toBeInTheDocument();
    expect(documentsService.getAudit).toHaveBeenCalledWith(42, { page: 1, limit: 20 });
  });

  it("renders the empty state when the endpoint returns no events", async () => {
    setup();
    expect(await screen.findByText("No hay registros de auditoría para este documento.")).toBeInTheDocument();
  });

  it("renders a generic error state for non-forbidden failures", async () => {
    jest.mocked(documentsService.getAudit).mockRejectedValue(new Error("boom"));
    setup();
    expect(await screen.findByText("No se pudieron cargar los registros de auditoría.")).toBeInTheDocument();
  });

  it("renders the forbidden state when the endpoint rejects with 403", async () => {
    jest.mocked(documentsService.getAudit).mockRejectedValue({ response: { status: 403 } });
    setup();
    expect(await screen.findByText("No tiene autorización para consultar la auditoría de este documento.")).toBeInTheDocument();
  });

  it("never renders an empty audit history for an invalid document id", async () => {
    paramsId = "abc";
    setup();
    expect(await screen.findByText("El identificador del documento no es válido.")).toBeInTheDocument();
    expect(screen.queryByText("No hay registros de auditoría para este documento.")).not.toBeInTheDocument();
    expect(documentsService.getAudit).not.toHaveBeenCalled();
  });

  it("pages the audit endpoint newest requests", async () => {
    jest.mocked(documentsService.getAudit).mockResolvedValue({
      data: [event],
      total: 40,
      page: 1,
      limit: 20,
      totalPages: 2,
    });
    setup();
    const next = await screen.findByRole("button", { name: "Siguiente" });
    fireEvent.click(next);
    await waitFor(() =>
      expect(documentsService.getAudit).toHaveBeenCalledWith(42, { page: 2, limit: 20 }),
    );
  });

  it("does not present stale records as current while the next page is fetching", async () => {
    jest.mocked(documentsService.getAudit).mockResolvedValue({
      data: [event],
      total: 40,
      page: 1,
      limit: 20,
      totalPages: 2,
    });
    setup();
    expect(await screen.findByText("Visualización")).toBeInTheDocument();

    jest.mocked(documentsService.getAudit).mockImplementation(() => new Promise(() => {}));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Cargando"));
    expect(screen.queryByText("Visualización")).not.toBeInTheDocument();
  });
});
