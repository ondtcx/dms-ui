import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Document } from "@/lib/types";
import { DocumentCard } from "@/components/documents/DocumentCard";

const documentFixture = {
  actionCapabilities: {
    scope: "ordinary", editMetadata: true, editContent: true, move: true,
    trash: true, restore: false, permanentDelete: false, manageSharing: true,
  },
  id: 42,
  description: "A document description",
  categoryId: 7,
  category: {
    id: 7,
    name: "Administrativo",
    description: null,
    color: "#1d4ed8",
    icon: "folder",
    isActive: true,
    prefix: null,
    requiresCourse: false,
    allowedRoles: [],
    bypassAcademicYear: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  isPublic: false,
  uploadedBy: {
    id: "user-1",
    name: "Ana Torres",
    email: "ana@example.com",
    role: "secretario",
  },
  uploadedById: "user-1",
  templateId: null,
  currentVersion: 1,
  versions: [
    {
      id: 100,
      documentId: 42,
      version: 1,
      filename: "Informe administrativo.pdf",
      mimetype: "application/pdf",
      storedName: "stored.pdf",
      path: "/documents/stored.pdf",
      size: 2048,
      checksumSHA256: null,
      comment: null,
      createdById: "user-1",
      createdBy: {
        id: "user-1",
        name: "Ana Torres",
        email: "ana@example.com",
      },
      createdAt: "2026-09-01T10:00:00.000Z",
      source: "UPLOAD_INICIAL",
    },
  ],
  workflow: null,
  deletedAt: null,
  deletedBy: null,
  deletedById: null,
  archivedAt: null,
  documentNumber: "DOC-0042",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
} as Document;

const createProps = (overrides: Partial<React.ComponentProps<typeof DocumentCard> > = {}) => ({
  doc: documentFixture,
  isSelected: false,
  onToggle: jest.fn(),
  thumbnailUrl: undefined,
  onPreview: jest.fn(),
  onDownload: jest.fn(),
  onShowVersionHistory: jest.fn(),
  onEdit: jest.fn(),
  onReplaceFile: jest.fn(),
  onDelete: jest.fn(),
  canDelete: true,
  isOwn: true,
  isDeleting: false,
  onMove: jest.fn(),
  ...overrides,
});

describe("DocumentCard", () => {
  it('shows owner outgoing sharing without needing recipient lookup', () => {
    render(<DocumentCard {...createProps({ doc: { ...documentFixture, sharingSummary: { shared: true, direct: true, inherited: false, public: false } } })} />);
    expect(screen.getByRole('note', { name: 'Compartido con otras personas' })).toBeInTheDocument();
  });
  it('shows incoming actual sharer and inherited folder provenance', () => {
    render(<DocumentCard {...createProps({ doc: { ...documentFixture, sharingProvenance: [{ grantedBy: { name: 'Delegada' }, sourceDirectory: { id: 7, name: 'Académico' }, inherited: true }] } })} />);
    expect(screen.getByRole('note', { name: 'Compartido por Delegada · Heredado de Académico' })).toBeInTheDocument();
  });
  it('denies non-owner trash even when legacy ownership props and snapshot disagree', async () => {
    render(<DocumentCard {...createProps({ actorId: 'delegate', isOwn: true, canDelete: true })} />);
    await userEvent.click(screen.getByRole('button', { name: 'Más acciones' }));
    expect(screen.queryByRole('menuitem', { name: 'Eliminar' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Compartir' })).toBeInTheDocument();
  });
  it("shows the original upload date instead of origin, update, or version dates", () => {
    const createdAt = "2026-09-01T12:00:00.000Z";
    const doc = {
      ...documentFixture,
      createdAt,
      originDate: "2020-02-03",
      updatedAt: "2026-10-05T12:00:00.000Z",
      versions: [{ ...documentFixture.versions![0], createdAt: "2026-11-06T12:00:00.000Z" }],
    } as Document;
    render(<DocumentCard {...createProps({ doc })} />);

    const date = screen.getByText("01 sept 2026");
    expect(date.tagName).toBe("TIME");
    expect(date).toHaveAttribute("datetime", createdAt);
    expect(date.parentElement).toHaveTextContent(/^01 sept 2026$/);
    expect(screen.queryByText(/Fecha de subida/)).not.toBeInTheDocument();
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading.parentElement).toContainElement(date);
    expect(heading.compareDocumentPosition(date) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it.each(["not-a-date", "", undefined, null])(
    "shows a safe upload date fallback for %s",
    (createdAt) => {
      const doc = { ...documentFixture, createdAt } as unknown as Document;
      const { container } = render(<DocumentCard {...createProps({ doc })} />);

      expect(screen.getByText("Fecha no disponible")).toBeInTheDocument();
      expect(screen.queryByText(/Fecha de subida/)).not.toBeInTheDocument();
      expect(container.querySelector("time")).not.toBeInTheDocument();
      expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
    },
  );

  it("shows logical identity but downloads the original filename", async () => {
    const user = userEvent.setup();
    const props = createProps({ doc: { ...documentFixture, name: "Consejo" } as Document });
    render(<DocumentCard {...props} />);
    expect(screen.getByRole("link", { name: "Consejo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vista previa de Consejo" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    await user.click(screen.getByRole("menuitem", { name: "Descargar" }));
    expect(props.onDownload).toHaveBeenCalledWith(42, "Informe administrativo.pdf");
  });
  it("renders a semantic card with a logical title and no unrequested metadata", () => {
    render(<DocumentCard {...createProps()} />);

    expect(screen.getByRole("listitem")).toContainElement(screen.getByRole("article"));
    const card = screen.getByRole("article");
    expect(card).toBeInTheDocument();
    expect(within(card).getByRole("heading", { level: 3 })).toHaveTextContent(
      "Informe administrativo.pdf",
    );
    expect(within(card).getByRole("link", { name: "Informe administrativo.pdf" })).toHaveAttribute(
      "href",
      "/dashboard/documents/42",
    );
    expect(within(card).queryByText("DOC-0042")).not.toBeInTheDocument();
    expect(within(card).queryByText("Administrativo")).not.toBeInTheDocument();
    expect(within(card).queryByText("2 KB")).not.toBeInTheDocument();
    expect(within(card).queryByText("Tú")).not.toBeInTheDocument();
    expect(within(card).queryByText("Privado")).not.toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: "Ver" })).not.toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: "Descargar" })).not.toBeInTheDocument();
  });

  it("makes the thumbnail the accessible preview button and keeps long filenames usable", () => {
    const longTitle = "Acta institucional con un nombre extraordinariamente largo para envolver";
    const longTitleDocument = {
      ...documentFixture,
      versions: [{ ...documentFixture.versions![0], filename: longTitle }],
    } as Document;

    render(<DocumentCard {...createProps({ doc: longTitleDocument })} />);

    const card = screen.getByRole("article");
    expect(within(card).getByRole("heading", { level: 3 })).toHaveTextContent(longTitle);
    expect(within(card).getByRole("link", { name: longTitle })).not.toHaveAttribute("title");
    expect(within(card).getByRole("button", { name: `Vista previa de ${longTitle}` })).toBeInTheDocument();
    expect(within(card).getByRole("img", { name: "Vista previa no disponible" })).toBeInTheDocument();
  });

  it("renders a provided thumbnail with the document filename as alternative text", () => {
    render(<DocumentCard {...createProps({ thumbnailUrl: "/thumbnail.png" })} />);

    const preview = screen.getByRole("button", { name: "Vista previa de Informe administrativo.pdf" });
    const thumbnail = screen.getByRole("img", { name: "Informe administrativo.pdf" });
    expect(preview).toContainElement(thumbnail);
    expect(thumbnail).toHaveAttribute(
      "src",
      "/thumbnail.png",
    );
  });

  it("offers sharing inside the actions menu instead of a visible button", async () => {
    const user = userEvent.setup();
    render(<DocumentCard {...createProps()} />);

    expect(screen.queryByRole("button", { name: "Compartir" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    expect(screen.getByRole("menuitem", { name: "Compartir" })).toBeInTheDocument();
  });

  it('hides sharing inside the menu when the snapshot denies it', async () => {
    const user = userEvent.setup();
    render(<DocumentCard {...createProps({ doc: {
      ...documentFixture,
      actionCapabilities: { ...documentFixture.actionCapabilities!, manageSharing: false },
    } as Document })} />);

    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    expect(screen.queryByRole("menuitem", { name: "Compartir" })).not.toBeInTheDocument();
  });

  it('shows the description and the page count of the current version', () => {
    render(<DocumentCard {...createProps({ doc: {
      ...documentFixture,
      description: "Acta del consejo de docentes",
      versions: [{ ...documentFixture.versions![0], pageCount: 3 }],
    } as Document })} />);

    expect(screen.getByText('Acta del consejo de docentes')).toBeInTheDocument();
    expect(screen.getByText('3 páginas')).toBeInTheDocument();
  });

  it('names a single page in singular', () => {
    render(<DocumentCard {...createProps({ doc: {
      ...documentFixture,
      versions: [{ ...documentFixture.versions![0], pageCount: 1 }],
    } as Document })} />);

    expect(screen.getByText('1 página')).toBeInTheDocument();
  });

  it.each([null, undefined, 0, -2, 1.5])(
    'omits the page count %s without inventing one',
    (pageCount) => {
      render(<DocumentCard {...createProps({ doc: {
        ...documentFixture,
        versions: [{ ...documentFixture.versions![0], pageCount }],
      } as unknown as Document })} />);

      expect(screen.queryByText(/página/)).not.toBeInTheDocument();
    },
  );

  it.each([null, '', '   '])(
    'renders no empty description row for %s',
    (description) => {
      const { container } = render(<DocumentCard {...createProps({ doc: {
        ...documentFixture,
        description,
      } as Document })} />);

      const paragraphs = Array.from(container.querySelectorAll('p')).map(
        (element) => element.textContent?.trim() ?? '',
      );
      expect(paragraphs).not.toContain('');
    },
  );

  it("reports selection changes for the current document", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();

    render(<DocumentCard {...createProps({ onToggle, isSelected: true })} />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toHaveAttribute("data-state", "checked");
    expect(screen.getByRole("button", { name: "Vista previa de Informe administrativo.pdf" }).parentElement)
      .toContainElement(checkbox);
    await user.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith(documentFixture);
  });

  it("preserves every available action callback", async () => {
    const user = userEvent.setup();
    const props = createProps();

    render(<DocumentCard {...props} />);

    await user.click(screen.getByRole("button", { name: "Vista previa de Informe administrativo.pdf" }));
    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    await user.click(screen.getByRole("menuitem", { name: "Descargar" }));
    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    await user.click(screen.getByRole("menuitem", { name: "Ver Versiones" }));
    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    await user.click(screen.getByRole("menuitem", { name: "Editar Info" }));
    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    await user.click(screen.getByRole("menuitem", { name: "Reemplazar Archivo" }));
    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    await user.click(screen.getByRole("menuitem", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    await user.click(screen.getByRole("menuitem", { name: "Mover a carpeta" }));

    expect(props.onPreview).toHaveBeenCalledWith(documentFixture);
    expect(props.onDownload).toHaveBeenCalledWith(42, "Informe administrativo.pdf");
    expect(props.onShowVersionHistory).toHaveBeenCalledWith(documentFixture);
    expect(props.onEdit).toHaveBeenCalledWith(documentFixture);
    expect(props.onReplaceFile).toHaveBeenCalledWith(documentFixture);
    expect(props.onDelete).toHaveBeenCalledWith(42);
    expect(props.onMove).toHaveBeenCalledWith(documentFixture);
  });

  it("hides mutation actions when the snapshot denies them", async () => {
    const user = userEvent.setup();

    render(<DocumentCard {...createProps({ doc: { ...documentFixture,
      actionCapabilities: { ...documentFixture.actionCapabilities!,
        editMetadata: false, editContent: false, trash: false },
    } })} />);

    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    expect(screen.getByRole("menuitem", { name: "Descargar" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Ver Versiones" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Mover a carpeta" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Editar Info" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Reemplazar Archivo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Eliminar" })).not.toBeInTheDocument();
  });
});
