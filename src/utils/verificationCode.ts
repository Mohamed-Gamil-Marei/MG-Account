import { getCairoCurrentYear } from './cairoTime';

export function generateVerificationCode(prefix = 'MG'): string {
  const year = getCairoCurrentYear();
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${year}-${randomPart}`;
}
