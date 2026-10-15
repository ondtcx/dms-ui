import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType } from "react";
import { BatchActionsBar } from "../batch-actions-bar";
import { batchService } from "@/lib/services/batch.service";
import toast from "react-hot-toast";

jest.mock("@/lib/services/batch.service", () => ({ batchService: {
  delete: jest.fn(), restore: jest.fn(), export: jest.fn(), downloadExport: jest.fn(),
} }));
jest.mock("react-hot-toast", () => ({ __esModule: true,
  default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/components/ui/confirm-dialog", () => ({ ConfirmDialog: (props: any) => props.open ? (
  <div role="dialog"><button disabled={props.loading} onClick={props.onConfirm}>Confirm</button></div>
) : null }));

const Bar = BatchActionsBar as ComponentType<any>;
const capabilities = { scope: "ordinary", update: true, trash: true, restore: true,
  permanentDelete: true, export: true };
const row = (id = 1, overrides = {}) => ({ id, batchCapabilities: { ...capabilities }, ...overrides });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}
function props(selectedDocuments = [row()]) {
  return { selectedDocuments, contextKey: "actor-a", authorize: () => true,
    onClearSelection: jest.fn(), onSuccess: jest.fn() };
}
beforeEach(() => {
  jest.clearAllMocks();
  (batchService.delete as jest.Mock).mockResolvedValue({ success: true });
  (batchService.restore as jest.Mock).mockResolvedValue({ success: true });
  (batchService.export as jest.Mock).mockResolvedValue(new Blob(["zip"]));
  URL.createObjectURL = jest.fn(() => "blob:zip");
  URL.revokeObjectURL = jest.fn();
  jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe("actor and selection-bound bulk actions", () => {
  it("blocks duplicate dispatch while the current operation is pending", async () => {
    const pending = deferred<any>();
    (batchService.delete as jest.Mock).mockReturnValue(pending.promise);
    render(<Bar {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    const confirm = screen.getByRole("button", { name: "Confirm" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(batchService.delete).toHaveBeenCalledTimes(1);
    await act(async () => { pending.resolve({ success: true }); });
  });
  it("does not let an old completion unlock a new context operation", async () => {
    const oldOperation = deferred<any>();
    const newOperation = deferred<any>();
    (batchService.delete as jest.Mock).mockReturnValueOnce(oldOperation.promise).mockReturnValueOnce(newOperation.promise);
    const input = props();
    const view = render(<Bar {...input} />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    view.rerender(<Bar {...input} contextKey="actor-b" />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await act(async () => { oldOperation.resolve({ success: true }); });
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeDisabled();
    expect(input.onSuccess).not.toHaveBeenCalled();
    expect(batchService.delete).toHaveBeenCalledTimes(2);
    await act(async () => { newOperation.resolve({ success: true }); });
    expect(input.onSuccess).toHaveBeenCalledTimes(1);
  });
  it("suppresses an old actor error response", async () => {
    let reject!: (error: Error) => void;
    (batchService.delete as jest.Mock).mockReturnValue(new Promise((_resolve, r) => { reject = r; }));
    const input = props();
    const view = render(<Bar {...input} />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    view.rerender(<Bar {...input} contextKey="actor-b" />);
    await act(async () => { reject(new Error("Old request error")); });
    expect(toast.error).not.toHaveBeenCalled();
  });
  it("ignores settlement after unmount", async () => {
    const pending = deferred<any>();
    (batchService.delete as jest.Mock).mockReturnValue(pending.promise);
    const input = props();
    const view = render(<Bar {...input} />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    view.unmount();
    await act(async () => { pending.resolve({ success: true }); });
    expect(input.onSuccess).not.toHaveBeenCalled();
    expect(input.onClearSelection).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
  it("keeps unauthorized actions disabled and explains the whole selection", () => {
    render(<Bar {...props([row(), row(2, { batchCapabilities: { ...capabilities, trash: false } })])} />);
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Descargar ZIP" })).toBeEnabled();
    expect(screen.getByText(/selección completa/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(batchService.delete).not.toHaveBeenCalled();
  });
  it("fails closed on missing snapshot without individual permission fallback", () => {
    render(<Bar {...props([row(1, { batchCapabilities: undefined, actionCapabilities: { trash: true } })])} />);
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Descargar ZIP" })).toBeDisabled();
  });
  it("preserves complete authorized soft-delete payload and settlement", async () => {
    const input = props([row(), row(2)]);
    render(<Bar {...input} />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(input.onSuccess).toHaveBeenCalledTimes(1));
    expect(batchService.delete).toHaveBeenCalledWith({ documentIds: [1, 2], permanent: false });
    expect(input.onClearSelection).toHaveBeenCalledTimes(1);
  });
  it("rechecks live authority at confirmation even without rerender", async () => {
    let allowed = true;
    const input = { ...props(), authorize: () => allowed };
    render(<Bar {...input} />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    allowed = false;
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(batchService.delete).not.toHaveBeenCalled();
  });
  it("drops an old confirmation when selection changes", () => {
    const input = props();
    const view = render(<Bar {...input} />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    view.rerender(<Bar {...input} selectedDocuments={[row(2)]} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(batchService.delete).not.toHaveBeenCalled();
  });
  it.each(["actor", "selection"])("ignores delete settlement after %s change", async (change) => {
    const pending = deferred<any>();
    (batchService.delete as jest.Mock).mockReturnValue(pending.promise);
    const input = props();
    const view = render(<Bar {...input} />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    view.rerender(<Bar {...input} contextKey={change === "actor" ? "actor-b" : "actor-a"}
      selectedDocuments={change === "selection" ? [row(2)] : input.selectedDocuments} />);
    await act(async () => { pending.resolve({ success: true }); });
    expect(input.onSuccess).not.toHaveBeenCalled();
    expect(input.onClearSelection).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
  it("keeps reception permanent deletion disabled even in trash", () => {
    render(<Bar {...props([row(1, { deletedAt: "2026-01-01", batchCapabilities: {
      ...capabilities, scope: "reception", permanentDelete: false,
    } })])} />);
    expect(screen.getByRole("button", { name: "Eliminar permanentemente" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Restaurar" })).toBeEnabled();
  });
  it("preserves the authorized restore contract", async () => {
    const input = props([row(1, { deletedAt: "2026-01-01" })]);
    render(<Bar {...input} />);
    fireEvent.click(screen.getByRole("button", { name: "Restaurar" }));
    await waitFor(() => expect(input.onSuccess).toHaveBeenCalledTimes(1));
    expect(batchService.restore).toHaveBeenCalledWith([1]);
  });
  it("preserves the authorized permanent-delete contract", async () => {
    render(<Bar {...props([row(1, { deletedAt: "2026-01-01" })])} />);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar permanentemente" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(batchService.delete).toHaveBeenCalledWith({ documentIds: [1], permanent: true }));
  });
  it("downloads an authorized ZIP only after current-context readback", async () => {
    render(<Bar {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: "Descargar ZIP" }));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(1));
    expect(batchService.export).toHaveBeenCalledWith({ documentIds: [1] });
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:zip");
  });
  it("does not download a late ZIP after actor switch", async () => {
    const pending = deferred<Blob>();
    (batchService.export as jest.Mock).mockReturnValue(pending.promise);
    const input = props();
    const view = render(<Bar {...input} />);
    fireEvent.click(screen.getByRole("button", { name: "Descargar ZIP" }));
    view.rerender(<Bar {...input} contextKey="actor-b" />);
    await act(async () => { pending.resolve(new Blob(["zip"])); });
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
