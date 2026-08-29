import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DirectoryVisitRecorder } from "@/components/documents/DirectoryVisitRecorder";
import { documentsService } from "@/lib/services/documents.service";

jest.mock("@/lib/services/documents.service", () => ({
  documentsService: { recordDirectoryVisit: jest.fn().mockResolvedValue(undefined) },
}));

describe("DirectoryVisitRecorder", () => {
  const renderRecorder = (directoryId: number | null, navigationSucceeded: boolean) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={client}>
        <DirectoryVisitRecorder directoryId={directoryId} navigationSucceeded={navigationSucceeded} />
      </QueryClientProvider>,
    );
  };

  beforeEach(() => jest.clearAllMocks());

  it("records one deliberate successful arrival", async () => {
    renderRecorder(12, true);
    await waitFor(() => expect(documentsService.recordDirectoryVisit).toHaveBeenCalledTimes(1));
    expect(documentsService.recordDirectoryVisit).toHaveBeenCalledWith(12, expect.any(String));
  });

  it("does not record root or failed navigation", async () => {
    renderRecorder(null, true);
    renderRecorder(12, false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(documentsService.recordDirectoryVisit).not.toHaveBeenCalled();
  });
});
