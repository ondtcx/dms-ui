import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VersionRetentionControls, retentionDateToISO } from "../VersionRetentionControls";
import { documentsService } from "@/lib/services/documents.service";
import { DocumentVersion } from "@/lib/types";
import toast from "react-hot-toast";

jest.mock("@/lib/services/documents.service", () => ({ documentsService: { updateVersionRetention: jest.fn() } }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
const version = { id: 90, version: 2, canManageRetention: true, expiresAt: "2099-06-01T00:00:00Z", preserveUntil: "2099-05-01T00:00:00Z" } as DocumentVersion;
function setup(data = version) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = jest.spyOn(client, "invalidateQueries");
  const view = render(<QueryClientProvider client={client}><VersionRetentionControls documentId={7} version={data} isCurrent={false} /></QueryClientProvider>);
  return { ...view, invalidate, client };
}
beforeEach(() => jest.clearAllMocks());
it.each([false, undefined])("hides controls without explicit permission %s", (permission) => {
  setup({ ...version, canManageRetention: permission });
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
it.each([["Conservar permanentemente", "permanent"], ["Retención normal", "normal"]])("saves %s and invalidates history/detail", async (label, mode) => {
  jest.mocked(documentsService.updateVersionRetention).mockResolvedValue(version);
  const { invalidate } = setup();
  fireEvent.click(screen.getByRole("button", { name: label }));
  await waitFor(() => expect(documentsService.updateVersionRetention).toHaveBeenCalledWith(7, 2, { mode }));
  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["document-versions", 7] }));
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["document", 7] });
});
it("accepts a future date earlier than effective expiry, using local end of day", async () => {
  jest.mocked(documentsService.updateVersionRetention).mockResolvedValue(version);
  setup();
  fireEvent.change(screen.getByLabelText("Conservar hasta"), { target: { value: "2099-04-01" } });
  fireEvent.click(screen.getByRole("button", { name: "Aplicar fecha" }));
  await waitFor(() => expect(documentsService.updateVersionRetention).toHaveBeenCalledWith(7, 2, { mode: "until", preserveUntil: new Date(2099, 3, 1, 23, 59, 59, 999).toISOString() }));
  expect(screen.getByText(/Vencimiento efectivo:/)).toHaveTextContent("2099");
  expect(screen.getByText(/Conservación solicitada hasta:/)).toHaveTextContent("2099");
});
it("rejects impossible and past dates strictly", () => {
  expect(retentionDateToISO("2099-02-30")).toBeNull();
  expect(retentionDateToISO("2000-01-01")).toBeNull();
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Aplicar fecha" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Selecciona una fecha válida futura");
  expect(documentsService.updateVersionRetention).not.toHaveBeenCalled();
});
it("blocks duplicate mutations and reports failure without success", async () => {
  let reject!: (error: unknown) => void;
  jest.mocked(documentsService.updateVersionRetention).mockReturnValue(new Promise((_, fail) => { reject = fail; }));
  const { invalidate } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Conservar permanentemente" }));
  fireEvent.click(screen.getByRole("button", { name: "Conservar permanentemente" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Retención normal" })).toBeDisabled());
  expect(documentsService.updateVersionRetention).toHaveBeenCalledTimes(1);
  reject({ response: { data: { message: "Sin permiso" } } });
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Sin permiso"));
  expect(toast.success).not.toHaveBeenCalled();
  expect(invalidate).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Conservar hasta"), { target: { value: "2099-01-01" } });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
it("shows current/permanent/workflow protection and clears state on document changes", () => {
  const { rerender, client } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Aplicar fecha" }));
  rerender(<QueryClientProvider client={client}><VersionRetentionControls documentId={8} version={{ ...version, preservePermanently: true, isRetentionProtected: true }} isCurrent /></QueryClientProvider>);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Conservar hasta")).toHaveValue("");
  expect(screen.getByText(/Versión actual: no caduca/)).toBeInTheDocument();
  expect(screen.getByText(/Conservación permanente/)).toBeInTheDocument();
  expect(screen.getByText(/Protegida por flujo/)).toBeInTheDocument();
});
