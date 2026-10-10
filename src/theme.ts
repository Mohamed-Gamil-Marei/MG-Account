// src/theme.ts
// Single minimalist theme configuration for the application

export const theme = {
  // Base Layout & Colors
  bg: {
    app: 'bg-slate-50 text-slate-900',
    card: 'bg-white',
    hover: 'hover:bg-slate-50',
    subtle: 'bg-slate-100',
  },
  
  // Borders & Shadows
  border: {
    default: 'border border-slate-200',
    subtle: 'border border-slate-100',
    focus: 'focus:border-slate-400 focus:ring-1 focus:ring-slate-400',
  },
  
  shadow: {
    card: 'shadow-sm',
    subtle: 'shadow-sm',
    none: 'shadow-none',
  },

  // Colors
  colors: {
    primary: {
      text: 'text-slate-900',
      bg: 'bg-slate-900 text-white',
      hover: 'hover:bg-slate-800',
      border: 'border-slate-900',
      lightBg: 'bg-slate-100 text-slate-800',
    },
    error: {
      text: 'text-red-600',
      bg: 'bg-red-50 text-red-700',
      border: 'border-red-200',
      badge: 'bg-red-50 text-red-700 border border-red-200',
    },
    success: {
      text: 'text-emerald-600',
      bg: 'bg-emerald-50 text-emerald-700',
      border: 'border-emerald-200',
      badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    },
    neutral: {
      text: 'text-slate-600',
      muted: 'text-slate-500',
      light: 'text-slate-400',
    }
  },

  // Stat Row & Cards: single compact row of simple numbers
  statCard: 'bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col justify-between',
  statRow: 'grid grid-cols-2 md:grid-cols-4 gap-3 mb-6',
  
  // Table Styling
  table: {
    wrapper: 'w-full overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-sm',
    table: 'w-full text-right text-sm border-collapse',
    thead: 'bg-slate-50 border-b border-slate-200 text-slate-700 font-medium text-xs',
    th: 'py-2.5 px-3 text-right font-medium text-slate-700',
    tr: 'border-b border-slate-100 hover:bg-slate-50/80 transition-colors',
    td: 'py-2.5 px-3 text-slate-800 align-middle',
    tdNum: 'py-2.5 px-3 text-slate-800 font-mono text-left align-middle', // fixed-width font for numbers
  },

  // Buttons
  button: {
    primary: 'px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-md transition-colors shadow-sm disabled:opacity-50 inline-flex items-center justify-center gap-1.5',
    secondary: 'px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-md transition-colors shadow-sm disabled:opacity-50 inline-flex items-center justify-center gap-1.5',
    danger: 'px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-medium text-sm rounded-md transition-colors shadow-sm disabled:opacity-50 inline-flex items-center justify-center gap-1.5',
  }
};
