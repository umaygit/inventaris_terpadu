import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgColor = 'bg-blue-50',
  iconColor = 'text-blue-600',
  trend,
  onClick
}) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white dark:bg-[#0B1930] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs transition-all hover:shadow-md ${onClick ? 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-600' : ''}`}
    >
      <div className="flex items-center justify-between mb-2.5 sm:mb-3">
        <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBgColor} ${iconColor}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>
      
      <div className="flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          {value}
        </h3>
        {subtitle && (
          <span className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium truncate">
            {subtitle}
          </span>
        )}
      </div>

      {trend && (
        <div className="mt-2.5 sm:mt-3 pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs">
          <span className={`font-semibold ${trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {trend.value}
          </span>
          {trend.label && <span className="text-slate-500 dark:text-slate-400">{trend.label}</span>}
        </div>
      )}
    </div>
  );
};
