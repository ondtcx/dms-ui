import { act, render, screen, waitFor } from "@testing-library/react";
import OfficeDocumentPreview, {
  isOfficePreviewType,
} from "../OfficeDocumentPreview";
import api from "@/lib/axios";

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

it("requests an authenticated Blob preview and revokes its URL", async () => {
  URL.createObjectURL = jest.fn(() => "blob:preview");
  URL.revokeObjectURL = jest.fn();
  (api.get as jest.Mock).mockResolvedValue({
    data: new Blob(["pdf"], { type: "application/pdf" }),
  });
  const view = render(
    <OfficeDocumentPreview
      documentId={1}
      versionKey="1"
      mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      onDownload={jest.fn()}
    />,
  );
  await waitFor(() =>
    expect(
      screen.getByTitle("Vista previa básica del documento"),
    ).toHaveAttribute("src", "blob:preview"),
  );
  expect(api.get).toHaveBeenCalledWith(
    "/documents/1/preview",
    expect.objectContaining({
      responseType: "blob",
    }),
  );
  view.unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
});

it("never requests legacy formats and leaves native PDF handling unchanged", () => {
  (api.get as jest.Mock).mockClear();
  render(
    <OfficeDocumentPreview
      documentId={1}
      versionKey="1"
      mimetype="application/msword"
      onDownload={jest.fn()}
    />,
  );
  expect(screen.getByText(/DOC y XLS no son compatibles/)).toBeInTheDocument();
  expect(api.get).not.toHaveBeenCalled();
  expect(isOfficePreviewType("application/pdf")).toBe(false);
});

it("discards stale conversion responses after switching versions", async () => {
  let resolveOld: (value: unknown) => void = () => undefined;
  (api.get as jest.Mock)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    )
    .mockResolvedValueOnce({
      data: new Blob(["new"], { type: "application/pdf" }),
    });
  URL.createObjectURL = jest.fn(() => "blob:new");
  const props = {
    documentId: 1,
    mimetype:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    onDownload: jest.fn(),
  };
  const view = render(<OfficeDocumentPreview {...props} versionKey="1" />);
  view.rerender(<OfficeDocumentPreview {...props} versionKey="2" />);
  await waitFor(() =>
    expect(
      screen.getByTitle("Vista previa básica del documento"),
    ).toHaveAttribute("src", "blob:new"),
  );
  await act(async () => {
    resolveOld({ data: new Blob(["old"], { type: "application/pdf" }) });
  });
  expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  view.unmount();
});

it("shows an explicit failure and original download action", async () => {
  (api.get as jest.Mock).mockRejectedValue(new Error("failed"));
  render(
    <OfficeDocumentPreview
      documentId={1}
      versionKey="1"
      mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      onDownload={jest.fn()}
    />,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "descargar el original",
  );
  expect(
    screen.getByRole("button", { name: "Descargar original" }),
  ).toBeInTheDocument();
});

it("revokes a settled preview when its version changes", async () => {
  (api.get as jest.Mock).mockResolvedValue({
    data: new Blob(["pdf"], { type: "application/pdf" }),
  });
  URL.createObjectURL = jest
    .fn()
    .mockReturnValueOnce("blob:first")
    .mockReturnValueOnce("blob:second");
  URL.revokeObjectURL = jest.fn();
  const props = {
    documentId: 1,
    mimetype:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    onDownload: jest.fn(),
  };
  const view = render(<OfficeDocumentPreview {...props} versionKey="1" />);
  await waitFor(() =>
    expect(
      screen.getByTitle("Vista previa básica del documento"),
    ).toHaveAttribute("src", "blob:first"),
  );
  view.rerender(<OfficeDocumentPreview {...props} versionKey="2" />);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:first");
  await waitFor(() =>
    expect(
      screen.getByTitle("Vista previa básica del documento"),
    ).toHaveAttribute("src", "blob:second"),
  );
  view.unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:second");
});
