export interface DesktopAdminCredentials {
  name: string;
  email: string;
  password: string;
  isReset?: boolean;
}

let credentialsPromise: Promise<DesktopAdminCredentials | null> | null = null;
let cachedCredentials: DesktopAdminCredentials | null = null;
let hasBeenConsumed = false;

const CONSUMED_SESSION_KEY = 'mg_desktop_admin_creds_consumed_v1';

function checkSessionConsumed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage?.getItem(CONSUMED_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

function setSessionConsumed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage?.setItem(CONSUMED_SESSION_KEY, 'true');
  } catch {}
}

/**
 * Fetch initial admin credentials once.
 * Protected against React StrictMode double invocation and multiple component mounts.
 * Only calls window.electronDesktop.getInitialAdminCredentials() exactly once.
 */
export async function getDesktopInitialAdminCredentials(): Promise<DesktopAdminCredentials | null> {
  if (hasBeenConsumed || checkSessionConsumed()) {
    hasBeenConsumed = true;
    return null;
  }

  if (cachedCredentials) {
    return cachedCredentials;
  }

  if (!credentialsPromise) {
    if (typeof window !== 'undefined' && window.electronDesktop?.getInitialAdminCredentials) {
      credentialsPromise = window.electronDesktop.getInitialAdminCredentials()
        .then((creds) => {
          if (creds && creds.password) {
            cachedCredentials = creds;
            return creds;
          }
          return null;
        })
        .catch((err) => {
          console.warn('Failed to retrieve initial admin credentials:', err);
          return null;
        });
    } else {
      credentialsPromise = Promise.resolve(null);
    }
  }

  return credentialsPromise;
}

/**
 * Marks initial admin credentials as consumed after user clicks Proceed/Dismiss.
 * Ensures the modal will never be displayed again.
 */
export function consumeDesktopInitialAdminCredentials(): void {
  hasBeenConsumed = true;
  cachedCredentials = null;
  credentialsPromise = Promise.resolve(null);
  setSessionConsumed();
}

export function isDesktopInitialAdminConsumed(): boolean {
  return hasBeenConsumed || checkSessionConsumed();
}

/**
 * Reset state for testing purposes only.
 */
export function _resetDesktopAdminCredentialsStateForTesting(): void {
  credentialsPromise = null;
  cachedCredentials = null;
  hasBeenConsumed = false;
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage?.removeItem(CONSUMED_SESSION_KEY);
    } catch {}
  }
}
