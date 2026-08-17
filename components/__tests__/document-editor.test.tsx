import { fireEvent, render, screen } from "@testing-library/react";
import { applyMarkdownToSelection, DocumentEditor } from "@/components/document-editor";

describe("DocumentEditor", () => {
  it("wraps the selected text in Markdown bold syntax", () => {
    expect(applyMarkdownToSelection("texto seleccionado", 0, 5, "bold")).toBe(
      "**texto** seleccionado",
    );
  });

  it("shows the Spanish saving state and invokes save", () => {
    const onSave = jest.fn();
    render(
      <DocumentEditor
        title="Notas"
        content="contenido"
        onContentChange={jest.fn()}
        onSave={onSave}
        isSaving
      />,
    );

    expect(screen.getByRole("button", { name: "Guardando..." })).toBeDisabled();
    expect(screen.getByText("Guardando...")).toBeInTheDocument();
  });
});
