import React from 'react';
import { RiskLevel } from '../../types/analysis.js';
import { ShieldCheck, AlertTriangle, ShieldAlert, AlertCircle, HelpCircle } from 'lucide-react';

export interface BadgeProps {
  level?: RiskLevel | string;
  variant?: 'low' | 'medium' | 'high' | 'critical' | 'unknown' | 'neutral' | 'brand';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  children?: React.ReactNode;
  className?: string;
  id?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  level,
  variant,
  size = 'md',
  showIcon = true,
  children,
  className = '',
  id,
}) => {
  const normLevel = (level || variant || 'unknown').toString().toUpperCase();

  let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
  let IconComponent: React.FC<{ className?: string }> = HelpCircle;
  let defaultLabel = 'Chưa xác định';

  if (normLevel === 'LOW') {
    badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    IconComponent = ShieldCheck;
    defaultLabel = 'Thấp (An toàn)';
  } else if (normLevel === 'MEDIUM') {
    badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
    IconComponent = AlertCircle;
    defaultLabel = 'Trung bình';
  } else if (normLevel === 'HIGH') {
    badgeStyle = 'bg-orange-50 text-orange-800 border-orange-200';
    IconComponent = AlertTriangle;
    defaultLabel = 'Cao';
  } else if (normLevel === 'CRITICAL') {
    badgeStyle = 'bg-rose-50 text-rose-800 border-rose-200';
    IconComponent = ShieldAlert;
    defaultLabel = 'Rất cao';
  } else if (normLevel === 'BRAND') {
    badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    IconComponent = ShieldCheck;
    defaultLabel = 'ScamShield';
  }

  const sizeStyle =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs font-medium gap-1'
      : size === 'lg'
        ? 'px-3.5 py-1.5 text-sm font-semibold gap-2'
        : 'px-2.5 py-1 text-xs font-semibold gap-1.5';

  return (
    <span
      id={id}
      className={`inline-flex items-center rounded-full border shadow-2xs transition-colors ${badgeStyle} ${sizeStyle} ${className}`}
    >
      {showIcon && <IconComponent className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      <span>{children || defaultLabel}</span>
    </span>
  );
};
