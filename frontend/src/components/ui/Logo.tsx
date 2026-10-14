import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'mark' | 'full';
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md', 
  showText = true,
  variant = 'mark'
}) => {
  const sizeMap = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const fullSizeMap = {
    xs: 'h-8',
    sm: 'h-10',
    md: 'h-12',
    lg: 'h-16',
    xl: 'h-20',
  };

  if (variant === 'full') {
    return (
      <div className={`inline-flex items-center select-none shrink-0 ${className}`}>
        <img
          src="/fraudscope_logo.png"
          alt="FRAUDSCOPE AI — Detect. Analyze. Investigate."
          className={`${fullSizeMap[size]} w-auto object-contain drop-shadow-[0_2px_8px_rgba(212,175,55,0.15)]`}
        />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 select-none shrink-0 ${className}`}>
      <div className="relative flex items-center justify-center shrink-0">
        <img
          src="/fraudscope_emblem.png"
          alt="FRAUDSCOPE AI — Detect. Analyze. Investigate."
          className={`${sizeMap[size]} object-contain drop-shadow-[0_2px_6px_rgba(212,175,55,0.2)]`}
        />
      </div>

      {showText && (
        <div className="flex flex-col justify-center text-left leading-none">
          <div className="flex items-center gap-1">
            <span className="font-bold tracking-tight text-[var(--text)] text-base font-sans">
              FRAUDSCOPE <span className="text-[#D4AF37]">AI</span>
            </span>
          </div>
          <span className="text-[9px] tracking-widest text-[var(--muted)] font-mono font-semibold uppercase mt-0.5">
            Detect • Analyze • Investigate
          </span>
        </div>
      )}
    </div>
  );
};
