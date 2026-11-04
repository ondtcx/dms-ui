import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewQueue } from "../ReviewQueue";
import { authoringService } from "@/lib/services/authoring.service";
import { documentReviewService } from "@/lib/services/document-reviews.service";

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "admin-1", name: "Admin", role: "admin", roles: ["admin"] },
  }),
}));

jest.mock("@/lib/services/authoring.service", () => ({
  authoringService: {
    pendingDocuments: jest.fn(),
    approve: jest.fn(),
    returnDocument: jest.fn(),
  },
}));

jest.mock("@/lib/services/document-reviews.service", () => ({
  documentReviewService: {
    pending: jest.fn(),
    approve: jest.fn(),
    returnDocument: jest.fn(),
  },
}));

const authoringPending = {
  id: 11,
  name: "Acta de consejo",
  uploadedBy: { id: "u1", name: "Ana Torres" },
  documentType: { id: 7, name: "Acta de Consejo" },
  templateData: { template: { id: 2, name: "Acta institucional" } },
  authoring: {
    id: 1,
    status: "IN_REVIEW",
    reviewerId: null,
    reviewerName: null,
    submittedAt: "2026-11-01T10:00:00.000Z",
  },
};

const uploadPending = {
  id: 3,
  documentId: 42,
  status: "IN_REVIEW",
  reviewerName: "Erika Ramirez",
  submittedAt: "2026-11-02T10:00:00.000Z",
  document: {
    id: 42,
    name: "Informe de gestión",
    uploadedBy: { id: "u2", name: "Luis Pérez" },
    documentType: { id: 13, name: "Informe de Rendimiento" },
    templateData: { template: { id: 6, name: "Informe institucional" } },
  },
};

function renderQueue() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ReviewQueue />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (authoringService.pendingDocuments as jest.Mock).mockResolvedValue([
    authoringPending,
  ]);
  (documentReviewService.pending as jest.Mock).mockResolvedValue([uploadPending]);
  (authoringService.approve as jest.Mock).mockResolvedValue({});
  (authoringService.returnDocument as jest.Mock).mockResolvedValue({});
  (documentReviewService.approve as jest.Mock).mockResolvedValue({});
  (documentReviewService.returnDocument as jest.Mock).mockResolvedValue({});
});

describe("ReviewQueue", () => {
  it("shows authoring and uploaded pending items with their stages", async () => {
    renderQueue();

    expect(await screen.findByText("Acta de consejo")).toBeInTheDocument();
    expect(screen.getByText("Informe de gestión")).toBeInTheDocument();
    expect(screen.getAllByText("En revisión").length).toBeGreaterThan(0);
    expect(screen.getByText(/Ana Torres/)).toBeInTheDocument();
    expect(screen.getByText(/Luis Pérez/)).toBeInTheDocument();
    expect(screen.getAllByText(/Revisor:/).length).toBe(2);
  });

  it("approves an authoring document from the queue", async () => {
    const user = userEvent.setup();
    renderQueue();

    const heading = await screen.findByText("Acta de consejo");
    const card = heading.closest("[data-slot=card]") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "Aprobar" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(
      within(dialog).getByLabelText(/Observación/),
      { target: { value: "Todo correcto" } },
    );
    await user.click(within(dialog).getByRole("button", { name: "Aprobar" }));

    await waitFor(() =>
      expect(authoringService.approve).toHaveBeenCalledWith(11, {
        observation: "Todo correcto",
      }),
    );
  });

  it("returns an uploaded document with a required observation", async () => {
    const user = userEvent.setup();
    renderQueue();

    const heading = await screen.findByText("Informe de gestión");
    const card = heading.closest("[data-slot=card]") as HTMLElement;
    await user.click(within(card).getByRole("button", { name: "Devolver" }));

    const dialog = await screen.findByRole("dialog");
    await user.type(
      within(dialog).getByLabelText(/Observación/),
      "Falta la firma",
    );
    await user.click(within(dialog).getByRole("button", { name: "Devolver" }));

    await waitFor(() =>
      expect(documentReviewService.returnDocument).toHaveBeenCalledWith(
        42,
        "Falta la firma",
      ),
    );
  });

  it("renders an empty state when nothing is pending", async () => {
    (authoringService.pendingDocuments as jest.Mock).mockResolvedValue([]);
    (documentReviewService.pending as jest.Mock).mockResolvedValue([]);
    renderQueue();

    expect(
      await screen.findByText("No hay documentos pendientes"),
    ).toBeInTheDocument();
  });
});
