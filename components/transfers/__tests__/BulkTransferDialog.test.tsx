import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BulkTransferDialog } from "../BulkTransferDialog";
import { usersService } from "@/lib/services/users.service";
import { transfersService } from "@/lib/services/transfers.service";
import type { User } from "@/lib/types";

jest.mock("@/lib/services/users.service", () => ({
  usersService: { getAllForSelection: jest.fn() },
}));
jest.mock("@/lib/services/transfers.service", () => ({
  transfersService: { createBulkForOwner: jest.fn() },
}));
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const owner = {
  id: "owner",
  email: "owner@example.com",
  name: "Owner",
  role: "user",
  createdAt: "",
  updatedAt: "",
} as User;

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <BulkTransferDialog owner={owner} open onOpenChange={jest.fn()} />
    </QueryClientProvider>,
  );
}

describe("BulkTransferDialog", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = jest.fn();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (usersService.getAllForSelection as jest.Mock).mockResolvedValue([
      { id: "recipient", name: "Recipient", email: "recipient@example.com" },
    ]);
    (transfersService.createBulkForOwner as jest.Mock).mockResolvedValue({
      batchId: "batch-1",
      created: [],
      skipped: [{ documentId: 2, reason: "Workflow activo" }],
      summary: { total: 2, created: 1, skipped: 1 },
    });
  });

  it("requests all documents and shows the skipped report", async () => {
    mount();

    fireEvent.click(screen.getByLabelText("Usuario destinatario"));
    fireEvent.click(await screen.findByRole("option", { name: "Recipient" }));
    fireEvent.change(screen.getByLabelText("Motivo o comentario"), {
      target: { value: "Offboarding" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Transferir todos" }));

    await waitFor(() =>
      expect(transfersService.createBulkForOwner).toHaveBeenCalledWith({
        fromOwnerId: "owner",
        toUserId: "recipient",
        comment: "Offboarding",
      }),
    );
    expect(await screen.findByText(/documento\(s\) incluidos en el lote/)).toBeInTheDocument();
    expect(screen.getByText("Workflow activo")).toBeInTheDocument();
  });
});
