import { fireEvent, render, screen } from "@testing-library/react";
import { DocumentPreviewDialog } from "../DocumentPreviewDialog";

describe("DocumentPreviewDialog logical identity", () => {
  it.each(["Consejo", null, "  "])("uses nonblank logical name %j while retaining download identity", (name) => {
    const onDownload = jest.fn();
    render(<DocumentPreviewDialog open onOpenChange={jest.fn()} document={{ id: 1, name,
      versions: [{ filename: "original.pdf" }] } as any} previewUrl="blob:preview"
      loadingPreview={false} onDownload={onDownload} />);
    const title = name?.trim() || "original.pdf";
    expect(screen.getByRole("heading", { name: `Vista Previa: ${title}` })).toBeInTheDocument();
    expect(screen.getByTitle(title)).toHaveAttribute("src", "blob:preview");
    fireEvent.click(screen.getByRole("button", { name: "Descargar" }));
    expect(onDownload).toHaveBeenCalledWith(1, "original.pdf");
  });
});
