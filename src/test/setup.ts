import '@testing-library/jest-dom';
import { vi } from 'vitest';

process.env.PASSWORD_PURGE_MASTER = '1234567890123456';
process.env.SETUP_TOKEN = 'test_setup_token_123456';
process.env.ETA_CLIENT_SECRET = 'test_eta_secret_123456';
process.env.PIN_TOKEN_ETA = '12345678';
process.env.CREDENTIALS_KEY = '12345678901234567890123456789012';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
