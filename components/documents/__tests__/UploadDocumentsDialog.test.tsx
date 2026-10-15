import {
  act,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { UploadDocumentsDialog } from "../UploadDocumentsDialog";
import { documentsService } from "@/lib/services/documents.service";
import type { Directory, Document, ReceptionSettings } from "@/lib/types";
import toast from "react-hot-toast";

let actor: { id: string } | null = { id: "actor-1" };

jest.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: () => ({ user: actor }),
}));

jest.mock("@/lib/services/documents.service", () => ({
  documentsService: {
    upload: jest.fn(),
    uploadMultiple: jest.fn(),
    getDirectoryBreadcrumb: jest.fn(),
    getReception: jest.fn(),
  },
}));
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

function folder(
  overrides: Partial<Directory> & Pick<Directory, "id" | "name" | "createdById">,
): Directory {
  return { parentId: null, createdAt: "", updatedAt: "", ...overrides };
}

function receptionSettings(
  overrides: Partial<ReceptionSettings> = {},
): ReceptionSettings {
  const { capabilities, ...rest } = overrides;
  return {
    directoryId: 7,
    enabled: true,
    singleDocumentPerParticipant: false,
    ...rest,
    capabilities: {
      configure: false,
      manageParticipants: false,
      readAll: false,
      review: false,
      manageDelegates: false,
      manageStructure: false,
      owner: false,
      discover: true,
      submit: false,
      peerRead: false,
      ...(capabilities ?? {}),
    },
  };
}

const ordinaryFolder = folder({
  id: 7,
  name: "Archivo",
  createdById: "other",
  receptionEnabled: false,
});
const receptionFolder = folder({
  id: 7,
  name: "Bandeja",
  createdById: "other",
  receptionEnabled: true,
});

function renderDialog(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
  return { ...view, client, wrap: (children: ReactNode) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  ) };
}

async function uploadReady(label: "Archivo *" | "Archivos *" = "Archivos *") {
  await waitFor(() => expect(screen.getByLabelText(label)).not.toBeDisabled());
}

function selectType(scope: HTMLElement) {
  const general = within(scope).queryByRole("checkbox", {
    name: "Documento general",
  });
  if (general?.getAttribute("aria-checked") === "true") {
    fireEvent.click(general);
  }
  HTMLElement.prototype.scrollIntoView = jest.fn();
  fireEvent.keyDown(
    within(scope).getByRole("combobox", { name: "Tipo de documento *" }),
    { key: "Enter" },
  );
  fireEvent.click(screen.getByRole("option", { name: "Oficio" }));
}

describe("per-file upload queue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    actor = { id: "actor-1" };
    jest
      .mocked(documentsService.getDirectoryBreadcrumb)
      .mockResolvedValue([ordinaryFolder]);
  });
  const props = {
    open: true,
    multiple: true,
    directoryId: 7,
    uploadDocumentTypes: [
      { id: 12, name: "Oficio" },
      { id: 22, name: "Documento general", isDefault: true },
    ],
    onOpenChange: jest.fn(),
    onSuccess: jest.fn(),
  };
  it("starts newly added files with the persisted default type preselected", async () => {
    renderDialog(<UploadDocumentsDialog {...props} />);
    await uploadReady();
    fireEvent.drop(screen.getByTestId("upload-drop-zone"), {
      dataTransfer: { files: [new File(["data"], "one.txt")] },
    });
    const group = screen.getByRole("group");
    expect(
      within(group).getByRole("checkbox", { name: "Documento general" }),
    ).toBeChecked();
    expect(
      within(group).getByRole("combobox", { name: "Tipo de documento *" }),
    ).toHaveTextContent("Documento general");
  });
  it('selects and sends both files through the actual multi-file input', async () => {
    jest.mocked(documentsService.uploadMultiple).mockResolvedValue([]);
    renderDialog(<UploadDocumentsDialog {...props} />);
    await uploadReady();
    const input = screen.getByLabelText('Archivos *');
    expect(input).toHaveAttribute('multiple');
    const files = [new File(['one'], 'one.txt'), new File(['two'], 'two.txt')];
    await userEvent.upload(input, files);
    expect(screen.getAllByRole('group')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Subir 2 archivo(s)' }));
    await waitFor(() => expect(documentsService.uploadMultiple).toHaveBeenCalledWith(
      files, [expect.objectContaining({ documentTypeId: 22 }), expect.objectContaining({ documentTypeId: 22 })],
      7, expect.any(Function),
    ));
  });
  it("submits the persisted default type when the checkbox stays checked", async () => {
    jest.mocked(documentsService.uploadMultiple).mockResolvedValue([]);
    renderDialog(<UploadDocumentsDialog {...props} />);
    await uploadReady();
    fireEvent.drop(screen.getByTestId("upload-drop-zone"), {
      dataTransfer: { files: [new File(["data"], "one.txt")] },
    });
    const group = screen.getByRole("group");
    expect(
      within(group).getByRole("combobox", { name: "Tipo de documento *" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Subir 1 archivo(s)" }));
    await waitFor(() =>
      expect(documentsService.uploadMultiple).toHaveBeenCalledWith(
        [expect.any(File)],
        [expect.objectContaining({ documentTypeId: 22 })],
        7,
        expect.any(Function),
      ),
    );
  });
  it("drops files, preserves independent metadata after removal, and posts one compensated batch", async () => {
    jest.mocked(documentsService.uploadMultiple).mockResolvedValue([]);
    renderDialog(<UploadDocumentsDialog {...props} />);
    await uploadReady();
    const files = ["one.txt", "two.txt", "three.txt"].map(
      (name) => new File(["data"], name),
    );
    fireEvent.drop(screen.getByTestId("upload-drop-zone"), {
      dataTransfer: { files },
    });
    const groups = screen.getAllByRole("group");
    groups.forEach((group, index) => {
      fireEvent.change(
        within(group).getByRole("textbox", { name: "Descripción (opcional)" }),
        { target: { value: `Description ${index}` } },
      );
      selectType(group);
      fireEvent.change(within(group).getByLabelText("Nombre del documento (opcional)"), { target: { value: `Name ${index}` } });
      fireEvent.change(within(group).getByLabelText("Número institucional (opcional)"), { target: { value: `Manual ${index}` } });
    });
    fireEvent.change(
      within(groups[2]).getByLabelText("Fecha de origen (opcional)"),
      { target: { value: "2024-02-29" } },
    );
    fireEvent.click(
      within(groups[1]).getByRole("button", { name: "Quitar two.txt" }),
    );
    expect(screen.getAllByRole("group")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Subir 2 archivo(s)" }));
    await waitFor(() =>
      expect(documentsService.uploadMultiple).toHaveBeenCalledWith(
        [files[0], files[2]],
        [
          expect.objectContaining({
            description: "Description 0",
            name: "Name 0",
            documentNumber: "Manual 0",
            documentTypeId: 12,
          }),
          expect.objectContaining({
            description: "Description 2",
            name: "Name 2",
            documentNumber: "Manual 2",
            originDate: "2024-02-29",
          }),
        ],
        7,
        expect.any(Function),
      ),
    );
  });
  it("blocks dismissal and edits while 100 percent is still processing, retaining failure state", async () => {
    let reject!: (error: Error) => void;
    jest
      .mocked(documentsService.upload)
      .mockImplementation((_file, _data, onProgress) => {
        onProgress?.(100);
        return new Promise((_resolve, rejectPromise) => {
          reject = rejectPromise;
        });
      });
    const interaction = userEvent.setup();
    renderDialog(<UploadDocumentsDialog {...props} multiple={false} />);
    await uploadReady("Archivo *");
    await interaction.upload(
      screen.getByLabelText("Archivo *"),
      new File(["data"], "one.txt"),
    );
    const group = screen.getByRole("group");
    fireEvent.change(within(group).getByRole("textbox", { name: "Descripción (opcional)" }), {
      target: { value: "Agenda" },
    });
    selectType(group);
    fireEvent.change(screen.getByLabelText("Nombre del documento (opcional)"), { target: { value: "Consejo" } });
    fireEvent.change(screen.getByLabelText("Número institucional (opcional)"), { target: { value: "Manual / 7" } });
    fireEvent.click(screen.getByRole("button", { name: "Subir Documento" }));
    expect(
      await screen.findByText("100% — Procesando documentos..."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Descripción (opcional)" })).toBeDisabled();
    expect(screen.getByLabelText("Nombre del documento (opcional)")).toBeDisabled();
    expect(screen.getByLabelText("Número institucional (opcional)")).toBeDisabled();
    await interaction.keyboard("{Escape}");
    expect(props.onOpenChange).not.toHaveBeenCalled();
    reject(new Error("Failed"));
    await screen.findByRole("alert");
    expect(screen.getByRole("textbox", { name: "Descripción (opcional)" })).toHaveValue("Agenda");
    expect(screen.getByLabelText("Nombre del documento (opcional)")).toHaveValue("Consejo");
    expect(screen.getByLabelText("Número institucional (opcional)")).toHaveValue("Manual / 7");
    expect(documentsService.upload).toHaveBeenCalledWith(expect.any(File), expect.objectContaining({ name: "Consejo", documentNumber: "Manual / 7" }), expect.any(Function));
    expect(screen.getByRole("group")).toHaveAccessibleName("one.txt");
  });
  it("requires a concrete type when Documento general is unchecked without a choice", async () => {
    renderDialog(<UploadDocumentsDialog {...props} />);
    await uploadReady();
    fireEvent.drop(screen.getByTestId("upload-drop-zone"), {
      dataTransfer: { files: [new File(["x"], "one.txt")] },
    });
    fireEvent.click(
      within(screen.getByRole("group")).getByRole("checkbox", {
        name: "Documento general",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Subir 1 archivo(s)" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("tipo de documento");
    expect(documentsService.uploadMultiple).not.toHaveBeenCalled();
  });
  it.each([false, true])(
    "shows server warnings only after success in multiple=%s",
    async (multiple) => {
      const uploaded = {
        id: 1,
        warnings: ["No hay un año lectivo para esta fecha."],
      } as any;
      jest.mocked(documentsService.upload).mockResolvedValue(uploaded);
      jest
        .mocked(documentsService.uploadMultiple)
        .mockResolvedValue([uploaded]);
      renderDialog(<UploadDocumentsDialog {...props} multiple={multiple} />);
      await uploadReady(multiple ? "Archivos *" : "Archivo *");
      fireEvent.drop(screen.getByTestId("upload-drop-zone"), {
        dataTransfer: { files: [new File(["x"], "one.txt")] },
      });
      fireEvent.change(screen.getByRole("textbox", { name: "Descripción (opcional)" }), {
        target: { value: "Agenda" },
      });
      selectType(screen.getByRole("group"));
      expect(toast).not.toHaveBeenCalled();
      fireEvent.click(
        screen.getByRole("button", {
          name: multiple ? "Subir 1 archivo(s)" : "Subir Documento",
        }),
      );
      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith(
          "one.txt: No hay un año lectivo para esta fecha.",
          { duration: 10000 },
        ),
      );
      expect(props.onSuccess).toHaveBeenCalledTimes(1);
    },
  );
  it("rejects an oversized batch queue without discarding already selected files", async () => {
    renderDialog(<UploadDocumentsDialog {...props} />);
    await uploadReady();
    const files = Array.from(
      { length: 10 },
      (_, index) => new File(["x"], `${index}.txt`),
    );
    fireEvent.drop(screen.getByTestId("upload-drop-zone"), {
      dataTransfer: { files },
    });
    fireEvent.drop(screen.getByTestId("upload-drop-zone"), {
      dataTransfer: { files: [new File(["x"], "extra.txt")] },
    });
    expect(screen.getAllByRole("group")).toHaveLength(10);
    expect(screen.getByRole("alert")).toHaveTextContent("10 archivos");
  });
});

describe("reception submission gating", () => {
  const props = {
    open: true,
    multiple: true,
    directoryId: 7,
    uploadDocumentTypes: [
      { id: 12, name: "Oficio" },
      { id: 22, name: "Documento general", isDefault: true },
    ],
    onOpenChange: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    actor = { id: "actor-1" };
    jest
      .mocked(documentsService.getDirectoryBreadcrumb)
      .mockResolvedValue([receptionFolder]);
  });

  it("denies the queue and shows a read-only notice when the reception withholds submit", async () => {
    jest
      .mocked(documentsService.getReception)
      .mockResolvedValue(receptionSettings({ capabilities: { submit: false } as never }));
    renderDialog(<UploadDocumentsDialog {...props} />);
    expect(
      await screen.findByText(/no tienes autorización/i),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText("Archivos *")).toBeDisabled(),
    );
    fireEvent.drop(screen.getByTestId("upload-drop-zone"), {
      dataTransfer: { files: [new File(["x"], "a.txt")] },
    });
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });

  it("limits a single-document quota to one distinct file and explains the lifetime rule", async () => {
    jest.mocked(documentsService.getReception).mockResolvedValue(
      receptionSettings({
        singleDocumentPerParticipant: true,
        capabilities: { submit: true } as never,
      }),
    );
    renderDialog(<UploadDocumentsDialog {...props} />);
    await uploadReady();
    fireEvent.drop(screen.getByTestId("upload-drop-zone"), {
      dataTransfer: {
        files: [new File(["x"], "one.txt"), new File(["x"], "two.txt")],
      },
    });
    expect(screen.getAllByRole("group")).toHaveLength(1);
    expect(
      await screen.findByText(/un solo documento por persona/i),
    ).toBeInTheDocument();
  });
  it('keeps the actual reception picker single and sends only its first file', async () => {
    jest.mocked(documentsService.getReception).mockResolvedValue(receptionSettings({
      singleDocumentPerParticipant: true, capabilities: { submit: true } as never,
    }));
    jest.mocked(documentsService.upload).mockResolvedValue({ id: 1 } as Document);
    renderDialog(<UploadDocumentsDialog {...props} />);
    await uploadReady();
    const input = screen.getByLabelText('Archivos *');
    expect(input).not.toHaveAttribute('multiple');
    const files = [new File(['one'], 'one.txt'), new File(['two'], 'two.txt')];
    await userEvent.upload(input, files);
    expect(screen.getAllByRole('group')).toHaveLength(1);
    expect(input).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Subir Documento' }));
    await waitFor(() => expect(documentsService.upload).toHaveBeenCalledWith(files[0],
      expect.objectContaining({ documentTypeId: 22 }), expect.any(Function)));
    expect(documentsService.uploadMultiple).not.toHaveBeenCalled();
  });

  it("clears queued files when the acting user changes so they cannot be uploaded elsewhere", async () => {
    jest
      .mocked(documentsService.getReception)
      .mockResolvedValue(receptionSettings({ capabilities: { submit: true } as never }));
    const view = renderDialog(<UploadDocumentsDialog {...props} />);
    await uploadReady();
    fireEvent.drop(screen.getByTestId("upload-drop-zone"), {
      dataTransfer: { files: [new File(["x"], "one.txt")] },
    });
    expect(screen.getAllByRole("group")).toHaveLength(1);
    actor = { id: "actor-2" };
    view.rerender(
      view.wrap(<UploadDocumentsDialog {...props} />),
    );
    await waitFor(() =>
      expect(screen.queryAllByRole("group")).toHaveLength(0),
    );
  });

  it("clears queued files when the target directory changes under an open dialog", async () => {
    jest
      .mocked(documentsService.getReception)
      .mockResolvedValue(receptionSettings({ capabilities: { submit: true } as never }));
    const view = renderDialog(<UploadDocumentsDialog {...props} />);
    await uploadReady();
    fireEvent.drop(screen.getByTestId("upload-drop-zone"), {
      dataTransfer: { files: [new File(["x"], "one.txt")] },
    });
    expect(screen.getAllByRole("group")).toHaveLength(1);
    jest
      .mocked(documentsService.getDirectoryBreadcrumb)
      .mockResolvedValue([
        folder({ id: 8, name: "Otro", createdById: "other", receptionEnabled: false }),
      ]);
    view.rerender(
      view.wrap(<UploadDocumentsDialog {...props} directoryId={8} />),
    );
    await waitFor(() =>
      expect(screen.queryAllByRole("group")).toHaveLength(0),
    );
  });

  it("keeps the queue disabled while the capabilities readback is still pending", async () => {
    jest
      .mocked(documentsService.getReception)
      .mockImplementation(() => new Promise(() => {}));
    renderDialog(<UploadDocumentsDialog {...props} />);
    await waitFor(() =>
      expect(screen.getByLabelText("Archivos *")).toBeDisabled(),
    );
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });

  it("keeps the draft and surfaces a server quota conflict for explicit retry", async () => {
    jest
      .mocked(documentsService.getReception)
      .mockResolvedValue(receptionSettings({ capabilities: { submit: true } as never }));
    jest
      .mocked(documentsService.uploadMultiple)
      .mockRejectedValue({ response: { status: 409, data: { message: "Ya entregaste tu documento" } } });
    renderDialog(<UploadDocumentsDialog {...props} />);
    await uploadReady();
    fireEvent.drop(screen.getByTestId("upload-drop-zone"), {
      dataTransfer: { files: [new File(["x"], "one.txt")] },
    });
    const group = screen.getByRole("group");
    fireEvent.change(within(group).getByRole("textbox", { name: "Descripción (opcional)" }), {
      target: { value: "Agenda" },
    });
    selectType(group);
    fireEvent.click(screen.getByRole("button", { name: "Subir 1 archivo(s)" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ya entregaste tu documento",
    );
    expect(screen.getAllByRole("group")).toHaveLength(1);
    expect(props.onSuccess).not.toHaveBeenCalled();
  });
});

describe("reception operation context isolation", () => {
  const props = {
    open: true,
    multiple: false,
    directoryId: 7,
    uploadDocumentTypes: [
      { id: 12, name: "Oficio" },
      { id: 22, name: "Documento general", isDefault: true },
    ],
    onOpenChange: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    actor = { id: "actor-1" };
    jest
      .mocked(documentsService.getDirectoryBreadcrumb)
      .mockResolvedValue([receptionFolder]);
    jest
      .mocked(documentsService.getReception)
      .mockResolvedValue(receptionSettings({ capabilities: { submit: true } as never }));
  });

  async function startSingleSubmission() {
    await uploadReady("Archivo *");
    await userEvent.upload(
      screen.getByLabelText("Archivo *"),
      new File(["x"], "one.txt"),
    );
    const group = screen.getByRole("group");
    fireEvent.change(within(group).getByRole("textbox", { name: "Descripción (opcional)" }), {
      target: { value: "Agenda" },
    });
    selectType(group);
    fireEvent.click(screen.getByRole("button", { name: "Subir Documento" }));
    await waitFor(() => expect(documentsService.upload).toHaveBeenCalled());
  }

  it("ignores drops while the dialog is closed", () => {
    renderDialog(<UploadDocumentsDialog {...props} open={false} />);
    expect(screen.queryByTestId("upload-drop-zone")).not.toBeInTheDocument();
    expect(documentsService.upload).not.toHaveBeenCalled();
  });

  it("ignores drops without an authenticated identity", async () => {
    actor = null;
    renderDialog(<UploadDocumentsDialog {...props} />);
    await waitFor(() =>
      expect(screen.getByLabelText("Archivo *")).toBeDisabled(),
    );
    fireEvent.drop(screen.getByTestId("upload-drop-zone"), {
      dataTransfer: { files: [new File(["x"], "a.txt")] },
    });
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });

  it("keeps root uploads available with an authenticated identity", async () => {
    renderDialog(<UploadDocumentsDialog {...props} directoryId={null} />);
    await uploadReady("Archivo *");
    fireEvent.drop(screen.getByTestId("upload-drop-zone"), {
      dataTransfer: { files: [new File(["x"], "a.txt")] },
    });
    expect(screen.getAllByRole("group")).toHaveLength(1);
  });

  it("does not settle a stale request into a reopened dialog with the same actor and folder", async () => {
    let resolveUpload!: (document: Document) => void;
    jest
      .mocked(documentsService.upload)
      .mockImplementation(() => new Promise((resolve) => (resolveUpload = resolve)));
    const view = renderDialog(<UploadDocumentsDialog {...props} />);
    await startSingleSubmission();

    view.rerender(view.wrap(<UploadDocumentsDialog {...props} open={false} />));
    view.rerender(view.wrap(<UploadDocumentsDialog {...props} open={true} />));

    await act(async () => {
      resolveUpload({ id: 1 } as Document);
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(props.onSuccess).not.toHaveBeenCalled();
    expect(props.onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("does not apply an old success after actor A to B to A", async () => {
    let resolveUpload!: (document: Document) => void;
    jest
      .mocked(documentsService.upload)
      .mockImplementation(() => new Promise((resolve) => (resolveUpload = resolve)));
    const view = renderDialog(<UploadDocumentsDialog {...props} />);
    await startSingleSubmission();

    actor = { id: "actor-2" };
    view.rerender(view.wrap(<UploadDocumentsDialog {...props} />));
    actor = { id: "actor-1" };
    view.rerender(view.wrap(<UploadDocumentsDialog {...props} />));

    await act(async () => {
      resolveUpload({ id: 1 } as Document);
    });

    expect(props.onSuccess).not.toHaveBeenCalled();
    expect(props.onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("ignores progress reported by a stale operation", async () => {
    let report!: (value: number) => void;
    jest.mocked(documentsService.upload).mockImplementation((_file, _data, onProgress) => {
      report = onProgress as (value: number) => void;
      return new Promise(() => {});
    });
    const view = renderDialog(<UploadDocumentsDialog {...props} />);
    await startSingleSubmission();

    actor = { id: "actor-2" };
    view.rerender(view.wrap(<UploadDocumentsDialog {...props} />));
    act(() => report(50));

    expect(screen.queryByText(/50%/)).not.toBeInTheDocument();
  });

  it("does not surface a stale operation error in a new context", async () => {
    let reject!: (error: unknown) => void;
    jest.mocked(documentsService.upload).mockImplementation(
      () => new Promise((_resolve, rejectPromise) => (reject = rejectPromise)),
    );
    const view = renderDialog(<UploadDocumentsDialog {...props} />);
    await startSingleSubmission();

    actor = { id: "actor-2" };
    view.rerender(view.wrap(<UploadDocumentsDialog {...props} />));
    await act(async () => {
      reject({ response: { data: { message: "Error viejo" } } });
    });

    expect(screen.queryByText("Error viejo")).not.toBeInTheDocument();
  });

  it("allows a fresh submission after a stale request settles without auto retry", async () => {
    let resolveUpload!: (document: Document) => void;
    jest
      .mocked(documentsService.upload)
      .mockImplementation(() => new Promise((resolve) => (resolveUpload = resolve)));
    const view = renderDialog(<UploadDocumentsDialog {...props} />);
    await startSingleSubmission();

    actor = { id: "actor-2" };
    view.rerender(view.wrap(<UploadDocumentsDialog {...props} />));
    actor = { id: "actor-1" };
    view.rerender(view.wrap(<UploadDocumentsDialog {...props} />));

    await act(async () => {
      resolveUpload({ id: 1 } as Document);
    });

    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText("Archivo *")).not.toBeDisabled(),
    );
    expect(documentsService.upload).toHaveBeenCalledTimes(1);
  });
});
