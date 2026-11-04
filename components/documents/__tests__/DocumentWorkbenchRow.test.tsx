import { render, screen } from "@testing-library/react";
import { DocumentWorkbenchRow } from "../DocumentWorkbenchRow";
import type { Document } from "@/lib/types";

const documentFixture = {
  id: 42,
  name: "Acta de consejo",
  documentNumber: "DOC-2026-0042",
  currentVersion: 2,
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
  uploadedById: "user-1",
  uploadedBy: { id: "user-1", name: "Ana Torres", email: "ana@example.com" },
  versions: [
    {
      id: 100,
      documentId: 42,
      version: 2,
      filename: "acta.pdf",
      mimetype: "application/pdf",
      size: 2048,
      createdAt: "2026-11-01T10:00:00.000Z",
    },
  ],
  authoring: { status: "EMITTED" },
  documentType: { id: 3, name: "Acta" },
  workflow: null,
} as unknown as Document;

function renderRow(overrides: Partial<Document> = {}) {
  return render(
    <table>
      <tbody>
        <DocumentWorkbenchRow
      doc={{ ...documentFixture, ...overrides }}
      isSelected={false}
      onToggle={jest.fn()}
      thumbnailUrl={undefined}
      onPreview={jest.fn()}
      onDownload={jest.fn()}
      onShowVersionHistory={jest.fn()}
      onEdit={jest.fn()}
      onReplaceFile={jest.fn()}
      onDelete={jest.fn()}
      onMove={jest.fn()}
      isDeleting={false}
          actorId="user-1"
        />
      </tbody>
    </table>,
  );
}

describe("DocumentWorkbenchRow", () => {
  it("shows the institutional number, document type and authoring status", () => {
    renderRow();

    expect(screen.getAllByText("DOC-2026-0042").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Acta").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Emitido").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: "Acta de consejo" }),
    ).toHaveAttribute("href", "/dashboard/documents/42");
  });

  it("falls back to the workflow status when authoring is absent", () => {
    renderRow({
      authoring: null,
      workflow: { id: 1, status: "APPROVED", currentState: null },
    } as Partial<Document>);

    expect(screen.getAllByText("Aprobado").length).toBeGreaterThan(0);
  });

  it("shows the uploaded review status when there is no authoring or workflow", () => {
    renderRow({
      authoring: null,
      workflow: null,
      review: {
        id: 1,
        documentId: 42,
        status: "IN_REVIEW",
        createdAt: "2026-10-01T10:00:00.000Z",
        updatedAt: "2026-10-02T10:00:00.000Z",
      },
    } as unknown as Partial<Document>);

    expect(screen.getAllByText("En revisión").length).toBeGreaterThan(0);
  });
});
