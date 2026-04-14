import React from 'react';
import { cn, getStatusColor } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface BadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: BadgeProps) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        getStatusColor(status),
        className
      )}
    >
      {t(`status.${status}`, status)}
    </span>
  );
}

interface GenericBadgeProps {
  children: React.ReactNode;
  color?: 'indigo' | 'green' | 'red' | 'amber' | 'slate';
  className?: string;
}

const colorMap = {
  indigo: 'bg-indigo-100 text-indigo-700',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
  slate: 'bg-slate-100 text-slate-600',
};

export function Badge({ children, color = 'slate', className }: GenericBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colorMap[color],
        className
      )}
    >
      {children}
    </span>
  );
}
