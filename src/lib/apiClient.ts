import { firebaseAuth } from '../services/firebaseAuthService';

/**
 * Fetch wrapper that automatically injects the Firebase Auth ID Token in the Authorization header
 */
export async function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = await firebaseAuth.getIdToken();
  const headers = new Headers(init?.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
