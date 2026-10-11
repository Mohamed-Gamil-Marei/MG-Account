import { firebaseAuth } from '../services/firebaseAuthService';
import { db } from '../db/localDatabase';

/**
 * Fetch wrapper that automatically injects the Firebase Auth ID Token in the Authorization header
 * and enforces Gemini AI client privacy controls (blocking data transmission and returning 'الميزة معطلة' when disabled).
 */
export async function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = await firebaseAuth.getIdToken();
  const headers = new Headers(init?.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  const isAiOrAudit = urlStr.includes('/api/ai/') || urlStr.includes('/api/audit/') || urlStr.includes('/api/ocr');

  if (isAiOrAudit) {
    const officeProfile = db.getState().officeProfile;
    const sendAllowed = officeProfile?.sendClientDataToGemini === true;

    headers.set('x-send-client-data', sendAllowed ? 'true' : 'false');

    if (!sendAllowed) {
      // حظر إرسال اسم العميل والأرقام للذكاء الاصطناعي وإرجاع رسالة "الميزة معطلة" فوراً
      return new Response(
        JSON.stringify({
          success: false,
          disabled: true,
          error: 'الميزة معطلة',
          message: 'الميزة معطلة',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
