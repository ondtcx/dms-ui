import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SentTransfersPage from "../sent/page";
import ReceivedTransfersPage from "../received/page";
import { transfersService } from "@/lib/services/transfers.service";
import type { TransferHistory } from "@/lib/types";

jest.mock("@/lib/services/transfers.service", () => ({
  transfersService: {
    getSent: jest.fn(),
    getReceived: jest.fn(),
    getStats: jest.fn(),
    accept: jest.fn(),
    cancel: jest.fn(),
  },
}));
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const transfer = {
  id: 1,
  documentId: 5,
  document: {
    id: 5,
    name: "Documento transferible",
    description: null,
    uploadedById: "owner",
    category: null,
    documentType: null,
    versions: [{ filename: "documento.pdf", mimetype: "application/pdf", size: 10 }],
  },
  fromUserId: "owner",
  fromUser: { id: "owner", name: "Owner", email: "owner@example.com" },
  toUserId: "recipient",
  toUser: {
    id: "recipient",
    name: "Recipient",
    email: "recipient@example.com",
    isActive: true,
  },
  initiatedById: "owner",
  initiatedBy: { id: "owner", name: "Owner", email: "owner@example.com" },
  status: "PENDING",
  comment: null,
  completedAt: null,
  canceledAt: null,
  createdAt: "2026-11-03T10:00:00.000Z",
  updatedAt: "2026-11-03T10:00:00.000Z",
} as TransferHistory;

function mount(page: React.ReactNode) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {page}
    </QueryClientProvider>,
  );
}

describe("transfer list pages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (transfersService.getStats as jest.Mock).mockResolvedValue({
      sent: 1,
      received: 1,
      total: 1,
      pending: 1,
    });
    (transfersService.getSent as jest.Mock).mockResolvedValue([transfer]);
    (transfersService.getReceived as jest.Mock).mockResolvedValue([transfer]);
    (transfersService.cancel as jest.Mock).mockResolvedValue(transfer);
    (transfersService.accept as jest.Mock).mockResolvedValue(transfer);
  });

  it("cancels a pending sent transfer", async () => {
    mount(<SentTransfersPage />);
    await screen.findByText("Documento transferible");

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() =>
      expect(transfersService.cancel).toHaveBeenCalledWith(transfer.id),
    );
  });

  it("accepts a pending received transfer", async () => {
    mount(<ReceivedTransfersPage />);
    await screen.findByText("Documento transferible");

    fireEvent.click(screen.getByRole("button", { name: "Aceptar" }));

    await waitFor(() =>
      expect(transfersService.accept).toHaveBeenCalledWith(transfer.id),
    );
  });
});
