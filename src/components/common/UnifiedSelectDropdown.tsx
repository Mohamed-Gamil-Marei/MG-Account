import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, LucideIcon } from 'lucide-react';

export interface UnifiedDropdownOption<T = string | number> {
  id: T;
  label: string;
  sublabel?: string;
  badge?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export interface UnifiedSelectDropdownProps<T = string | number> {
  id?: string;
  label?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  value: T;
  options: UnifiedDropdownOption<T>[];
  onChange: (value: T) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'dark' | 'emerald' | 'subtle';
  placeholder?: string;
  className?: string;
  menuWidth?: string;
  disabled?: boolean;
}

export const UnifiedSelectDropdown = <T extends string | number>({
  id,
  label,
  icon: Icon,
  value,
  options,
  onChange,
  size = 'md',
  variant = 'default',
  placeholder = 'اختر...',
  className = '',
  menuWidth = 'w-56',
  disabled = false,
}: UnifiedSelectDropdownProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.id === value);

  // Size styling
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs gap-1.5 rounded-lg',
    md: 'px-3 py-1.5 text-xs font-bold gap-2 rounded-xl',
    lg: 'px-4 py-2 text-sm font-bold gap-2.5 rounded-xl',
  }[size];

  // Variant styling for trigger button
  const variantClasses = {
    default:
      'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs',
    subtle:
      'bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 shadow-2xs',
    primary:
      'bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 shadow-xs shadow-blue-500/20',
    emerald:
      'bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-600 shadow-xs',
    dark:
      'bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 shadow-xs',
  }[variant];

  return (
    <div className={`relative inline-block text-right ${className}`} ref={dropdownRef} id={id}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center justify-between cursor-pointer transition-all duration-150 select-none ${sizeClasses} ${variantClasses} ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-98'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {Icon && <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />}
          {label && (
            <span className="text-[11px] font-medium opacity-70 ml-0.5 shrink-0">
              {label}:
            </span>
          )}
          <span className="truncate font-black">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-md bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 shrink-0">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 mr-1 ${
            isOpen ? 'rotate-180 text-blue-500' : 'opacity-60'
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-1 right-0 ${menuWidth} max-h-72 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1 divide-y divide-slate-100 dark:divide-slate-800/60 animate-in fade-in zoom-in-95 duration-100`}
          role="listbox"
        >
          {options.map((option) => {
            const isSelected = option.id === value;
            const OptionIcon = option.icon;

            return (
              <button
                key={String(option.id)}
                type="button"
                disabled={option.disabled}
                onClick={() => {
                  onChange(option.id);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-right text-xs font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  option.disabled
                    ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-800/40'
                    : isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-black'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                }`}
                role="option"
                aria-selected={isSelected}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {OptionIcon && (
                    <OptionIcon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                      }`}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="truncate">{option.label}</div>
                    {option.sublabel && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate">
                        {option.sublabel}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {option.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {option.badge}
                    </span>
                  )}
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
