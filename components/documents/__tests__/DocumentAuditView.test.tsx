import { fireEvent, render, screen, within } from "@testing-library/react";
import { AuditView, resolveAuditState } from "@/components/documents/DocumentAuditView";
import type { DocumentAuditEvent } from "@/lib/types";

const event: DocumentAuditEvent = {
  id: "audit-1",
  action: "UPDATE",
  resource: "DOCUMENT",
  resourceId: "42",
  documentId: 42,
  actorId: "user-1",
  actorEmail: "ana@example.com",
  actorName: "Ana",
  actorRole: "admin",
  ipAddress: "203.0.113.10",
  userAgent: "jest-agent",
  requestId: "req-1",
  metadata: {
    before: { description: "Borrador", isPublic: false },
    after: { description: "Aprobado", isPublic: true },
  },
  createdAt: "2026-02-01T12:00:00.000Z",
};

describe("resolveAuditState", () => {
  it("prioritizes client role gating over any other signal", () => {
    expect(resolveAuditState({ authorized: false })).toBe("denied");
    expect(resolveAuditState({ authorized: false, loading: true, eventCount: 3 })).toBe("denied");
  });

  it("maps loading, forbidden, error, empty, and records states", () => {
    expect(resolveAuditState({ authorized: true, loading: true })).toBe("loading");
    expect(resolveAuditState({ authorized: true, error: { response: { status: 403 } } })).toBe("forbidden");
    expect(resolveAuditState({ authorized: true, error: new Error("network") })).toBe("error");
    expect(resolveAuditState({ authorized: true, eventCount: 0 })).toBe("empty");
    expect(resolveAuditState({ authorized: true, eventCount: 2 })).toBe("records");
  });

  it("never masks an invalid document id as an empty history", () => {
    expect(resolveAuditState({ authorized: true, documentValid: false })).toBe("invalid");
    expect(resolveAuditState({ authorized: true, documentValid: false, eventCount: 0 })).toBe("invalid");
    expect(resolveAuditState({ authorized: false, documentValid: false })).toBe("denied");
  });
});

describe("AuditView", () => {
  it("renders Spanish non-record states", () => {
    const { rerender } = render(<AuditView state="loading" />);
    expect(screen.getByText("Registro de actividad")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Cargando");

    rerender(<AuditView state="empty" />);
    expect(screen.getByRole("status")).toHaveTextContent("No hay registros");

    rerender(<AuditView state="forbidden" />);
    expect(screen.getByRole("status")).toHaveTextContent("No tiene autorización");

    rerender(<AuditView state="error" />);
    expect(screen.getByRole("status")).toHaveTextContent("No se pudieron cargar");

    rerender(<AuditView state="denied" />);
    expect(screen.getByRole("status")).toHaveTextContent("No tiene autorización");

    rerender(<AuditView state="invalid" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "El identificador del documento no es válido.",
    );
  });

  it("renders the event list with Spanish labels and actor identity", () => {
    render(<AuditView state="records" events={[event]} />);
    const list = screen.getByRole("list", { name: "Registros de auditoría" });
    expect(within(list).getByText("Actualización")).toBeInTheDocument();
    expect(within(list).getByText(/Ana/)).toBeInTheDocument();
    expect(within(list).queryByText("UPDATE")).not.toBeInTheDocument();
  });

  it("reveals only the sanitized before/after metadata when expanded", () => {
    render(<AuditView state="records" events={[event]} />);
    expect(screen.queryByText("Aprobado")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Detalles/ }));
    expect(screen.getByText("Antes")).toBeInTheDocument();
    expect(screen.getByText("Después")).toBeInTheDocument();
    expect(screen.getByText("Aprobado")).toBeInTheDocument();
    expect(screen.getByText("Borrador")).toBeInTheDocument();
  });

  it("never exposes raw request fields, only labeled metadata", () => {
    render(<AuditView state="records" events={[event]} />);
    fireEvent.click(screen.getByRole("button", { name: /Detalles/ }));
    expect(screen.queryByText("203.0.113.10")).not.toBeInTheDocument();
    expect(screen.queryByText("jest-agent")).not.toBeInTheDocument();
  });

  it("handles events without metadata", () => {
    render(<AuditView state="records" events={[{ ...event, id: "audit-2", metadata: null }]} />);
    fireEvent.click(screen.getByRole("button", { name: /Detalles/ }));
    expect(screen.getByText("Sin metadatos adicionales.")).toBeInTheDocument();
  });

  it("drives pagination through the provided callback", () => {
    const onPageChange = jest.fn();
    render(<AuditView state="records" events={[event]} page={2} totalPages={3} onPageChange={onPageChange} />);
    expect(screen.getByText("Página 2 de 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
