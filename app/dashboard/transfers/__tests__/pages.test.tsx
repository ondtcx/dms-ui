import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    acceptBatch: jest.fn(),
    cancelBatch: jest.fn(),
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
  batchId: null,
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
    (transfersService.acceptBatch as jest.Mock).mockResolvedValue({
      batchId: "batch-1",
      accepted: 2,
      failed: [],
    });
    (transfersService.cancelBatch as jest.Mock).mockResolvedValue({
      batchId: "batch-1",
      canceled: 2,
      failed: [],
    });
  });

  it("cancels a pending sent transfer", async () => {
    mount(<SentTransfersPage />);
    await screen.findByText("Documento transferible");

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Cancelar transferencia" }),
    );

    await waitFor(() =>
      expect(transfersService.cancel).toHaveBeenCalledWith(transfer.id),
    );
  });

  it("requires confirmation before accepting a received transfer", async () => {
    mount(<ReceivedTransfersPage />);
    await screen.findByText("Documento transferible");

    fireEvent.click(screen.getByRole("button", { name: "Aceptar" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Documento transferible/)).toBeInTheDocument();
    expect(transfersService.accept).not.toHaveBeenCalled();
  });

  it("accepts a pending received transfer after confirmation", async () => {
    mount(<ReceivedTransfersPage />);
    await screen.findByText("Documento transferible");

    fireEvent.click(screen.getByRole("button", { name: "Aceptar" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Aceptar" }));

    await waitFor(() =>
      expect(transfersService.accept).toHaveBeenCalledWith(transfer.id),
    );
  });
});

describe("transfer batch pages", () => {
  const batchItems = [
    { ...transfer, id: 21, batchId: "batch-1" },
    { ...transfer, id: 22, batchId: "batch-1", documentId: 6 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (transfersService.getStats as jest.Mock).mockResolvedValue({
      sent: 2,
      received: 2,
      total: 2,
      pending: 2,
    });
    (transfersService.acceptBatch as jest.Mock).mockResolvedValue({
      batchId: "batch-1",
      accepted: 2,
      failed: [],
    });
    (transfersService.cancelBatch as jest.Mock).mockResolvedValue({
      batchId: "batch-1",
      canceled: 2,
      failed: [],
    });
  });

  it("accepts a received batch once", async () => {
    (transfersService.getReceived as jest.Mock).mockResolvedValue(batchItems);
    mount(<ReceivedTransfersPage />);
    await screen.findByText(/Transferencia masiva · 2 documento/);

    fireEvent.click(screen.getByRole("button", { name: "Aceptar lote" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Aceptar lote" }));

    await waitFor(() =>
      expect(transfersService.acceptBatch).toHaveBeenCalledWith("batch-1"),
    );
  });

  it("keeps the whole batch visible when the search matches one document", async () => {
    const distinct = [
      {
        ...transfer,
        id: 31,
        batchId: "batch-2",
        document: { ...transfer.document, name: "Acta A" },
      },
      {
        ...transfer,
        id: 32,
        batchId: "batch-2",
        document: { ...transfer.document, id: 6, name: "Acta B" },
      },
    ];
    (transfersService.getReceived as jest.Mock).mockResolvedValue(distinct);
    mount(<ReceivedTransfersPage />);
    await screen.findByText(/Transferencia masiva · 2 documento/);

    fireEvent.change(screen.getByPlaceholderText("Buscar por documento o remitente..."), {
      target: { value: "Acta A" },
    });

    expect(screen.getByText(/Transferencia masiva · 2 documento/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aceptar lote" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Aceptar lote" }));
    await waitFor(() =>
      expect(transfersService.acceptBatch).toHaveBeenCalledWith("batch-2"),
    );
  });

  it("cancels a sent batch once", async () => {
    (transfersService.getSent as jest.Mock).mockResolvedValue(batchItems);
    mount(<SentTransfersPage />);
    await screen.findByText(/Transferencia masiva · 2 documento/);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar lote" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar lote" }));

    await waitFor(() =>
      expect(transfersService.cancelBatch).toHaveBeenCalledWith("batch-1"),
    );
  });
});
