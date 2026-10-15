import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { documentsService } from "@/lib/services/documents.service";
import DocumentDetailPage from "../page";

jest.mock("next/navigation", () => ({ useParams: () => ({ id: "1" }), useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock("@tanstack/react-query", () => ({ useQuery: jest.fn(), useMutation: () => ({}), useQueryClient: () => ({
  invalidateQueries: jest.fn(), getQueryData: () => ({ id: 1 }),
  getQueryState: () => ({ status: "success", fetchStatus: "idle", isInvalidated: false }),
}) }));
jest.mock("@/lib/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "reader", role: "docente" } }) }));
jest.mock("@/lib/services/documents.service", () => ({ documentsService: { download: jest.fn() } }));
jest.mock("@/components/workflows/DocumentWorkflowPanel", () => ({ DocumentWorkflowPanel: () => null }));
jest.mock("@/components/documents/EditDocumentDialog", () => ({ EditDocumentDialog: () => null }));
jest.mock("@/components/documents/DocumentVersionHistory", () => ({ DocumentVersionHistory: () => null }));
jest.mock("@/components/documents/ReplaceFileDialog", () => ({ ReplaceFileDialog: () => null }));
jest.mock("@/components/documents/ExplainPermissionsDialog", () => ({ ExplainPermissionsDialog: () => null }));
jest.mock("@/components/documents/OfficeDocumentPreview", () => ({ __esModule: true, default: () => null, isOfficePreviewType: () => false }));

describe("document detail logical identity", () => {
  it("shows the origin date in information when the document has one", () => {
    jest.mocked(useQuery).mockReturnValue({ data: { id: 1, name: "Consejo", uploadedBy: { name: "Ana" },
      originDate: "2024-12-31", createdAt: "2026-01-01", updatedAt: "2026-01-01", versions: [] },
      isLoading: false, isSuccess: true, isFetching: false } as any);
    render(<DocumentDetailPage />);

    expect(screen.getByText("Fecha de origen")).toBeInTheDocument();
    expect(screen.getByText("31 de diciembre de 2024")).toBeInTheDocument();
  });

  it.each([undefined, null, "", "2024-13-45"])(
    "omits the origin date row for %j",
    (originDate) => {
      jest.mocked(useQuery).mockReturnValue({ data: { id: 1, name: "Consejo", uploadedBy: { name: "Ana" },
        originDate, createdAt: "2026-01-01", updatedAt: "2026-01-01", versions: [] },
        isLoading: false, isSuccess: true, isFetching: false } as any);
      render(<DocumentDetailPage />);

      expect(screen.queryByText("Fecha de origen")).not.toBeInTheDocument();
    },
  );

  it("shows the institutional type in information without a Classification card", () => {
    jest.mocked(useQuery).mockReturnValue({ data: { id: 1, name: "Consejo", uploadedBy: { name: "Ana" },
      documentType: { id: 12, name: "Oficio institucional" }, category: { name: "Old category" },
      createdAt: "2026-01-01", updatedAt: "2026-01-01", versions: [] },
      isLoading: false, isSuccess: true, isFetching: false } as any);
    render(<DocumentDetailPage />);
    expect(screen.getByText("Tipo de documento")).toBeInTheDocument();
    expect(screen.getByText("Oficio institucional")).toBeInTheDocument();
    expect(screen.queryByText("Clasificación")).not.toBeInTheDocument();
    expect(screen.queryByText("Old category")).not.toBeInTheDocument();
  });
  it.each(["Consejo", null, "  "])("shows both identities for name %j and downloads the original filename", async (name) => {
    jest.mocked(useQuery).mockReturnValue({ data: { id: 1, name, uploadedBy: { name: "Ana" },
      createdAt: "2026-01-01", updatedAt: "2026-01-01", versions: [{ filename: "original.zip", mimetype: "application/zip", size: 1 }] },
      isLoading: false, isSuccess: true, isFetching: false } as any);
    jest.mocked(documentsService.download).mockResolvedValue(new Blob(["data"]));
    URL.createObjectURL = jest.fn().mockReturnValue("blob:download");
    URL.revokeObjectURL = jest.fn();
    const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe("original.zip");
    });
    try {
      render(<DocumentDetailPage />);
      expect(screen.getByRole("heading", { level: 1, name: name?.trim() || "original.zip" })).toBeInTheDocument();
      expect(screen.getByText((_text, element) => element?.tagName === "P" &&
        element.textContent === "Archivo original: original.zip")).toHaveTextContent("Archivo original: original.zip");
      expect(screen.getByText("original.zip", { selector: "span" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Descargar" }));
      await waitFor(() => expect(click).toHaveBeenCalled());
    } finally {
      click.mockRestore();
    }
  });
});
