import { act, renderHook, waitFor } from "@testing-library/react";
import { useDocumentThumbnails } from "@/hooks/use-document-thumbnails";
import { documentsService } from "@/lib/services/documents.service";
import type { Document } from "@/lib/types";

jest.mock("@/lib/services/documents.service", () => ({
  documentsService: { getThumbnail: jest.fn() },
}));

const getThumbnailMock = documentsService.getThumbnail as jest.Mock;

const makeDoc = (
  id: number,
  mimetype: string,
  updatedAt = "2026-01-01T00:00:00.000Z",
): Document =>
  ({
    id,
    updatedAt,
    versions: [{ mimetype }],
  }) as any;

describe("useDocumentThumbnails", () => {
  beforeEach(() => {
    getThumbnailMock.mockReset();
    getThumbnailMock.mockResolvedValue(
      new Blob(["x"], { type: "image/jpeg" }),
    );
    window.URL.createObjectURL = jest.fn(() => "blob:mock");
    window.URL.revokeObjectURL = jest.fn();
  });

  it("requests a thumbnail for an office document (non-PDF/image)", async () => {
    const doc = makeDoc(
      1,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );

    const { result } = renderHook(() => useDocumentThumbnails([doc]));

    await waitFor(() =>
      expect(result.current.thumbnailUrls[1]?.url).toBe("blob:mock"),
    );
    expect(getThumbnailMock).toHaveBeenCalledTimes(1);
    expect(getThumbnailMock).toHaveBeenCalledWith(1, doc.updatedAt);
    expect(result.current.thumbnailUrls[1]).toEqual({
      url: "blob:mock",
      updatedAt: doc.updatedAt,
    });
  });

  it("still requests a thumbnail for a PDF", async () => {
    const doc = makeDoc(2, "application/pdf");

    renderHook(() => useDocumentThumbnails([doc]));

    await waitFor(() => expect(getThumbnailMock).toHaveBeenCalledTimes(1));
    expect(getThumbnailMock).toHaveBeenCalledWith(2, doc.updatedAt);
  });

  it("skips the fetch when the cached updatedAt matches", async () => {
    const doc = makeDoc(3, "application/pdf");

    const { rerender } = renderHook(
      ({ documents }) => useDocumentThumbnails(documents),
      { initialProps: { documents: [doc] } },
    );

    await waitFor(() => expect(getThumbnailMock).toHaveBeenCalledTimes(1));

    rerender({ documents: [{ ...doc }] });
    await act(async () => {});

    expect(getThumbnailMock).toHaveBeenCalledTimes(1);
  });
});