import React from 'react';

interface StatusBadgeProps {
  status: 'NEW' | 'NEEDS_REVIEW' | 'UNDER_INVESTIGATION' | 'ESCALATED' | 'CLOSED' | 'FALSE_POSITIVE' | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = (status || 'NEW').toUpperCase();

  const config: Record<string, { label: string; bg: string; text: string; border: string }> = {
    NEW: {
      label: 'New',
      bg: 'bg-[#D8EEF0]',
      text: 'text-[#0F6E7A]',
      border: 'border-[#B2DFE3]',
    },
    NEEDS_REVIEW: {
      label: 'Needs review',
      bg: 'bg-[#FEF3D6]',
      text: 'text-[#8A5A00]',
      border: 'border-[#FCD888]',
    },
    UNDER_INVESTIGATION: {
      label: 'Needs review',
      bg: 'bg-[#FEF3D6]',
      text: 'text-[#8A5A00]',
      border: 'border-[#FCD888]',
    },
    REVIEWED: {
      label: 'Reviewed',
      bg: 'bg-[#E6F7F0]',
      text: 'text-[#1D6B4F]',
      border: 'border-[#A3E3CB]',
    },
    ESCALATED: {
      label: 'Escalated',
      bg: 'bg-[#FDE8E8]',
      text: 'text-[#A8341C]',
      border: 'border-[#F8B4B6]',
    },
    CLOSED: {
      label: 'Closed',
      bg: 'bg-[#E6F7F0]',
      text: 'text-[#1D6B4F]',
      border: 'border-[#A3E3CB]',
    },
    DISMISSED: {
      label: 'Dismissed',
      bg: 'bg-[#F2ECDF]',
      text: 'text-[#6F675B]',
      border: 'border-[#D9CFBA]',
    },
    FALSE_POSITIVE: {
      label: 'Dismissed',
      bg: 'bg-[#F2ECDF]',
      text: 'text-[#6F675B]',
      border: 'border-[#D9CFBA]',
    },
  };

  const current = config[norm] || {
    label: norm,
    bg: 'bg-[#FBF7EE]',
    text: 'text-[#6F675B]',
    border: 'border-[#D9CFBA]',
  };

  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-0.5';

  return (
    <span
      className={`inline-flex items-center font-sans rounded-[var(--radius)] border font-medium ${current.bg} ${current.border} ${current.text} ${sizeClasses}`}
    >
      {current.label}
    </span>
  );
};
