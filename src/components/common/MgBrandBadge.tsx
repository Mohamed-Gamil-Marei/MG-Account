import React from 'react';
import { Sparkles, Play } from 'lucide-react';

interface MgBrandBadgeProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showLabel?: boolean;
  showSubtitle?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
  hasPlayButton?: boolean;
}

export const MgBrandBadge: React.FC<MgBrandBadgeProps> = ({
  size = 'md',
  showLabel = false,
  showSubtitle = false,
  interactive = true,
  onClick,
  className = '',
  hasPlayButton = false,
}) => {
  const dimensions = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
    hero: 'w-20 h-20 text-2xl',
  }[size];

  return (
    <div
      onClick={interactive ? onClick : undefined}
      className={`inline-flex items-center gap-2.5 select-none ${
        interactive ? 'cursor-pointer group' : ''
      } ${className}`}
      title={interactive ? 'عرض الهوية الرسمية والبرومو السينمائي للمكتب' : undefined}
    >
      {/* Luxury Emerald & Gold Badge Emblem */}
      <div
        className={`relative ${dimensions} rounded-xl shrink-0 flex items-center justify-center font-serif font-black overflow-hidden border border-amber-400/60 shadow-md transition-all duration-300 ${
          interactive
            ? 'group-hover:scale-105 group-hover:shadow-amber-500/20 group-hover:border-amber-300'
            : ''
        }`}
        style={{
          background:
            'radial-gradient(circle at 30% 30%, #064e3b 0%, #022c22 65%, #011612 100%)',
          boxShadow: '0 2px 10px rgba(4, 47, 46, 0.4), inset 0 1px 1px rgba(251, 191, 36, 0.4)',
        }}
      >
        {/* Marble Vein Overlay Effect */}
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(at 80% 20%, rgba(253, 230, 138, 0.4) 0px, transparent 50%), radial-gradient(at 10% 80%, rgba(52, 211, 153, 0.3) 0px, transparent 50%)',
          }}
        />

        {/* Upward Currency Arrow Subtle Watermark */}
        <svg
          viewBox="0 0 24 24"
          className="absolute -top-1 -right-1 w-5 h-5 text-emerald-400/20 pointer-events-none"
          fill="currentColor"
        >
          <path d="M12 2L15 8H9L12 2Z M12 6V18 M8 14L12 18L16 14" />
        </svg>

        {/* MG Monogram with Split Metallic Chrome 'M' and Polished Gold 'G' */}
        <div className="relative z-10 flex items-center justify-center font-serif tracking-tighter leading-none">
          {/* Metallic Silver M */}
          <span
            className="font-extrabold"
            style={{
              background: 'linear-gradient(180deg, #FFFFFF 0%, #E2E8F0 45%, #94A3B8 80%, #64748B 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 1px 2px rgba(0,0,0,0.6)',
              filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.8))',
            }}
          >
            M
          </span>
          {/* Polished Gold G */}
          <span
            className="font-extrabold -mr-0.5"
            style={{
              background: 'linear-gradient(180deg, #FEF08A 0%, #F59E0B 50%, #B45309 85%, #78350F 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 1px 2px rgba(0,0,0,0.6)',
              filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.8))',
            }}
          >
            G
          </span>
        </div>

        {/* Play Icon Badge Overlay if enabled */}
        {hasPlayButton && (
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20">
            <Play className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
          </div>
        )}

        {/* Corner Golden Sparkle */}
        <Sparkles className="absolute bottom-0.5 left-0.5 w-2.5 h-2.5 text-amber-300/80 pointer-events-none" />
      </div>

      {/* Optional Label & Subtitle */}
      {(showLabel || showSubtitle) && (
        <div className="min-w-0 text-right">
          {showLabel && (
            <div className="text-xs font-bold text-slate-800 dark:text-white truncate flex items-center gap-1">
              <span>MOHAMED - M GAMEEL MARIE</span>
            </div>
          )}
          {showSubtitle && (
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold tracking-wide truncate">
              FOR ACCOUNTING AND AUDITING
            </div>
          )}
        </div>
      )}
    </div>
  );
};
