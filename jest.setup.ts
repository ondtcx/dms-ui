import '@testing-library/jest-dom'

// Radix UI components (e.g. Checkbox) measure elements with ResizeObserver,
// which jsdom does not implement.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  return new Proxy({}, {
    get: function(target, prop) {
      return () => null
    }
  })
})
