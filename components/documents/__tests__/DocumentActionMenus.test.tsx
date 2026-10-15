import { render, screen } from "@testing-library/react";
import { DocumentCard } from "../DocumentCard";
import { DocumentListItem } from "../DocumentListItem";
import type { Document } from "@/lib/types";

jest.mock("@/components/ui/dropdown-menu", () => {
  const Container = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return {
    DropdownMenu: Container, DropdownMenuTrigger: Container,
    DropdownMenuContent: Container, DropdownMenuSeparator: () => <hr />,
    DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) =>
      <button onClick={onClick}>{children}</button>,
  };
});

const flags = {
  scope: "ordinary", editMetadata: false, editContent: false, move: false,
  trash: false, restore: false, permanentDelete: false, manageSharing: false,
};

describe.each([DocumentCard, DocumentListItem])("document action menu %p", (Component) => {
  const renderMenu = (actionCapabilities: unknown, canRequestChanges?: boolean) => render(<Component
    doc={{ id: 1, createdAt: "2026-10-12", versions: [], uploadedBy: { name: "Ana" },
      actionCapabilities, canRequestChanges } as unknown as Document}
    index={0} isSelected={false} isOwn canDelete isDeleting={false}
    thumbnailUrl={undefined} onToggle={jest.fn()} onPreview={jest.fn()}
    onDownload={jest.fn()} onShowVersionHistory={jest.fn()} onEdit={jest.fn()}
    onReplaceFile={jest.fn()} onDelete={jest.fn()} onMove={jest.fn()}
  />);

  it.each([undefined, { ...flags, move: "true" }])("never grants from legacy props %#", (snapshot) => {
    renderMenu(snapshot);
    for (const name of ["Editar Info", "Reemplazar Archivo", "Eliminar", "Mover a carpeta"]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Ver Versiones" })).toBeInTheDocument();
  });

  it.each([
    ["editMetadata", "Editar Info"], ["editContent", "Reemplazar Archivo"],
    ["trash", "Eliminar"], ["move", "Mover a carpeta"],
  ])("separates %s from the other actions", (flag, label) => {
    renderMenu({ ...flags, [flag]: true });
    for (const name of ["Editar Info", "Reemplazar Archivo", "Eliminar", "Mover a carpeta"]) {
      if (name === label) expect(screen.getByRole("button", { name })).toBeInTheDocument();
      else expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });
  it('gates request changes on the server snapshot, not legacy owner or edit props', () => {
    renderMenu({ ...flags, editContent: true });
    expect(screen.queryByRole('button', { name: 'Solicitar cambios' })).not.toBeInTheDocument();
  });
  it('offers the standalone request action to a server-authorized manager', () => {
    renderMenu(flags, true);
    expect(screen.getByRole('button', { name: 'Solicitar cambios' })).toBeInTheDocument();
  });
});
