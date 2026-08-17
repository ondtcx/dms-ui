import api from "@/lib/axios";
import { documentsService } from "@/lib/services/documents.service";

jest.mock("@/lib/axios", () => ({
  put: jest.fn(),
}));

describe("documentsService.saveContent", () => {
  it("sends the fallback content and returns the saved document", async () => {
    const document = { id: 7, title: "notes.txt" };
    jest.mocked(api.put).mockResolvedValueOnce({ data: document });

    await expect(documentsService.saveContent(7, "updated text")).resolves.toEqual(document);
    expect(api.put).toHaveBeenCalledWith("/documents/7/content", { content: "updated text" });
  });
});
