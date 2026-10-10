// ==========================================
// مَهام وتنسيقات النظام المحاسبي (CPA & Egyptian Accounting Theme)
// ==========================================

export const theme = {
  font: 'Cairo, "IBM Plex Sans Arabic", sans-serif',
  colors: {
    primary: {
      DEFAULT: '#0284c7', // Sky Blue / Professional Blue
      dark: '#0369a1',
      light: '#e0f2fe',
      gradient: 'from-sky-600 to-blue-800',
    },
    secondary: {
      DEFAULT: '#0f172a', // Slate Dark
      light: '#334155',
    },
    neutral: {
      bg: '#f8fafc',
      cardBg: '#ffffff',
      border: '#e2e8f0',
      textPrimary: '#0f172a',
      textSecondary: '#64748b',
    },
    status: {
      success: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0', hex: '#22c55e' },
      warning: { bg: '#fef9c3', text: '#854d0e', border: '#fef08a', hex: '#eab308' },
      error: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca', hex: '#ef4444' },
      info: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd', hex: '#0284c7' },
      pending: { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0', hex: '#64748b' }
    }
  },
  spacing: {
    containerPadding: 'p-4 sm:p-6 lg:p-8',
    cardPadding: 'p-5 sm:p-6',
    sectionGap: 'space-y-6',
    elementGap: 'gap-3 sm:gap-4',
  },
  borderRadius: {
    card: 'rounded-2xl',
    button: 'rounded-xl',
    input: 'rounded-xl',
    badge: 'rounded-lg',
  },
  shadows: {
    card: 'shadow-sm hover:shadow-md transition-shadow duration-200',
    modal: 'shadow-2xl',
    dropdown: 'shadow-xl',
  }
};

// ==========================================
// تنسيق الأرقام المصرية والعملات والتاريخ
// ==========================================

/**
 * تنسيق الأرقام بصيغة مصرية مع فواصل الآلاف
 */
export function formatEgyptianNumber(value: number | string | undefined | null, decimals = 2): string {
  if (value === undefined || value === null || isNaN(Number(value))) {
    return '0.00';
  }
  const num = Number(value);
  return num.toLocaleString('ar-EG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * تنسيق العملة (جنيه مصري)
 */
export function formatEgyptianCurrency(value: number | string | undefined | null, decimals = 2): string {
  return `${formatEgyptianNumber(value, decimals)} جنيه`;
}

/**
 * تنسيق التاريخ (يوم/شهر/سنة)
 */
export function formatEgyptianDate(dateInput?: string | Date | number | null): string {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
}
