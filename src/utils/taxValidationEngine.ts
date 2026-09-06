/**
 * Egyptian Tax Authority (ETA) & Commercial Registration Validation Engine
 * Validates Tax Registration Numbers (9 digits), National IDs (14 digits),
 * and Commercial Registration Numbers according to Egyptian regulations.
 */

export interface ValidationResult {
  isValid: boolean;
  formattedValue: string;
  error?: string;
  type?: 'TAX_REGISTRATION' | 'NATIONAL_ID' | 'COMMERCIAL_REG' | 'VAT_NUMBER';
}

/**
 * Validates Egyptian Tax Registration Number (رقم التسجيل الضريبي)
 * Standard: 9 digits, commonly formatted as XXX-XXX-XXX
 */
export function validateEgyptianTaxNumber(value: string | number | undefined | null): ValidationResult {
  if (!value) {
    return { isValid: false, formattedValue: '', error: 'رقم التسجيل الضريبي مطلوب' };
  }

  const raw = String(value).replace(/[\s\-_/.]/g, '');

  if (!/^\d+$/.test(raw)) {
    return { isValid: false, formattedValue: raw, error: 'رقم التسجيل الضريبي يجب أن يحتوي على أرقام فقط' };
  }

  if (raw.length !== 9) {
    return {
      isValid: false,
      formattedValue: raw,
      error: `رقم التسجيل الضريبي يجب أن يتكون من 9 أرقام بالضبط (الحالي: ${raw.length} أرقام)`,
    };
  }

  // Format as 999-999-999
  const formatted = `${raw.slice(0, 3)}-${raw.slice(3, 6)}-${raw.slice(6, 9)}`;

  return {
    isValid: true,
    formattedValue: formatted,
    type: 'TAX_REGISTRATION',
  };
}

/**
 * Validates Egyptian National ID Number (الرقم القومي المصري)
 * Standard: 14 digits with century, birth date, governorate code, and checksum verification
 */
export function validateEgyptianNationalId(value: string | number | undefined | null): ValidationResult {
  if (!value) {
    return { isValid: false, formattedValue: '', error: 'الرقم القومي مطلوب' };
  }

  const raw = String(value).replace(/[\s\-_/.]/g, '');

  if (!/^\d+$/.test(raw)) {
    return { isValid: false, formattedValue: raw, error: 'الرقم القومي يجب أن يتكون من أرقام فقط' };
  }

  if (raw.length !== 14) {
    return {
      isValid: false,
      formattedValue: raw,
      error: `الرقم القومي يجب أن يتكون من 14 رقماً بالضبط (الحالي: ${raw.length} رقماً)`,
    };
  }

  const centuryDigit = parseInt(raw[0], 10);
  if (centuryDigit !== 2 && centuryDigit !== 3) {
    return {
      isValid: false,
      formattedValue: raw,
      error: 'الرقم القومي غير صالح (الرقم الأول يجب أن يكون 2 للمواليد قبل 2000 أو 3 للمواليد بعد 2000)',
    };
  }

  const year = (centuryDigit === 2 ? 1900 : 2000) + parseInt(raw.slice(1, 3), 10);
  const month = parseInt(raw.slice(3, 5), 10);
  const day = parseInt(raw.slice(5, 7), 10);

  if (month < 1 || month > 12) {
    return { isValid: false, formattedValue: raw, error: 'تاريخ الميلاد في الرقم القومي غير صحيح (الشهر غير صالح)' };
  }

  if (day < 1 || day > 31) {
    return { isValid: false, formattedValue: raw, error: 'تاريخ الميلاد في الرقم القومي غير صحيح (اليوم غير صالح)' };
  }

  const govCode = raw.slice(7, 9);
  const validGovCodes = [
    '01', '02', '03', '04', '11', '12', '13', '14', '15', '16', '17', '18', '19',
    '21', '22', '23', '24', '25', '26', '27', '28', '29', '31', '32', '33', '34', '35', '88'
  ];

  if (!validGovCodes.includes(govCode)) {
    return { isValid: false, formattedValue: raw, error: 'كود المحافظة في الرقم القومي غير صحيح' };
  }

  return {
    isValid: true,
    formattedValue: raw,
    type: 'NATIONAL_ID',
  };
}

/**
 * Validates Egyptian Commercial Registration Number (السجل التجاري)
 * Standard: 3 to 10 digits
 */
export function validateCommercialRegistration(value: string | number | undefined | null): ValidationResult {
  if (!value) {
    return { isValid: false, formattedValue: '', error: 'رقم السجل التجاري مطلوب' };
  }

  const raw = String(value).trim().replace(/[\s\-_/.]/g, '');

  if (!/^\d+$/.test(raw)) {
    return { isValid: false, formattedValue: raw, error: 'رقم السجل التجاري يجب أن يحتوي على أرقام فقط' };
  }

  if (raw.length < 3 || raw.length > 10) {
    return {
      isValid: false,
      formattedValue: raw,
      error: 'رقم السجل التجاري يجب أن يتراوح بين 3 و 10 أرقام',
    };
  }

  return {
    isValid: true,
    formattedValue: raw,
    type: 'COMMERCIAL_REG',
  };
}
