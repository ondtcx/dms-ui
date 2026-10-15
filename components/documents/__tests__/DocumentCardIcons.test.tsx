import { render, screen } from "@testing-library/react";
import type { Document } from "@/lib/types";
import { DocumentCard } from "@/components/documents/DocumentCard";

// La configuración global sustituye todos los iconos por null, así que la
// presencia de un icono solo se puede comprobar cargando el módulo real.
jest.unmock("lucide-react");

const document = {
  id: 42,
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
  versions: [
    {
      id: 100,
      filename: "Informe.pdf",
      mimetype: "application/pdf",
      size: 2048,
      pageCount: 3,
    },
  ],
  uploadedBy: { id: "user-1", name: "Ana" },
  uploadedById: "user-1",
} as unknown as Document;

const props = {
  doc: document,
  isSelected: false,
  onToggle: jest.fn(),
  thumbnailUrl: undefined,
  onPreview: jest.fn(),
  onDownload: jest.fn(),
  onShowVersionHistory: jest.fn(),
  onEdit: jest.fn(),
  onReplaceFile: jest.fn(),
  onDelete: jest.fn(),
  canDelete: false,
  isOwn: true,
  isDeleting: false,
  onMove: jest.fn(),
};

describe("document card metadata icons", () => {
  it("draws a calendar icon inside the date row of the current document", () => {
    render(<DocumentCard {...props} />);

    const date = screen.getByText("01 sept 2026");
    const icon = date.parentElement?.querySelector<SVGElement>("svg.lucide-calendar") ?? null;

    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(date.parentElement).toContainElement(icon);
  });

  it("draws a page icon beside the page count and omits it without a count", () => {
    const first = render(<DocumentCard {...props} />);
    const label = screen.getByText("3 páginas");
    expect(label.parentElement?.querySelector("svg.lucide-files")).not.toBeNull();
    first.unmount();

    const { container } = render(
      <DocumentCard
        {...props}
        doc={
          {
            ...document,
            versions: [{ ...document.versions![0], pageCount: null }],
          } as Document
        }
      />,
    );

    expect(screen.queryByText(/página/)).not.toBeInTheDocument();
    expect(container.querySelectorAll("svg.lucide-files")).toHaveLength(0);
  });
});
