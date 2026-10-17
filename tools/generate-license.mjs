import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const keysDir = path.join(process.cwd(), 'keys');
const privateKeyPath = path.join(keysDir, 'private.pem');
const publicKeyPath = path.join(keysDir, 'public.pem');

const args = process.argv.slice(2);
const command = args[0];

if (command === '--init') {
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }

  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  fs.writeFileSync(privateKeyPath, privateKey);
  fs.writeFileSync(publicKeyPath, publicKey);

  console.log('======================================================');
  console.log('🎉 تم توليد زوج مفاتيح Ed25519 بنجاح!');
  console.log('------------------------------------------------------');
  console.log(`🔑 المفتاح الخاص محفوظ في: ${privateKeyPath}`);
  console.log(`⚠️ هام جداً: احتفظ بالمفتاح الخاص في مكان سري وخارج نظام التخزين العام (مستبعد بـ .gitignore).`);
  console.log('------------------------------------------------------');
  console.log('📌 انسخ المفتاح العام التالي وضعه في ملف الخادم (server.ts):');
  console.log(publicKey);
  console.log('======================================================');
  process.exit(0);
}

if (command === '--issue') {
  if (!fs.existsSync(privateKeyPath)) {
    console.error('❌ خطأ: المفتاح الخاص غير موجود. يرجى تشغيل الأمر الأول: node tools/generate-license.mjs --init');
    process.exit(1);
  }

  // Parse arguments: --office="اسم المكتب" --plan=OFFICE --days=365 --maxUsers=10
  const getArg = (name) => {
    const found = args.find((a) => a.startsWith(`--${name}=`));
    return found ? found.split('=')[1] : null;
  };

  const parseBooleanArg = (name, defaultVal) => {
    const val = getArg(name);
    if (val !== null) {
      if (val === 'true' || val === '1') return true;
      if (val === 'false' || val === '0') return false;
    }
    if (args.includes(`--no-${name}`)) return false;
    if (args.includes(`--${name}`)) return true;
    return defaultVal;
  };

  const officeName = getArg('office') || 'المكتب المهني للمحاسبة والمراجعة';
  const plan = getArg('plan') || 'OFFICE'; // TRIAL | OFFICE | ONLINE
  const days = parseInt(getArg('days') || '365', 10);
  const maxUsers = parseInt(getArg('maxUsers') || '10', 10);
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const licenseId = `LIC-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

  // Mode and Features:
  // Default for OFFLINE: all features false. Default for ONLINE: all features true.
  const rawMode = (getArg('mode') || (plan.toUpperCase() === 'ONLINE' ? 'ONLINE' : 'OFFLINE')).toUpperCase();
  const mode = rawMode === 'ONLINE' ? 'ONLINE' : 'OFFLINE';
  const isOnline = mode === 'ONLINE';

  const features = {
    cloudSync: parseBooleanArg('cloudSync', isOnline),
    ai: parseBooleanArg('ai', isOnline),
    whatsapp: parseBooleanArg('whatsapp', isOnline),
    eta: parseBooleanArg('eta', isOnline),
  };

  const payloadObj = {
    licenseId,
    officeName,
    plan,
    issuedAt,
    expiresAt,
    maxUsers,
    mode,
    features,
  };

  const payloadStr = JSON.stringify(payloadObj);
  const payloadB64 = Buffer.from(payloadStr, 'utf8').toString('base64');

  const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
  const signature = crypto.sign(null, Buffer.from(payloadB64, 'utf8'), crypto.createPrivateKey(privateKeyPem));
  const sigB64 = signature.toString('base64');

  const licenseCode = `${payloadB64}.${sigB64}`;

  console.log('======================================================');
  console.log('✅ تم إصدار وتوقيع ترخيص المنظومة بنجاح!');
  console.log('======================================================');
  console.log(JSON.stringify(payloadObj, null, 2));
  console.log('------------------------------------------------------');
  console.log('📋 كود الترخيص القابل للصق (أعط هذا الكود للعميل):');
  console.log('------------------------------------------------------');
  console.log(licenseCode);
  console.log('======================================================');
  process.exit(0);
}

console.log('الاستخدام:');
console.log('  node tools/generate-license.mjs --init');
console.log('  node tools/generate-license.mjs --issue --office="مكتب المحاسبة" --plan=OFFICE --days=365 --maxUsers=15 --mode=OFFLINE');
console.log('  node tools/generate-license.mjs --issue --office="مكتب المحاسبة" --plan=ONLINE --days=365 --maxUsers=15 --mode=ONLINE --cloudSync --ai --whatsapp --eta');
process.exit(1);
