const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const keysDir = path.join(__dirname, '../keys');
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

fs.writeFileSync(path.join(keysDir, 'private.pem'), privateKey);
fs.writeFileSync(path.join(keysDir, 'public.pem'), publicKey);

console.log('Generated Ed25519 keypair in keys/');

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
