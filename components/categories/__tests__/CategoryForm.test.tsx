import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryForm } from '../CategoryForm';
import { useRoles } from '@/hooks/useRoles';
import { useQuery } from '@tanstack/react-query';

// Mock dependencies
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('@/hooks/useRoles', () => ({
  useRoles: jest.fn(),
}));

// Mock utils
jest.mock('@/lib/utils/document-numbering', () => ({
  derivePrefix: jest.fn().mockReturnValue('TEST'),
}));

// Mock UI constants
jest.mock('@/lib/constants/ui', () => ({
  UI_COLORS: [{ label: 'Blue', value: '#3b82f6' }],
  CATEGORY_ICONS: [{ label: 'Folder', value: 'Folder' }],
}));

describe('CategoryForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useQuery as jest.Mock).mockReturnValue({
      data: { data: [{ id: 1, name: 'Section 1', color: '#000', icon: 'Icon' }] },
    });

    (useRoles as jest.Mock).mockReturnValue({
      data: [
        { id: 'role-1', name: 'Admin' },
        { id: 'role-2', name: 'User' },
      ],
      isLoading: false,
    });
  });

  it('renders form and dynamic roles', () => {
    render(
      <CategoryForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isPending={false}
      />
    );

    expect(screen.getByLabelText(/Nombre \*/i)).toBeInTheDocument();
    
    // Roles permitidos should be rendered dynamically
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
  });

  it('submits form with selected role IDs', async () => {
    const user = userEvent.setup();
    render(
      <CategoryForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isPending={false}
      />
    );

    // Type name
    await user.type(screen.getByLabelText(/Nombre \*/i), 'New Category');

    // Click on Admin role
    await user.click(screen.getByText('Admin'));

    // Submit
    await user.click(screen.getByRole('button', { name: /Crear Categoría/i }));

    expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Category',
      roleIds: ['role-1'],
    }));
  });
});
