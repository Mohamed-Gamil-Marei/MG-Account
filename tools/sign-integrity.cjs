const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Scrypt key derivation
function deriveKeyFromPasswordSync(password, salt) {
  return crypto.scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 });
}

function decryptPrivateKeySync(password, keyStorePath) {
  if (!fs.existsSync(keyStorePath)) {
    throw new Error(`ملف المفتاح المشفّر غير موجود في المسار: ${keyStorePath}`);
  }

  const raw = fs.readFileSync(keyStorePath, 'utf8');
  const keyStore = JSON.parse(raw);

  const salt = Buffer.from(keyStore.salt, 'hex');
  const iv = Buffer.from(keyStore.iv, 'hex');
  const authTag = Buffer.from(keyStore.authTag, 'hex');
  const encrypted = Buffer.from(keyStore.encryptedData, 'hex');

  const key = deriveKeyFromPasswordSync(password, salt);

  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    throw new Error('كلمة السر غير صحيحة! تعذر فك تشفير المفتاح الخاص لتوقيع سلامة الملفات.');
  }
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

function computeFileSha256(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function signIntegrity(projectPath, keyStorePath, password) {
  const rootDir = path.resolve(projectPath);
  const distDir = path.join(rootDir, 'dist');
  const electronDir = path.join(rootDir, 'electron');

  const distFiles = getAllFiles(distDir);
  const electronFiles = getAllFiles(electronDir);

  const fileMap = {};

  const processFile = (filePath) => {
    // Ignore integrity.json and integrity.sig themselves
    const fileName = path.basename(filePath);
    if (fileName === 'integrity.json' || fileName === 'integrity.sig') return;

    const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
    fileMap[relPath] = computeFileSha256(filePath);
  };

  distFiles.forEach(processFile);
  electronFiles.forEach(processFile);

  const integrityObj = {
    generatedAt: new Date().toISOString(),
    filesCount: Object.keys(fileMap).length,
    hashes: fileMap,
  };

  const jsonStr = JSON.stringify(integrityObj, null, 2);

  // Decrypt private key and sign
  const privateKeyPem = decryptPrivateKeySync(password, keyStorePath);
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const signature = crypto.sign(null, Buffer.from(jsonStr, 'utf8'), privateKey);
  const signatureB64 = signature.toString('base64');

  // Ensure output directory exists (dist/ or root)
  const outDir = fs.existsSync(distDir) ? distDir : rootDir;
  const jsonPath = path.join(outDir, 'integrity.json');
  const sigPath = path.join(outDir, 'integrity.sig');

  fs.writeFileSync(jsonPath, jsonStr, 'utf8');
  fs.writeFileSync(sigPath, signatureB64, 'utf8');

  console.log(`✅ تم توقيع سلامة ملفات المشروع بنجاح (${Object.keys(fileMap).length} ملف)!`);
  console.log(`📄 ملف السلامة: ${jsonPath}`);
  console.log(`🔏 ملف التوقيع: ${sigPath}`);

  return { jsonPath, sigPath, filesCount: Object.keys(fileMap).length };
}

// CLI Execution
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('الاستخدام: node tools/sign-integrity.cjs <مسار_المشروع> <مسار_المفتاح_المشفر> <كلمة_السر>');
    process.exit(1);
  }

  try {
    const [projectPath, keyStorePath, password] = args;
    signIntegrity(projectPath, keyStorePath, password);
  } catch (err) {
    console.error(`❌ خطأ أثناء توقيع سلامة الملفات: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { signIntegrity };
