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
      bg: 'bg-[#EF4444]/15',
      border: 'border-[#EF4444]/35',
      text: 'text-[#EF4444]',
      dot: 'bg-[#EF4444]',
      icon: ShieldAlert,
      label: 'HIGH RISK',
    },
    MEDIUM: {
      bg: 'bg-[#F59E0B]/15',
      border: 'border-[#F59E0B]/35',
      text: 'text-[#F59E0B]',
      dot: 'bg-[#F59E0B]',
      icon: AlertTriangle,
      label: 'MEDIUM RISK',
    },
    LOW: {
      bg: 'bg-[#10B981]/15',
      border: 'border-[#10B981]/35',
      text: 'text-[#10B981]',
      dot: 'bg-[#10B981]',
      icon: ShieldCheck,
      label: 'LOW RISK',
    },
  }[normLevel] || {
    bg: 'bg-white/5',
    border: 'border-white/10',
    text: 'text-[#94A3B8]',
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
      className={`inline-flex items-center font-mono rounded-lg border ${config.bg} ${config.border} ${config.text} ${sizeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{config.label}</span>
      {showScore !== false && score !== undefined && score !== null && (
        <span className="font-bold border-l border-white/15 pl-1.5 ml-0.5">
          {Math.round(score)}/100
        </span>
      )}
    </span>
  );
};
