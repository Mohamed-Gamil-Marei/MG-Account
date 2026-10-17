import React from 'react';
import { Play } from 'lucide-react';

export interface MgBrandBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  hasPlayButton?: boolean;
  onClick?: () => void;
  className?: string;
}

export const MgBrandBadge: React.FC<MgBrandBadgeProps> = ({
  size = 'md',
  interactive = false,
  hasPlayButton = false,
  onClick,
  className = '',
}) => {
  const sizeClasses: Record<string, string> = {
    xs: 'w-7 h-7 text-[10px]',
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  };

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 border border-amber-500/40 text-amber-400 font-black shadow-md select-none shrink-0 ${
        sizeClasses[size] || sizeClasses.md
      } ${interactive || onClick ? 'cursor-pointer hover:border-amber-400 transition-all' : ''} ${className}`}
    >
      <span className="tracking-tighter">MG</span>
      {hasPlayButton && (
        <span className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
          <Play className="w-2.5 h-2.5 fill-current" />
        </span>
      )}
    </div>
  );
};
