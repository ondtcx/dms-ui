import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkflowTemplateDialog from '../WorkflowTemplateDialog';
import { useRoles } from '@/hooks/useRoles';
import { type WorkflowTemplate } from '@/lib/types';

// Mocks for Radix UI Dialog in JSDOM
if (typeof window.PointerEvent === 'undefined') {
  class PointerEvent extends Event {}
  window.PointerEvent = PointerEvent as any;
}
window.HTMLElement.prototype.hasPointerCapture = jest.fn();
window.HTMLElement.prototype.releasePointerCapture = jest.fn();
window.HTMLElement.prototype.scrollIntoView = jest.fn();
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

jest.mock('@/hooks/useRoles', () => ({
  useRoles: jest.fn(),
}));

describe('WorkflowTemplateDialog', () => {
  const mockOnSubmit = jest.fn();
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useRoles as jest.Mock).mockReturnValue({
      data: [
        { id: 'role-uuid-1', name: 'Admin' },
        { id: 'role-uuid-2', name: 'Manager' },
      ],
      isLoading: false,
    });
  });

  it('renders dynamic initiator roles checkboxes', () => {
    render(
      <WorkflowTemplateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        template={null}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
        categories={[]}
        sections={[]}
      />
    );

    expect(screen.getByLabelText('Admin')).toBeInTheDocument();
    expect(screen.getByLabelText('Manager')).toBeInTheDocument();
  });

  it('allows selecting dynamic initiator roles', async () => {
    const user = userEvent.setup();

    const template: WorkflowTemplate = {
      id: 1,
      name: 'Workflow Base',
      description: null,
      categoryId: null,
      stateDefinitions: [{ state: 'Revisión', roleId: 'role-uuid-1', order: 0 }],
      autoAssign: true,
      requiresComment: false,
      initiatorRoleIds: ['role-uuid-1'],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    render(
      <WorkflowTemplateDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        template={template}
        onSubmit={mockOnSubmit}
        isSubmitting={false}
        categories={[]}
        sections={[]}
      />
    );

    const managerCheckbox = screen.getByLabelText('Manager');

    expect(managerCheckbox).not.toBeChecked();
    await user.click(managerCheckbox);
    expect(managerCheckbox).toBeChecked();
  });
});
