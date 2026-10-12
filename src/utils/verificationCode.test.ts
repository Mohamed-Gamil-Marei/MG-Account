import { describe, it, expect } from 'vitest';
import { generateVerificationCode, isValidGoogleDriveUrl } from './verificationCode';

describe('Verification Code & Google Drive URL Validation', () => {
  it('generates a random verification code with length >= 16 and ensures uniqueness', () => {
    const code1 = generateVerificationCode();
    const code2 = generateVerificationCode();
    const customLenCode = generateVerificationCode(20);

    expect(code1.length).toBeGreaterThanOrEqual(16);
    expect(code2.length).toBeGreaterThanOrEqual(16);
    expect(customLenCode.length).toBe(20);
    expect(code1).not.toBe(code2);

    // Verify minimum length enforcement even if smaller length passed
    const shortCode = generateVerificationCode(8);
    expect(shortCode.length).toBeGreaterThanOrEqual(16);

    // Set of multiple generated codes to test uniqueness
    const codeSet = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codeSet.add(generateVerificationCode());
    }
    expect(codeSet.size).toBe(100);
  });

  it('validates Google Drive and Google Docs URLs strictly', () => {
    expect(isValidGoogleDriveUrl('https://drive.google.com/file/d/12345/view')).toBe(true);
    expect(isValidGoogleDriveUrl('https://docs.google.com/document/d/12345/edit')).toBe(true);
    expect(isValidGoogleDriveUrl('https://docs.google.com/spreadsheets/d/12345/edit')).toBe(true);
    expect(isValidGoogleDriveUrl('  https://drive.google.com/drive/folders/xyz  ')).toBe(true);

    // Invalid URLs
    expect(isValidGoogleDriveUrl('http://drive.google.com/file')).toBe(false); // not https
    expect(isValidGoogleDriveUrl('https://dropbox.com/s/12345')).toBe(false);
    expect(isValidGoogleDriveUrl('https://evil-drive.google.com/')).toBe(false);
    expect(isValidGoogleDriveUrl('drive.google.com/file')).toBe(false);
    expect(isValidGoogleDriveUrl('')).toBe(false);
    expect(isValidGoogleDriveUrl(null)).toBe(false);
    expect(isValidGoogleDriveUrl(undefined)).toBe(false);
  });
});
