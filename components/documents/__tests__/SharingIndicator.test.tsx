import { render, screen } from '@testing-library/react';
import { SharingIndicator } from '../SharingIndicator';

it('shows owner outgoing sharing without incoming provenance or recipient names', () => {
  render(<SharingIndicator summary={{ shared: true, direct: true, inherited: false, public: false }} />);
  expect(screen.getByRole('note', { name: 'Compartido con otras personas' })).toHaveTextContent('Compartido');
});

it('identifies the actual sharer and inherited folder accessibly', () => {
  render(<SharingIndicator provenance={[{ grantedBy: { name: 'Ana' }, inherited: true, sourceDirectory: { id: 7, name: 'Académico' } }]} />);
  const indicator = screen.getByRole('note', { name: 'Compartido por Ana · Heredado de Académico' });
  expect(indicator).toHaveAttribute('title', 'Compartido por Ana · Heredado de Académico');
  expect(indicator).toHaveTextContent('Heredado');
  expect(indicator).toHaveAttribute('tabindex', '0');
});

it('describes authenticated inherited public access as read-only', () => {
  render(<SharingIndicator summary={{ shared: true, direct: false, inherited: true, public: true }} provenance={[{ public: true, inherited: true, sourceDirectory: { id: 7, name: 'Pública' } }]} />);
  expect(screen.getByRole('note')).toHaveAccessibleName('Acceso público para usuarios autenticados (solo lectura) · Heredado de Pública');
});

it('does not show ordinary sharing for reception or an unshared resource', () => {
  const { container, rerender } = render(<SharingIndicator />);
  expect(container).toBeEmptyDOMElement();
  rerender(<SharingIndicator reception summary={{ shared: true, direct: true, inherited: false, public: false }} />);
  expect(container).toBeEmptyDOMElement();
});
