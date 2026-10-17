import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

// 1. Update verifyAndParseLicense to parse mode and features
const oldVerify = `  function verifyAndParseLicense(licenseCode: string): { valid: boolean; payload?: any; error?: string } {
    if (!licenseCode || typeof licenseCode !== 'string' || !licenseCode.includes('.')) {
      return { valid: false, error: 'كود الترخيص غير صالح (فارغ أو بتنسيق خاطئ).' };
    }
    const parts = licenseCode.trim().split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'تنسيق كود الترخيص غير صالح.' };
    }
    const [payloadB64, sigB64] = parts;
    try {
      const payloadJson = Buffer.from(payloadB64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson);
      const sigBuf = Buffer.from(sigB64, 'base64');
      const isVerified = crypto.verify(
        null,
        Buffer.from(payloadB64, 'utf8'),
        crypto.createPublicKey(ED25519_PUBLIC_KEY),
        sigBuf
      );
      if (!isVerified) {
        return { valid: false, error: 'توقيع الترخيص غير مصرح به أو تم التلاعب به.' };
      }
      return { valid: true, payload };
    } catch (err: any) {
      return { valid: false, error: `فشل فك تشفير وتوقيع الترخيص: ${err.message}` };
    }
  }`;

const newVerify = `  function verifyAndParseLicense(licenseCode: string): { valid: boolean; payload?: any; error?: string } {
    if (!licenseCode || typeof licenseCode !== 'string' || !licenseCode.includes('.')) {
      return { valid: false, error: 'كود الترخيص غير صالح (فارغ أو بتنسيق خاطئ).' };
    }
    const parts = licenseCode.trim().split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'تنسيق كود الترخيص غير صالح.' };
    }
    const [payloadB64, sigB64] = parts;
    try {
      const payloadJson = Buffer.from(payloadB64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson);
      const mode = payload.mode === 'ONLINE' ? 'ONLINE' : 'OFFLINE';
      const features = {
        cloudSync: mode === 'ONLINE' ? (payload.features?.cloudSync !== false) : Boolean(payload.features?.cloudSync),
        ai: mode === 'ONLINE' ? (payload.features?.ai !== false) : Boolean(payload.features?.ai),
        whatsapp: mode === 'ONLINE' ? (payload.features?.whatsapp !== false) : Boolean(payload.features?.whatsapp),
        eta: mode === 'ONLINE' ? (payload.features?.eta !== false) : Boolean(payload.features?.eta),
      };
      payload.mode = mode;
      payload.features = features;

      const sigBuf = Buffer.from(sigB64, 'base64');
      const isVerified = crypto.verify(
        null,
        Buffer.from(payloadB64, 'utf8'),
        crypto.createPublicKey(ED25519_PUBLIC_KEY),
        sigBuf
      );
      if (!isVerified) {
        return { valid: false, error: 'توقيع الترخيص غير مصرح به أو تم التلاعب به.' };
      }
      return { valid: true, payload };
    } catch (err: any) {
      return { valid: false, error: `فشل فك تشفير وتوقيع الترخيص: ${err.message}` };
    }
  }`;

if (content.includes(oldVerify)) {
  content = content.replace(oldVerify, newVerify);
  console.log("Updated verifyAndParseLicense successfully");
} else {
  console.log("oldVerify not found exactly");
}

// 2. Add mode and features normalization in getSystemLicenseStatus
content = content.replace(
  "return {\n      status: 'VALID',\n      payload: p,\n      message: 'الترخيص ساري ومفعل بكفاءة كاملة.',\n      daysRemaining,\n      maxUsers: p.maxUsers,\n      currentUsers,\n      requestId: reqId,\n    };",
  "const mode = p.mode === 'ONLINE' ? 'ONLINE' : 'OFFLINE';\n    const features = p.features || { cloudSync: mode === 'ONLINE', ai: mode === 'ONLINE', whatsapp: mode === 'ONLINE', eta: mode === 'ONLINE' };\n    return {\n      status: 'VALID',\n      payload: p,\n      message: 'الترخيص ساري ومفعل بكفاءة كاملة.',\n      daysRemaining,\n      maxUsers: p.maxUsers,\n      currentUsers,\n      requestId: reqId,\n      mode,\n      features,\n    };"
);

// 3. Add getEffectiveLicenseStatus and requireFeature middleware
const licenseMiddlewares = `
  function getEffectiveLicenseStatus(dbInstance: Database.Database) {
    const status = getSystemLicenseStatus(dbInstance);
    if (['VALID', 'EXPIRING', 'GRACE'].includes(status.status) && status.payload) {
      const mode = status.payload.mode === 'ONLINE' ? 'ONLINE' : 'OFFLINE';
      const features = status.payload.features || {
        cloudSync: mode === 'ONLINE',
        ai: mode === 'ONLINE',
        whatsapp: mode === 'ONLINE',
        eta: mode === 'ONLINE',
      };
      return { valid: true, mode, features, status: status.status };
    }
    return { valid: false, mode: 'OFFLINE', features: { cloudSync: false, ai: false, whatsapp: false, eta: false }, status: status.status };
  }

  function requireFeature(featureName: 'cloudSync' | 'ai' | 'whatsapp' | 'eta') {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const lic = getEffectiveLicenseStatus(db);
      if (!lic.valid || lic.mode === 'OFFLINE' || !lic.features[featureName]) {
        if (lic.mode === 'OFFLINE' || !lic.valid) {
          return res.status(403).json({
            success: false,
            featureError: true,
            error: "هذه الميزة تتطلب ترخيص أونلاين",
          });
        }
        return res.status(403).json({
          success: false,
          featureError: true,
          error: "هذه الميزة غير مفعولة في ترخيصك الحالي",
        });
      }
      next();
    };
  }
`;

if (!content.includes("getEffectiveLicenseStatus")) {
  content = content.replace("  // --- Local SQLite Auth Middleware for all /api/* routes ---", licenseMiddlewares + "\n  // --- Local SQLite Auth Middleware for all /api/* routes ---");
  console.log("Added getEffectiveLicenseStatus and requireFeature successfully");
}

// 4. Apply requireFeature to AI, WhatsApp, and ETA submit
content = content.replace(
  'app.use("/api/ai", aiRateLimiter);',
  'app.use("/api/ai", requireFeature(\'ai\'));\n  app.use("/api/ai", aiRateLimiter);'
);
content = content.replace(
  'app.use("/api/ocr", aiRateLimiter);',
  'app.use("/api/ocr", requireFeature(\'ai\'));\n  app.use("/api/ocr", aiRateLimiter);'
);
if (!content.includes('app.use("/api/whatsapp", requireFeature(\'whatsapp\'));')) {
  content = content.replace(
    'app.use("/api/ai", requireFeature(\'ai\'));',
    'app.use("/api/whatsapp", requireFeature(\'whatsapp\'));\n  app.use("/api/ai", requireFeature(\'ai\'));'
  );
}
content = content.replace(
  'app.post("/api/eta/documents/submit", requireAuth, async (req, res) => {',
  'app.post("/api/eta/documents/submit", requireAuth, requireFeature(\'eta\'), async (req, res) => {'
);
content = content.replace(
  'app.post("/api/eta/documents/batch-submit", requireAuth, async (req, res) => {',
  'app.post("/api/eta/documents/batch-submit", requireAuth, requireFeature(\'eta\'), async (req, res) => {'
);

fs.writeFileSync('server.ts', content, 'utf8');
console.log("Server.ts updated successfully");
