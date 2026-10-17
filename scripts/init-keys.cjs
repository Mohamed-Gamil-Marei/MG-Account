const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const keysDir = path.join(__dirname, '../keys');
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

const privateKeyPath = path.join(keysDir, 'private.pem');
const publicKeyPath = path.join(keysDir, 'public.pem');

const isNew = process.argv.includes('--new');
let publicKey = '';
let privateKey = '';

// Reuse existing keys if present, unless explicitly requested via --new
if (!isNew && fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
  publicKey = fs.readFileSync(publicKeyPath, 'utf8');
  console.log('Reusing existing Ed25519 keypair from keys/');
} else {
  const generated = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  publicKey = generated.publicKey;
  privateKey = generated.privateKey;
  fs.writeFileSync(privateKeyPath, privateKey);
  fs.writeFileSync(publicKeyPath, publicKey);
  console.log(isNew ? 'Generated NEW Ed25519 keypair (--new flag specified).' : 'Generated Ed25519 keypair in keys/');
}

// Update ED25519_PUBLIC_KEY in server.ts with the public key
const serverPath = path.join(__dirname, '../server.ts');
let serverContent = fs.readFileSync(serverPath, 'utf8');

const keyMatch = serverContent.match(/const ED25519_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----\n[\s\S]*?\n-----END PUBLIC KEY-----`;/);
if (keyMatch) {
  serverContent = serverContent.replace(
    keyMatch[0],
    `const ED25519_PUBLIC_KEY = \`${publicKey.trim()}\`;`
  );
  fs.writeFileSync(serverPath, serverContent, 'utf8');
  console.log('Updated ED25519_PUBLIC_KEY in server.ts');
} else {
  console.error('ED25519_PUBLIC_KEY match not found in server.ts');
}
