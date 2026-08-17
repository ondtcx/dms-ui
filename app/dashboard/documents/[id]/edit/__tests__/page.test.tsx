import { render, screen, waitFor } from "@testing-library/react";
import EditDocumentPage from "@/app/dashboard/documents/[id]/edit/page";
import api from "@/lib/axios";
import { documentsService } from "@/lib/services/documents.service";
import { onlyofficeService } from "@/lib/services/onlyoffice.service";

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "7" }),
  useRouter: () => ({ back: jest.fn() }),
}));
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock("@/lib/services/documents.service", () => ({
  documentsService: {
    getOne: jest.fn(),
    view: jest.fn(),
    saveContent: jest.fn(),
    download: jest.fn(),
  },
}));
jest.mock("@/lib/services/onlyoffice.service", () => ({
  onlyofficeService: { checkHealth: jest.fn() },
}));
jest.mock("@/lib/axios", () => ({ get: jest.fn() }));
jest.mock("@/components/documents/OnlyOfficeEditor", () => () => <div>OnlyOffice</div>);

const document = {
  id: 7,
  versions: [{ filename: "notas.txt", mimetype: "text/plain" }],
};

describe("EditDocumentPage", () => {
  beforeEach(() => {
    jest.mocked(documentsService.getOne).mockResolvedValue(document as never);
  });

  it("renders the basic editor when OnlyOffice is unavailable for text", async () => {
    jest.mocked(onlyofficeService.checkHealth).mockResolvedValue(false);
    jest.mocked(documentsService.view).mockResolvedValue({ text: async () => "contenido" } as Blob);

    render(<EditDocumentPage />);

    await waitFor(() => expect(screen.getByText("OnlyOffice no está disponible. Estás usando el editor básico.")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Contenido del documento" })).toHaveValue("contenido");
  });

  it("shows download guidance for unsupported files", async () => {
    jest.mocked(onlyofficeService.checkHealth).mockResolvedValue(false);
    jest.mocked(documentsService.getOne).mockResolvedValue({
      ...document,
      versions: [{ filename: "archivo.pdf", mimetype: "application/pdf" }],
    } as never);

    render(<EditDocumentPage />);

    await waitFor(() => expect(screen.getByText("El editor OnlyOffice no está disponible")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Descargar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Volver" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Contenido del documento" })).not.toBeInTheDocument();
  });

  it("renders the OnlyOffice editor when the service is healthy", async () => {
    jest.mocked(onlyofficeService.checkHealth).mockResolvedValue(true);
    jest.mocked(api.get).mockResolvedValue({ data: { type: "desktop" } });

    render(<EditDocumentPage />);

    await waitFor(() => expect(screen.getByText("OnlyOffice")).toBeInTheDocument());
    expect(screen.queryByText("OnlyOffice no está disponible. Estás usando el editor básico.")).not.toBeInTheDocument();
  });
});
