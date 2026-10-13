import React from 'react';

interface StatusBadgeProps {
  status: 'NEW' | 'NEEDS_REVIEW' | 'UNDER_INVESTIGATION' | 'ESCALATED' | 'CLOSED' | 'FALSE_POSITIVE' | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = (status || 'NEW').toUpperCase();

  const config: Record<string, { label: string; bg: string; text: string; border: string }> = {
    NEW: {
      label: 'NEW',
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
    },
    NEEDS_REVIEW: {
      label: 'NEEDS REVIEW',
      bg: 'bg-[#F4BC52]/10',
      text: 'text-[#F4BC52]',
      border: 'border-[#F4BC52]/30',
    },
    UNDER_INVESTIGATION: {
      label: 'UNDER INVESTIGATION',
      bg: 'bg-[#FF7547]/10',
      text: 'text-[#FF7547]',
      border: 'border-[#FF7547]/30',
    },
    ESCALATED: {
      label: 'ESCALATED',
      bg: 'bg-[#FF5964]/10',
      text: 'text-[#FF5964]',
      border: 'border-[#FF5964]/30',
    },
    CLOSED: {
      label: 'CLOSED',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
    },
    FALSE_POSITIVE: {
      label: 'FALSE POSITIVE',
      bg: 'bg-gray-500/10',
      text: 'text-gray-400',
      border: 'border-gray-500/30',
    },
  };

  const current = config[norm] || {
    label: norm,
    bg: 'bg-gray-500/10',
    text: 'text-gray-400',
    border: 'border-gray-500/30',
  };

  const sizeClasses = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-0.5';

  return (
    <span
      className={`inline-flex items-center font-mono rounded border font-medium uppercase tracking-wider ${current.bg} ${current.border} ${current.text} ${sizeClasses}`}
    >
      {current.label}
    </span>
  );
};
