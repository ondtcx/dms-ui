import { render, screen } from '@testing-library/react'
import { PermissionGuard } from '@/guards/PermissionGuard'
import { useAuth } from '@/lib/contexts/AuthContext'

jest.mock('@/lib/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}))

describe('PermissionGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders children when user has at least one required permission', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { permissions: ['document:read', 'document:create'] },
    })

    render(
      <PermissionGuard permissions={['document:read']}>
        <div>Protected Content</div>
      </PermissionGuard>,
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('renders fallback when user lacks required permissions', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { permissions: ['document:read'] },
    })

    render(
      <PermissionGuard permissions={['document:create']} fallback={<div>No Access</div>}>
        <div>Protected Content</div>
      </PermissionGuard>,
    )

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    expect(screen.getByText('No Access')).toBeInTheDocument()
  })

  it('requires all permissions when requireAll is true', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { permissions: ['document:read'] },
    })

    render(
      <PermissionGuard
        permissions={['document:read', 'document:create']}
        requireAll
        fallback={<div>No Access</div>}
      >
        <div>Protected Content</div>
      </PermissionGuard>,
    )

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    expect(screen.getByText('No Access')).toBeInTheDocument()
  })
})
