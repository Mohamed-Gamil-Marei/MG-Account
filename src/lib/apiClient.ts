import { firebaseAuth } from '../services/firebaseAuthService';
import { db } from '../db/localDatabase';

/**
 * Fetch wrapper that automatically injects the Firebase Auth ID Token in the Authorization header
 * and enforces Gemini AI client privacy controls (blocking data transmission and returning 'الميزة معطلة' when disabled),
 * as well as clear offline messaging for external network services (Gemini, ETA, WhatsApp, Firebase).
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

  const isOnlineFeature =
    urlStr.includes('/api/ai/') ||
    urlStr.includes('/api/ocr') ||
    urlStr.includes('/api/eta/') ||
    urlStr.includes('/api/whatsapp/') ||
    urlStr.includes('/api/firebase');

  if (isOnlineFeature && typeof navigator !== 'undefined' && navigator.onLine === false) {
    let featureName = 'هذه الميزة';
    if (urlStr.includes('/api/ai/') || urlStr.includes('/api/ocr')) featureName = 'خدمة الذكاء الاصطناعي (Gemini)';
    if (urlStr.includes('/api/eta/')) featureName = 'منظومة الفاتورة الإلكترونية (ETA)';
    if (urlStr.includes('/api/whatsapp/')) featureName = 'خدمة ربط واتساب';
    if (urlStr.includes('/api/firebase')) featureName = 'المزامنة السحابية (Firebase)';

    return new Response(
      JSON.stringify({
        success: false,
        error: `أنت في وضع عدم الاتصال (Offline). تتطلب ${featureName} اتصالاً فعالاً بشبكة الإنترنت.`,
        isOffline: true,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    return await fetch(input, {
      ...init,
      headers,
    });
  } catch (err: any) {
    if (isOnlineFeature) {
      let featureName = 'هذه الميزة';
      if (urlStr.includes('/api/ai/') || urlStr.includes('/api/ocr')) featureName = 'خدمة الذكاء الاصطناعي (Gemini)';
      if (urlStr.includes('/api/eta/')) featureName = 'منظومة الفاتورة الإلكترونية (ETA)';
      if (urlStr.includes('/api/whatsapp/')) featureName = 'خدمة ربط واتساب';

      return new Response(
        JSON.stringify({
          success: false,
          error: `تعذر الاتصال بالخدمة السحابية. تتطلب ${featureName} اتصالاً فعالاً بالإنترنت.`,
          isOffline: true,
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    throw err;
  }
}
