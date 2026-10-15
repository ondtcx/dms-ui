import { fireEvent, render, screen } from '@testing-library/react';
import type { Directory } from '@/lib/types';
import { DirectorySharingAction } from '../DirectorySharingAction';

jest.mock('../SharingDialog', () => ({ SharingDialog: ({ directoryId }: { directoryId: number }) => <div role="dialog">Carpeta {directoryId}</div> }));
const directory: Directory = { id: 7, name: 'Académico', parentId: null, createdById: 'other', createdAt: '', updatedAt: '',
  capabilities: { owner: false, canView: true, canEdit: false, canUploadVersion: false, canShare: true } };

it('lets a delegated sharer open the folder adapter without requiring ownership', () => {
  render(<DirectorySharingAction directory={directory} />);
  fireEvent.click(screen.getByRole('button', { name: 'Compartir carpeta Académico' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('Carpeta 7');
});

it.each([
  { ...directory, capabilities: undefined },
  { ...directory, capabilities: { ...directory.capabilities!, canShare: false } },
  { ...directory, navigationOnly: true },
  { ...directory, receptionEnabled: true },
])('does not offer sharing without ordinary effective authority %#', resource => {
  const { container } = render(<DirectorySharingAction directory={resource} />);
  expect(container).toBeEmptyDOMElement();
});
