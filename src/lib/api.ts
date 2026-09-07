import { auth } from './firebase';

/**
 * Enhanced fetch wrapper that automatically attaches the user's Firebase Auth ID token
 * as a Bearer token in the Authorization header to protect backend AI routes.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers || {});

  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const token = await currentUser.getIdToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }
  } catch (err) {
    console.warn('Failed to retrieve Firebase ID token for request:', err);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
