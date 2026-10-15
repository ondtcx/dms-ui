import { render, screen } from '@testing-library/react';
import { DocumentSharingAction } from '../DocumentSharingAction';
import type { Document } from '@/lib/types';

const document = { id: 12, actionCapabilities: { scope: 'ordinary', editMetadata: true, editContent: true, move: true, trash: true, restore: false, permanentDelete: false, manageSharing: true } } as unknown as Document;

it('renders a closed sharing action without mounting authenticated dialog dependencies', () => {
  render(<DocumentSharingAction document={document} />);
  expect(screen.getByRole('button', { name: 'Compartir' })).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('hides sharing when the backend capability is absent or denied', () => {
  const { rerender, container } = render(<DocumentSharingAction document={{ id: 12 } as Document} />);
  expect(container).toBeEmptyDOMElement();
  rerender(<DocumentSharingAction document={{ ...document, actionCapabilities: { ...document.actionCapabilities!, manageSharing: false } }} />);
  expect(container).toBeEmptyDOMElement();
});

it('never offers ordinary sharing on a reception document', () => {
  const { container } = render(<DocumentSharingAction document={{ ...document, actionCapabilities: { ...document.actionCapabilities!, scope: 'reception' } }} />);
  expect(container).toBeEmptyDOMElement();
});
