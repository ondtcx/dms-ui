import { fireEvent, render, screen } from "@testing-library/react";
import { DocumentListItem } from "../DocumentListItem";
import userEvent from '@testing-library/user-event';

describe("DocumentListItem logical identity", () => {
  it('shows inherited sharing and denies deletion by a non-owner independently of stale props', async () => {
    render(<DocumentListItem doc={{ id: 1, uploadedById: 'owner', uploadedBy: { name: 'Ana' }, createdAt: '2026-01-01',
      sharingProvenance: [{ grantedBy: { name: 'Delegada' }, inherited: true, sourceDirectory: { id: 7, name: 'Académico' } }],
      actionCapabilities: { scope: 'ordinary', editMetadata: false, editContent: false, move: false, trash: true, restore: false, permanentDelete: true, manageSharing: false },
      versions: [{ filename: 'original.pdf', mimetype: 'application/pdf', size: 1 }] } as any}
      index={0} isSelected={false} thumbnailUrl={undefined} onDownload={jest.fn()} actorId="delegate"
      onToggle={jest.fn()} onPreview={jest.fn()} onShowVersionHistory={jest.fn()} onEdit={jest.fn()}
      onReplaceFile={jest.fn()} onDelete={jest.fn()} onMove={jest.fn()} canDelete isOwn isDeleting={false} />);
    expect(screen.getByRole('note', { name: 'Compartido por Delegada · Heredado de Académico' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Compartir' })).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button').at(-1)!);
    expect(screen.queryByRole('menuitem', { name: 'Eliminar' })).not.toBeInTheDocument();
  });
  it.each(["Consejo", null, "  "])("uses nonblank logical name %j but downloads the original filename", (name) => {
    const onDownload = jest.fn();
    render(<DocumentListItem doc={{ id: 1, name, uploadedBy: { name: "Ana" }, createdAt: "2026-01-01",
      versions: [{ filename: "original.pdf", mimetype: "application/pdf", size: 1 }] } as any}
      index={0} isSelected={false} thumbnailUrl={undefined} onDownload={onDownload}
      onToggle={jest.fn()} onPreview={jest.fn()} onShowVersionHistory={jest.fn()}
      onEdit={jest.fn()} onReplaceFile={jest.fn()} onDelete={jest.fn()} onMove={jest.fn()}
      canDelete={false} isOwn isDeleting={false} />);
    expect(screen.getByRole("link", { name: name?.trim() || "original.pdf" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Descargar" }));
    expect(onDownload).toHaveBeenCalledWith(1, "original.pdf");
  });
});
