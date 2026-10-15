import { getVersionTraceability } from "@/lib/document-traceability";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DocumentVersionHistory } from "../DocumentVersionHistory";
import { documentsService } from "@/lib/services/documents.service";
import { DocumentVersion, Document } from "@/lib/types";

jest.mock("@/lib/services/documents.service", () => ({ documentsService: { getVersions: jest.fn(), restoreVersion: jest.fn(), updateVersionRetention: jest.fn() } }));

const historyVersion = { id: 99, version: 1, size: 10, createdAt: "2026-01-01T00:00:00Z", createdBy: { name: "Ana" }, canManageRetention: true, expiresAt: null, isRetentionProtected: true } as DocumentVersion;

it("shows protected history, resets date/errors on close and document changes, and restores", async () => {
  jest.mocked(documentsService.getVersions).mockResolvedValue([historyVersion]);
  jest.mocked(documentsService.restoreVersion).mockResolvedValue({ id: 7 } as Document);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = jest.spyOn(client, "invalidateQueries");
  const onOpenChange = jest.fn();
  const view = (open: boolean, documentId = 7) => <QueryClientProvider client={client}><DocumentVersionHistory documentId={documentId} currentVersion={2} open={open} onOpenChange={onOpenChange} /></QueryClientProvider>;
  const { rerender } = render(view(true));
  await screen.findByText(/Protegida por flujo/);
  fireEvent.click(screen.getByRole("button", { name: "Aplicar fecha" }));
  expect(screen.getByRole("alert")).toBeInTheDocument();
  rerender(view(false));
  rerender(view(true));
  await screen.findByLabelText("Conservar hasta");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Conservar hasta"), { target: { value: "2099-01-01" } });
  rerender(view(true, 8));
  await waitFor(() => expect(screen.getByLabelText("Conservar hasta")).toHaveValue(""));
  fireEvent.click(screen.getByRole("button", { name: "Restaurar" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
  await waitFor(() => expect(documentsService.restoreVersion).toHaveBeenCalledWith(8, 1));
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["document-versions", 8] });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["documents"] });
});

describe("document version traceability", () => {
  it("labels a version event with its supplied actor and timestamp", () => {
    expect(getVersionTraceability({ createdBy: { name: "Ana" }, createdAt: "2026-09-01T10:00:00.000Z" })).toEqual({
      actor: "Ana",
      time: "2026-09-01T10:00:00.000Z",
    });
  });

  it("identifies missing actor and timestamp without inventing values", () => {
    expect(getVersionTraceability({ createdBy: null, createdAt: null })).toEqual({
      actor: "Actor no disponible",
      time: "Fecha no disponible",
    });
  });
});
