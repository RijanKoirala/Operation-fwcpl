import React from 'react';

type CardVariant = 
  | 'blue' 
  | 'emerald' 
  | 'amber' 
  | 'rose' 
  | 'purple' 
  | 'slate' 
  | 'indigo' 
  | 'default' 
  | 'success' 
  | 'warning' 
  | 'danger';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: CardVariant;
  trend?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'blue',
  trend,
  onClick,
}) => {
  // Normalize alias variants
  let v = variant;
  if (v === 'default') v = 'indigo';
  if (v === 'success') v = 'emerald';
  if (v === 'warning') v = 'amber';
  if (v === 'danger') v = 'rose';

  const variantStyles: Record<string, { cardHover: string; iconBox: string; iconColor: string }> = {
    blue: {
      cardHover: 'hover:border-blue-200 hover:shadow-blue-500/5',
      iconBox: 'bg-blue-50/90 text-blue-600 border border-blue-100 shadow-2xs',
      iconColor: 'text-blue-600',
    },
    indigo: {
      cardHover: 'hover:border-indigo-200 hover:shadow-indigo-500/5',
      iconBox: 'bg-indigo-50/90 text-indigo-600 border border-indigo-100 shadow-2xs',
      iconColor: 'text-indigo-600',
    },
    purple: {
      cardHover: 'hover:border-purple-200 hover:shadow-purple-500/5',
      iconBox: 'bg-purple-50/90 text-purple-600 border border-purple-100 shadow-2xs',
      iconColor: 'text-purple-600',
    },
    emerald: {
      cardHover: 'hover:border-emerald-200 hover:shadow-emerald-500/5',
      iconBox: 'bg-emerald-50/90 text-emerald-600 border border-emerald-100 shadow-2xs',
      iconColor: 'text-emerald-600',
    },
    amber: {
      cardHover: 'hover:border-amber-200 hover:shadow-amber-500/5',
      iconBox: 'bg-amber-50/90 text-amber-600 border border-amber-100 shadow-2xs',
      iconColor: 'text-amber-600',
    },
    rose: {
      cardHover: 'hover:border-rose-200 hover:shadow-rose-500/5',
      iconBox: 'bg-rose-50/90 text-rose-600 border border-rose-100 shadow-2xs',
      iconColor: 'text-rose-600',
    },
    slate: {
      cardHover: 'hover:border-slate-300',
      iconBox: 'bg-slate-50 text-slate-600 border border-slate-200 shadow-2xs',
      iconColor: 'text-slate-600',
    },
  };

  const style = variantStyles[v] || variantStyles.blue;

  return (
    <div
      onClick={onClick}
      className={`relative p-5 rounded-2xl border border-slate-100/90 bg-white shadow-2xs transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${style.cardHover} ${
        onClick ? 'cursor-pointer active:scale-[0.99]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 truncate">{title}</p>
          <h4 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">{value}</h4>
          {subtitle && <p className="text-xs text-slate-500 mt-1 font-medium truncate">{subtitle}</p>}
          {trend && (
            <span className="inline-flex items-center text-xs font-semibold text-emerald-600 mt-1.5">
              {trend}
            </span>
          )}
        </div>
        <div
          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-105 ${style.iconBox}`}
        >
          <div className={`w-5 h-5 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5 [&>svg]:stroke-[2.25] ${style.iconColor}`}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
};
