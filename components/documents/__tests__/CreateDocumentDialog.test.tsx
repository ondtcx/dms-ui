import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateDocumentDialog } from "../CreateDocumentDialog";
import { authoringService } from "@/lib/services/authoring.service";

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/lib/services/authoring.service", () => ({
  authoringService: {
    listTemplates: jest.fn(),
    createDocument: jest.fn(),
  },
}));

const template = {
  id: 7,
  name: "Oficio institucional",
  description: "Comunicación oficial",
  documentTypeId: 23,
  documentType: { id: 23, name: "Oficio" },
  isBlank: false,
  categoryId: 25,
  fields: { fields: [] },
  htmlTemplate: "<p/>",
  isActive: true,
  catalog: "institutional",
  versions: [
    {
      id: 5,
      templateId: 7,
      version: 1,
      status: "PUBLISHED" as const,
      bodyHtml: "<p/>",
      fields: { fields: [] },
      pageSize: "A4",
      orientation: "portrait",
      numberPrefix: "OFI",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};

function renderDialog(overrides: Partial<React.ComponentProps<typeof CreateDocumentDialog>> = {}) {
  const onOpenChange = jest.fn();
  const onUploadSingle = jest.fn();
  const onUploadMultiple = jest.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <CreateDocumentDialog
        open
        onOpenChange={onOpenChange}
        uploadDocumentTypes={[
          { id: 1, name: "Documento general", isDefault: true },
          { id: 23, name: "Oficio", isDefault: false },
        ]}
        academicYears={[]}
        onUploadSingle={onUploadSingle}
        onUploadMultiple={onUploadMultiple}
        {...overrides}
      />
    </QueryClientProvider>,
  );
  return { onOpenChange, onUploadSingle, onUploadMultiple };
}

beforeEach(() => {
  jest.clearAllMocks();
  (authoringService.listTemplates as jest.Mock).mockResolvedValue([template]);
  (authoringService.createDocument as jest.Mock).mockResolvedValue({ id: 123 });
});

describe("CreateDocumentDialog", () => {
  it("opens on the editor mode and creates a blank draft with metadata", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    expect(screen.getByRole("tab", { name: "Editor" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await user.type(
      screen.getByLabelText("Nombre del documento (opcional)"),
      "Mi documento",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Descripción (opcional)" }),
      "Descripción breve",
    );
    await user.click(screen.getByRole("button", { name: "Crear en editor" }));

    await waitFor(() =>
      expect(authoringService.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          blank: true,
          institutionalFrame: false,
          name: "Mi documento",
          description: "Descripción breve",
          documentTypeId: 1,
        }),
      ),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(push).toHaveBeenCalledWith("/dashboard/elaboracion/123/editar");
  });

  it("creates from a published template and inherits its document type", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("tab", { name: "Plantilla" }));
    fireEvent.click(
      await screen.findByRole("button", { name: /Oficio institucional/ }),
    );
    await user.click(screen.getByRole("button", { name: "Crear desde plantilla" }));

    await waitFor(() =>
      expect(authoringService.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          blank: false,
          templateVersionId: 5,
          documentTypeId: 23,
        }),
      ),
    );
  });

  it("delegates the upload modes to the existing upload flow", async () => {
    const user = userEvent.setup();
    const { onOpenChange, onUploadSingle, onUploadMultiple } = renderDialog();

    await user.click(screen.getByRole("tab", { name: "Subir" }));
    await user.click(screen.getByRole("button", { name: "Subir un archivo" }));
    expect(onUploadSingle).toHaveBeenCalledTimes(1);
    expect(onUploadMultiple).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);

    await user.click(screen.getByRole("tab", { name: "Subir" }));
    await user.click(screen.getByRole("button", { name: "Subir varios archivos" }));
    expect(onUploadMultiple).toHaveBeenCalledTimes(1);
  });

  it("disables upload modes when uploads are unavailable", async () => {
    const user = userEvent.setup();
    renderDialog({ uploadDisabled: true });

    await user.click(screen.getByRole("tab", { name: "Subir" }));
    expect(
      screen.getByRole("button", { name: "Subir un archivo" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Subir varios archivos" }),
    ).toBeDisabled();
  });
});


  it("enables the institutional Acta frame on demand", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(
      screen.getByLabelText("Nombre del documento (opcional)"),
      "Documento institucional",
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: "Usar formato institucional del Acta de entrega-recepción",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Crear en editor" }));

    await waitFor(() =>
      expect(authoringService.createDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          blank: true,
          institutionalFrame: true,
        }),
      ),
    );
  });
