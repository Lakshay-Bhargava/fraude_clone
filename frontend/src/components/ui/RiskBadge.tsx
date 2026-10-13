import React from 'react';
import { AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';

interface RiskBadgeProps {
  level?: 'LOW' | 'MEDIUM' | 'HIGH' | string | null;
  score?: number | null;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level = 'LOW',
  score,
  showScore = true,
  size = 'md',
  className = '',
}) => {
  const normLevel = (level || 'LOW').toUpperCase();

  const config = {
    HIGH: {
      bg: 'bg-[#FF4D5A]/10',
      border: 'border-[#FF4D5A]/30',
      text: 'text-[#FF4D5A]',
      dot: 'bg-[#FF4D5A]',
      icon: ShieldAlert,
      label: 'HIGH RISK',
    },
    MEDIUM: {
      bg: 'bg-[#F3B84B]/10',
      border: 'border-[#F3B84B]/30',
      text: 'text-[#F3B84B]',
      dot: 'bg-[#F3B84B]',
      icon: AlertTriangle,
      label: 'MEDIUM RISK',
    },
    LOW: {
      bg: 'bg-[#49D6A5]/10',
      border: 'border-[#49D6A5]/30',
      text: 'text-[#49D6A5]',
      dot: 'bg-[#49D6A5]',
      icon: ShieldCheck,
      label: 'LOW RISK',
    },
  }[normLevel] || {
    bg: 'bg-white/5',
    border: 'border-white/10',
    text: 'text-[#9297A4]',
    dot: 'bg-gray-400',
    icon: ShieldCheck,
    label: 'UNRATED',
  };

  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-medium',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-mono rounded-md border ${config.bg} ${config.border} ${config.text} ${sizeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{config.label}</span>
      {showScore && score !== undefined && score !== null && (
        <span className="font-bold border-l border-white/10 pl-1.5 ml-0.5">
          {Math.round(score)}/100
        </span>
      )}
    </span>
  );
};
