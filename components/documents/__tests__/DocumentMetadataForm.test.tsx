import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentMetadataForm } from "../DocumentMetadataForm";
import { EMPTY_UPLOAD_METADATA } from "@/lib/types";
import type { AcademicYear, UploadMetadata } from "@/lib/types";

const metadata = {
  ...EMPTY_UPLOAD_METADATA,
  directoryId: 4,
  courseId: 3,
  isPublic: true,
};
const defaultTypeId = 22;
const documentTypes = [
  { id: defaultTypeId, name: "Documento general", isDefault: true },
  { id: 12, name: "Oficio" },
  { id: 13, name: "Acta" },
];
const years: AcademicYear[] = [
  {
    id: 1,
    name: "Current year",
    isCurrent: true,
    isActive: true,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
  },
  {
    id: 2,
    name: "Historical year",
    isCurrent: false,
    isActive: false,
    startDate: "2025-01-01",
    endDate: "2025-12-31",
  },
];

describe("DocumentMetadataForm description", () => {
  it("preserves optional fields through edits and disables them while uploading", () => {
    const onChange = jest.fn();
    const view = render(<DocumentMetadataForm value={{ ...metadata, name: "Consejo", documentNumber: "Manual / 7" } as any}
      onChange={onChange} uploadDocumentTypes={documentTypes} />);
    fireEvent.change(screen.getByLabelText("Nombre del documento (opcional)"), { target: { value: " Nuevo " } });
    expect(onChange).toHaveBeenLastCalledWith({ ...metadata, name: " Nuevo ", documentNumber: "Manual / 7" });
    view.rerender(<DocumentMetadataForm value={metadata} onChange={onChange} uploadDocumentTypes={documentTypes} disabled />);
    expect(screen.getByLabelText("Nombre del documento (opcional)")).toBeDisabled();
    expect(screen.getByLabelText("Número institucional (opcional)")).toBeDisabled();
  });
  it("associates optional descriptions and per-file fields with unique labels", () => {
    render(
      <>
        <DocumentMetadataForm
          value={metadata}
          onChange={jest.fn()}
          uploadDocumentTypes={documentTypes}
        />
        <DocumentMetadataForm
          value={metadata}
          onChange={jest.fn()}
          uploadDocumentTypes={documentTypes}
        />
      </>,
    );

    const fields = screen.getAllByRole("textbox", { name: "Descripción (opcional)" });
    expect(fields[0].id).not.toBe(fields[1].id);
    for (const field of fields) {
      expect(field).toHaveValue("");
      expect(field).not.toBeRequired();
      expect(field).not.toHaveAttribute("maxlength");
      expect(field).toHaveAccessibleDescription(
        "Describe el asunto o contenido del documento para facilitar su identificación y búsqueda posterior.",
      );
      expect(
        document.getElementById(field.getAttribute("aria-describedby")!),
      ).toBeInTheDocument();
    }
    const yearFields = screen.getAllByLabelText("Fecha de origen (opcional)");
    for (const label of ["Nombre del documento (opcional)", "Número institucional (opcional)"]) {
      const optionalFields = screen.getAllByRole("textbox", { name: label });
      expect(optionalFields[0].id).not.toBe(optionalFields[1].id);
      expect(optionalFields[0]).not.toBeRequired();
      expect(optionalFields[0]).not.toHaveAttribute("pattern");
    }
    expect(yearFields[0].id).not.toBe(yearFields[1].id);
    for (const field of yearFields) {
      expect(field).not.toHaveAttribute("aria-required", "true");
      expect(field).toHaveAccessibleDescription(
        "Si se deja vacía, se usará la fecha actual. El servidor determinará el año lectivo al cargar.",
      );
    }
  });

  it("previews inactive periods without a manual year selector or metadata loss", () => {
    const onChange = jest.fn();
    function ControlledForm({ catalog }: { catalog?: AcademicYear[] }) {
      const [value, setValue] = useState<UploadMetadata>({
        ...metadata,
        documentTypeId: 12,
        description: "Existing description",
      });
      return (
        <DocumentMetadataForm
          value={value}
          academicYears={catalog}
          uploadDocumentTypes={documentTypes}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
        />
      );
    }
    const view = render(<ControlledForm catalog={years} />);
    const field = screen.getByLabelText("Fecha de origen (opcional)");
    fireEvent.change(field, { target: { value: "2025-12-31" } });
    expect(onChange).toHaveBeenLastCalledWith({
      ...metadata,
      documentTypeId: 12,
      description: "Existing description",
      originDate: "2025-12-31",
    });
    expect(
      screen.getByText(/Año lectivo estimado: Historical year/),
    ).toBeInTheDocument();
    view.rerender(<ControlledForm catalog={[...years].reverse()} />);
    expect(field).toHaveValue("2025-12-31");
    expect(onChange).toHaveBeenCalledTimes(1);
    fireEvent.change(field, { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith({
      ...metadata,
      documentTypeId: 12,
      description: "Existing description",
      originDate: undefined,
    });
    expect(
      screen.queryByRole("combobox", { name: "Año lectivo del documento" }),
    ).not.toBeInTheDocument();
  });

  it("preserves metadata and exact text through controlled edits and type selection", async () => {
    const onChange = jest.fn();
    function ControlledForm() {
      const [value, setValue] = useState<UploadMetadata>(metadata);
      return (
        <DocumentMetadataForm
          value={value}
          uploadDocumentTypes={documentTypes}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
        />
      );
    }
    const interaction = userEvent.setup();
    render(<ControlledForm />);
    const field = screen.getByRole("textbox", { name: "Descripción (opcional)" });
    const description = "  Meeting agenda\nFollow-up  ";
    fireEvent.change(field, { target: { value: description } });
    expect(field).toHaveValue(description);
    expect(onChange).toHaveBeenLastCalledWith({ ...metadata, description });

    const scrollIntoView = jest.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    try {
      fireEvent.keyDown(
        screen.getByRole("combobox", { name: "Tipo de documento *" }),
        { key: "Enter" },
      );
      fireEvent.click(screen.getByRole("option", { name: "Oficio" }));
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
    expect(onChange).toHaveBeenLastCalledWith({
      ...metadata,
      description,
      documentTypeId: 12,
    });
    expect(field).toHaveValue(description);

    await interaction.clear(field);
    expect(onChange).toHaveBeenLastCalledWith({
      ...metadata,
      documentTypeId: 12,
      description: "",
    });
    expect(field).toHaveValue("");
  });

  it("sorts document types by name", () => {
    const onChange = jest.fn();
    render(
      <DocumentMetadataForm
        value={{ ...metadata, documentTypeId: 13 }}
        onChange={onChange}
        uploadDocumentTypes={documentTypes}
      />,
    );

    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = jest.fn();
    try {
      fireEvent.keyDown(screen.getByRole("combobox", { name: "Tipo de documento *" }), { key: "Enter" });
      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["Acta", "Oficio"]);
      expect(screen.getByRole("listbox")).toHaveClass("h-60", "overflow-y-auto");
      fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it("checks Documento general to select the persisted default type and disable the concrete selector", () => {
    const onChange = jest.fn();
    const view = render(
      <DocumentMetadataForm
        value={{ ...metadata, documentTypeId: 12 }}
        onChange={onChange}
        uploadDocumentTypes={documentTypes}
      />,
    );

    const general = screen.getByRole("checkbox", { name: "Documento general" });
    expect(general).not.toBeChecked();
    fireEvent.click(general);
    expect(onChange).toHaveBeenLastCalledWith({
      ...metadata,
      documentTypeId: defaultTypeId,
    });

    view.rerender(
      <DocumentMetadataForm
        value={{ ...metadata, documentTypeId: defaultTypeId }}
        onChange={onChange}
        uploadDocumentTypes={documentTypes}
      />,
    );
    expect(
      screen.getByRole("checkbox", { name: "Documento general" }),
    ).toBeChecked();
    expect(
      screen.getByRole("combobox", { name: "Tipo de documento *" }),
    ).toBeDisabled();
  });

  it("unchecks Documento general to re-enable concrete selection without choosing a type", () => {
    const onChange = jest.fn();
    const view = render(
      <DocumentMetadataForm
        value={{ ...metadata, documentTypeId: defaultTypeId }}
        onChange={onChange}
        uploadDocumentTypes={documentTypes}
      />,
    );

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Documento general" }),
    );
    expect(onChange).toHaveBeenLastCalledWith({
      ...metadata,
      documentTypeId: undefined,
    });

    view.rerender(
      <DocumentMetadataForm
        value={{ ...metadata, documentTypeId: undefined }}
        onChange={onChange}
        uploadDocumentTypes={documentTypes}
      />,
    );
    expect(
      screen.getByRole("checkbox", { name: "Documento general" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("combobox", { name: "Tipo de documento *" }),
    ).not.toBeDisabled();
  });

  it("excludes the persisted default type from the concrete dropdown", () => {
    render(
      <DocumentMetadataForm
        value={{ ...metadata, documentTypeId: 12 }}
        onChange={jest.fn()}
        uploadDocumentTypes={documentTypes}
      />,
    );

    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = jest.fn();
    try {
      fireEvent.keyDown(
        screen.getByRole("combobox", { name: "Tipo de documento *" }),
        { key: "Enter" },
      );
      expect(
        screen.getAllByRole("option").map((option) => option.textContent),
      ).toEqual(["Acta", "Oficio"]);
      fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it("does not present a concrete global default as a shortcut", () => {
    render(
      <DocumentMetadataForm
        value={{ ...metadata, documentTypeId: undefined }}
        onChange={jest.fn()}
        uploadDocumentTypes={documentTypes}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /predeterminado/i }),
    ).not.toBeInTheDocument();
  });
});
