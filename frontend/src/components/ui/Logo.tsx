import React from 'react';
import { Shield } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', showText = true }) => {
  const sizeMap = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const textSizeMap = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* FraudScope Shield Icon */}
      <div className={`relative ${sizeMap[size]} flex items-center justify-center shrink-0`}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#6366F1]/20 to-[#22D3EE]/20 rounded-xl blur-[6px]" />
        <div className="relative w-full h-full rounded-xl bg-[#131C2E] border border-[rgba(148,163,184,0.2)] flex items-center justify-center shadow-lg">
          <Shield className="w-5 h-5 text-[#6366F1] drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] fill-[#6366F1]/20" />
          <span className="absolute w-1.5 h-1.5 rounded-full bg-[#22D3EE] bottom-2 right-2 animate-ping" />
        </div>
      </div>

      {showText && (
        <div className="flex flex-col leading-none select-none">
          <div className="flex items-center gap-1">
            <span className={`font-bold tracking-tight text-[#E5E9F2] ${textSizeMap[size]}`}>
              FraudScope <span className="text-[#6366F1]">AI</span>
            </span>
          </div>
          <span className="text-[10px] tracking-wider text-[#94A3B8] font-medium mt-1">
            Detect. Analyze. Investigate.
          </span>
        </div>
      )}
    </div>
  );
};
