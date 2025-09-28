import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock environment variables
process.env.NEXT_PUBLIC_LOGTO_ENDPOINT = 'http://localhost:3001';
process.env.NEXT_PUBLIC_LOGTO_APP_ID = 'test-app-id';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.LOGTO_COOKIE_SECRET = 'test-cookie-secret-at-least-32-characters-long';

// Mock fetch globally
global.fetch = jest.fn(); 