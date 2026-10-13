import React from 'react';

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
      {/* Original Cyber-Aperture Icon */}
      <div className={`relative ${sizeMap[size]} flex items-center justify-center shrink-0`}>
        {/* Outer Hex-Aperture Ring */}
        <svg viewBox="0 0 40 40" className="w-full h-full fill-none drop-shadow-[0_0_8px_rgba(255,117,71,0.5)]">
          {/* Subtle Outer Frame */}
          <polygon
            points="20,2 35.6,11 35.6,29 20,38 4.4,29 4.4,11"
            className="stroke-[#FF7547] stroke-[1.5] opacity-60"
          />
          {/* Crosshair Forensics Reticles */}
          <line x1="20" y1="0" x2="20" y2="8" className="stroke-[#FF7547] stroke-[1.5]" />
          <line x1="20" y1="32" x2="20" y2="40" className="stroke-[#FF7547] stroke-[1.5]" />
          <line x1="0" y1="20" x2="8" y2="20" className="stroke-[#FF7547] stroke-[1.5]" />
          <line x1="32" y1="20" x2="40" y2="20" className="stroke-[#FF7547] stroke-[1.5]" />

          {/* Connected Network Nodes */}
          <circle cx="20" cy="10" r="1.5" className="fill-[#FF7547]" />
          <circle cx="29" cy="25" r="1.5" className="fill-[#FF4D5A]" />
          <circle cx="11" cy="25" r="1.5" className="fill-[#49D6A5]" />
          
          {/* Inner Optical Lens Center */}
          <circle cx="20" cy="20" r="5" className="stroke-[#FF7547] stroke-[1.5] fill-[#171A22]" />
          <circle cx="20" cy="20" r="2.5" className="fill-[#FF7547] animate-pulse" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none select-none">
          <div className="flex items-center gap-1">
            <span className={`font-display font-extrabold tracking-tight text-[#F5F5F7] ${textSizeMap[size]}`}>
              FRAUD<span className="text-[#FF7547]">SCOPE</span>
            </span>
            <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-[#FF7547]/10 text-[#FF7547] border border-[#FF7547]/30 tracking-widest font-semibold ml-0.5">
              AI
            </span>
          </div>
          <span className="text-[9px] font-mono tracking-widest text-[#9297A4] uppercase mt-0.5">
            Threat Intelligence
          </span>
        </div>
      )}
    </div>
  );
};
