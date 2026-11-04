import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { DocumentReviewPanel } from "../DocumentReviewPanel";
import type { DocumentReview } from "@/lib/types";

jest.mock("@/lib/services/authoring.service", () => ({
  authoringService: { listUsers: jest.fn().mockResolvedValue([]) },
}));
jest.mock("@/lib/services/document-reviews.service", () => ({
  documentReviewService: {
    submit: jest.fn(),
    approve: jest.fn(),
    returnDocument: jest.fn(),
    archive: jest.fn(),
  },
}));
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const review = {
  id: 1,
  documentId: 42,
  status: "IN_REVIEW",
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-02T10:00:00.000Z",
  events: [],
} as unknown as DocumentReview;

function renderPanel(overrides: Partial<React.ComponentProps<typeof DocumentReviewPanel>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <DocumentReviewPanel
        documentId={42}
        review={review}
        onChanged={jest.fn()}
        {...overrides}
      />
    </QueryClientProvider>,
  );
}

describe("DocumentReviewPanel update actions", () => {
  it("offers file and metadata updates to the author and warns about the review reset", () => {
    const onReplaceFile = jest.fn();
    const onEditMetadata = jest.fn();
    renderPanel({
      canUpdate: true,
      canEditMetadata: true,
      onReplaceFile,
      onEditMetadata,
    });

    expect(screen.getByText("Actualizar documento")).toBeInTheDocument();
    expect(
      screen.getByText(/la revisión vuelve a Borrador/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Actualizar archivo" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar información" }));
    expect(onReplaceFile).toHaveBeenCalledTimes(1);
    expect(onEditMetadata).toHaveBeenCalledTimes(1);
  });

  it("does not offer update actions to a reviewer without capabilities", () => {
    renderPanel({ canUpdate: false, canEditMetadata: false });

    expect(screen.queryByText("Actualizar documento")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Actualizar archivo" }),
    ).not.toBeInTheDocument();
  });
});


  it("archives an approved uploaded document after confirmation", async () => {
    const { documentReviewService } = jest.requireMock(
      "@/lib/services/document-reviews.service",
    );
    documentReviewService.archive.mockResolvedValue({});
    renderPanel({
      review: { ...review, status: "APPROVED" } as DocumentReview,
      canArchive: true,
    });

    fireEvent.click(screen.getByRole("button", { name: "Archivar" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Archivar" }));
    await waitFor(() =>
      expect(documentReviewService.archive).toHaveBeenCalledWith(42),
    );
  });
