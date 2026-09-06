import React, { useState, useEffect, useRef } from 'react';
import { formatEgyptianCurrency } from '../../utils/qrCodeGenerator';

interface AccountingNumberInputProps {
  value: number;
  onChange: (val: number) => void;
  allowNegative?: boolean;
  allowDecimals?: boolean;
  decimalPlaces?: number;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: string | number;
  highlightNegative?: boolean;
  useParenthesesForNegative?: boolean;
  showCurrencyInPrint?: boolean;
  id?: string;
  autoSelectOnFocus?: boolean;
  title?: string;
}

export const AccountingNumberInput: React.FC<AccountingNumberInputProps> = ({
  value,
  onChange,
  allowNegative = true,
  allowDecimals = true,
  decimalPlaces = 2,
  className = '',
  placeholder = '0.00',
  disabled = false,
  min,
  max,
  step = 'any',
  highlightNegative = true,
  useParenthesesForNegative = true,
  showCurrencyInPrint = false,
  id,
  autoSelectOnFocus = true,
  title,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [textValue, setTextValue] = useState<string>(() => {
    if (value === undefined || value === null || isNaN(value)) return '0';
    return String(value);
  });

  // Keep internal string in sync when external value changes while NOT focused
  useEffect(() => {
    if (!isFocused) {
      if (value === undefined || value === null || isNaN(value)) {
        setTextValue('0');
      } else {
        setTextValue(String(value));
      }
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;

    // Normalize Arabic/Persian digits to Western standard digits
    raw = raw
      .replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d) => String(d.charCodeAt(0) - 1632))
      .replace(/[۰۱۲۳۴۵۶۷۸۹]/g, (d) => String(d.charCodeAt(0) - 1776))
      .replace(/،/g, '.');

    // Filter valid characters: optional leading minus, digits, optional single decimal point
    let filtered = '';
    let hasDot = false;
    let hasMinus = false;

    for (let i = 0; i < raw.length; i++) {
      const char = raw[i];
      if (char === '-' && allowNegative && i === 0 && !hasMinus) {
        filtered += '-';
        hasMinus = true;
      } else if (char === '.' && allowDecimals && !hasDot) {
        filtered += '.';
        hasDot = true;
      } else if (/\d/.test(char)) {
        filtered += char;
      }
    }

    setTextValue(filtered);

    // If it's a complete parseable number, notify parent
    if (filtered !== '' && filtered !== '-' && filtered !== '.' && filtered !== '-.') {
      const parsed = parseFloat(filtered);
      if (!isNaN(parsed)) {
        let constrained = parsed;
        if (min !== undefined && constrained < min) constrained = min;
        if (max !== undefined && constrained > max) constrained = max;
        onChange(constrained);
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (textValue === '' || textValue === '-' || textValue === '.' || textValue === '-.') {
      setTextValue('0');
      onChange(0);
    } else {
      const parsed = parseFloat(textValue);
      if (isNaN(parsed)) {
        setTextValue('0');
        onChange(0);
      } else {
        let finalVal = parsed;
        if (min !== undefined && finalVal < min) finalVal = min;
        if (max !== undefined && finalVal > max) finalVal = max;
        setTextValue(String(finalVal));
        onChange(finalVal);
      }
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (autoSelectOnFocus) {
      e.target.select();
    }
  };

  const isNeg = (value || 0) < 0;

  return (
    <div className="relative inline-flex items-center w-full">
      {/* Interactive Input for Screen Mode */}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        disabled={disabled}
        value={textValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        title={title}
        className={`w-full font-mono text-left transition-colors print:hidden ${
          highlightNegative && isNeg
            ? 'text-rose-700 dark:text-rose-400 font-bold'
            : ''
        } ${className}`}
      />

      {/* Print-Only Formatted Representation for Clean Paper Layouts */}
      <span
        aria-hidden="true"
        className={`hidden print:inline-block w-full text-left font-mono font-bold ${
          highlightNegative && isNeg ? 'text-red-700' : 'text-slate-900'
        }`}
      >
        {showCurrencyInPrint
          ? formatEgyptianCurrency(value || 0, useParenthesesForNegative)
          : isNeg
          ? useParenthesesForNegative
            ? `(${Math.abs(value || 0).toLocaleString('en-US', { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })})`
            : `-${Math.abs(value || 0).toLocaleString('en-US', { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })}`
          : (value || 0).toLocaleString('en-US', {
              minimumFractionDigits: decimalPlaces,
              maximumFractionDigits: decimalPlaces,
            })}
      </span>
    </div>
  );
};
