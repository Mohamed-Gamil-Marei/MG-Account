import crypto from 'crypto';
import { decodePayloadWithChecksum, encodePayloadWithChecksum } from './designerBase32';
import { decryptPrivateKey } from './designerKeyService';
import { DesignerCustomerDb, DesignerCustomer } from './designerCustomerDb';

export interface LicenseRequestPayload {
  v: string;
  fp: string;
  appVersion: string;
  ts: string;
  nonce: string;
}

export interface IncidentCodePayload {
  fp: string;
  reason: string;
  ts: string;
  nonce: string;
}

export interface SignedActivationPayload {
  serial: string;
  fingerprint: string;
  customerName: string;
  maxUsers: number;
  issuedAt: string;
}

export interface SignedUnlockPayload {
  fingerprint: string;
  reason: string;
  nonce: string;
  issuedAt: string;
}

// Format a long base64/hex string into chunked groups of 5 uppercase characters (e.g. AAAAA-BBBBB-CCCCC)
export function formatInChunkedGroups(str: string, chunkSize: number = 5): string {
  const clean = str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const chunks: string[] = [];
  for (let i = 0; i < clean.length; i += chunkSize) {
    chunks.push(clean.substring(i, i + chunkSize));
  }
  return chunks.join('-');
}

// Item 3: Parse and validate Request Code
export function parseLicenseRequestCode(requestCodeStr: string): { valid: boolean; payload?: LicenseRequestPayload; error?: string } {
  if (!requestCodeStr || !requestCodeStr.trim()) {
    return { valid: false, error: 'كود الطلب فارغ.' };
  }
  const decoded = decodePayloadWithChecksum<LicenseRequestPayload>(requestCodeStr.trim());
  return { valid: decoded.valid, payload: decoded.data, error: decoded.error };
}

// Item 3: Issue Ed25519 Signed Activation Code
export async function issueActivationCode(params: {
  requestCodeStr: string;
  customer: DesignerCustomer;
  keyStorePath: string;
  keyPassword: string;
  customerDb: DesignerCustomerDb;
  notes?: string;
}): Promise<{
  activationCodeGrouped: string;
  licFileContent: string;
  rawPayload: SignedActivationPayload;
  signatureB64: string;
}> {
  const parsed = parseLicenseRequestCode(params.requestCodeStr);
  if (!parsed.valid || !parsed.payload) {
    throw new Error(parsed.error || 'كود الطلب غير صالح.');
  }

  const { fp } = parsed.payload;

  // Decrypt private key using password
  const privateKeyPem = await decryptPrivateKey(params.keyPassword, params.keyStorePath);

  const issuedAt = new Date().toISOString();
  const activationPayload: SignedActivationPayload = {
    serial: params.customer.serial,
    fingerprint: fp,
    customerName: params.customer.name,
    maxUsers: params.customer.maxUsers || 1,
    issuedAt,
  };

  const payloadB64 = Buffer.from(JSON.stringify(activationPayload), 'utf8').toString('base64');
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const signature = crypto.sign(null, Buffer.from(payloadB64, 'utf8'), privateKey);
  const signatureB64 = signature.toString('base64');

  const fullActivationToken = `${payloadB64}.${signatureB64}`;
  const activationCodeGrouped = formatInChunkedGroups(fullActivationToken, 5);

  const licFileContent = JSON.stringify(
    {
      format: 'MG_ACCOUNT_LICENSE_V1',
      token: fullActivationToken,
      payload: activationPayload,
      signature: signatureB64,
    },
    null,
    2
  );

  // Record in customer DB
  params.customerDb.recordActivation({
    customerId: params.customer.id,
    fingerprint: fp,
    requestCode: params.requestCodeStr,
    activationCode: fullActivationToken,
    maxUsers: params.customer.maxUsers,
    issuedAt,
    notes: params.notes,
  });

  return {
    activationCodeGrouped,
    licFileContent,
    rawPayload: activationPayload,
    signatureB64,
  };
}

// Item 4: Parse Incident Code
export function parseIncidentCode(incidentCodeStr: string): { valid: boolean; payload?: IncidentCodePayload; error?: string } {
  if (!incidentCodeStr || !incidentCodeStr.trim()) {
    return { valid: false, error: 'كود الحادثة فارغ.' };
  }
  const decoded = decodePayloadWithChecksum<IncidentCodePayload>(incidentCodeStr.trim());
  return { valid: decoded.valid, payload: decoded.data, error: decoded.error };
}

// Item 4: Issue One-Time Signed Unlock Code
export async function issueUnlockCode(params: {
  incidentCodeStr: string;
  keyStorePath: string;
  keyPassword: string;
  customerDb: DesignerCustomerDb;
  customer?: DesignerCustomer;
}): Promise<{
  unlockCodeGrouped: string;
  rawPayload: SignedUnlockPayload;
  signatureB64: string;
}> {
  const parsed = parseIncidentCode(params.incidentCodeStr);
  if (!parsed.valid || !parsed.payload) {
    throw new Error(parsed.error || 'كود الحادثة غير صالح.');
  }

  const { fp, reason, nonce } = parsed.payload;

  // Check one-time use enforcement via database
  const existingIncident = params.customerDb.getIncidentByNonce(nonce);
  if (existingIncident && existingIncident.usedCount > 0) {
    throw new Error(`كود الفك لهذه الحادثة (Nonce: ${nonce}) قد تم إصداره واستخدامه مسبقاً! يُمنع إعادة استخدام كود الفك أكثر من مرة واحدة.`);
  }

  // Decrypt private key using password
  const privateKeyPem = await decryptPrivateKey(params.keyPassword, params.keyStorePath);

  const issuedAt = new Date().toISOString();
  const unlockPayload: SignedUnlockPayload = {
    fingerprint: fp,
    reason,
    nonce,
    issuedAt,
  };

  const payloadB64 = Buffer.from(JSON.stringify(unlockPayload), 'utf8').toString('base64');
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const signature = crypto.sign(null, Buffer.from(payloadB64, 'utf8'), privateKey);
  const signatureB64 = signature.toString('base64');

  const fullUnlockToken = `${payloadB64}.${signatureB64}`;
  const unlockCodeGrouped = formatInChunkedGroups(fullUnlockToken, 5);

  // Record incident and mark used
  params.customerDb.recordIncident({
    customerId: params.customer ? params.customer.id : undefined,
    fingerprint: fp,
    reason,
    incidentCode: params.incidentCodeStr,
    unlockCode: fullUnlockToken,
    nonce,
    issuedAt,
  });

  params.customerDb.incrementIncidentUsedCount(nonce);

  return {
    unlockCodeGrouped,
    rawPayload: unlockPayload,
    signatureB64,
  };
}

// Verify Ed25519 signature with Public Key
export function verifyEd25519Signature(token: string, publicKeyPem: string): boolean {
  try {
    const [payloadB64, sigB64] = token.split('.');
    if (!payloadB64 || !sigB64) return false;

    const signature = Buffer.from(sigB64, 'base64');
    const publicKey = crypto.createPublicKey(publicKeyPem);
    return crypto.verify(null, Buffer.from(payloadB64, 'utf8'), publicKey, signature);
  } catch {
    return false;
  }
}
