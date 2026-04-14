import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white shadow-sm',
        padding && 'p-6',
        className
      )}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: 'indigo' | 'green' | 'red' | 'amber' | 'slate';
  subtitle?: string;
}

const statColorMap = {
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', value: 'text-indigo-700' },
  green: { bg: 'bg-green-50', icon: 'text-green-600', value: 'text-green-700' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', value: 'text-red-700' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', value: 'text-amber-700' },
  slate: { bg: 'bg-slate-50', icon: 'text-slate-600', value: 'text-slate-700' },
};

export function StatCard({ title, value, icon, color = 'slate', subtitle }: StatCardProps) {
  const colors = statColorMap[color];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className={cn('mt-1 text-2xl font-bold', colors.value)}>{value}</p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={cn('rounded-lg p-2', colors.bg)}>
            <span className={cn('h-5 w-5', colors.icon)}>{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}
