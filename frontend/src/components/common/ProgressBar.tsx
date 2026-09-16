import React from 'react';

interface ProgressBarProps {
  percentage: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  label,
  showPercentage = true,
  size = 'md',
}) => {
  const clamped = Math.min(100, Math.max(0, percentage));

  let colorClass = 'bg-rose-500';
  if (percentage >= 100) {
    colorClass = 'bg-emerald-500';
  } else if (percentage >= 70) {
    colorClass = 'bg-brand-500';
  } else if (percentage >= 40) {
    colorClass = 'bg-amber-500';
  }

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-1">
          {label && <span>{label}</span>}
          {showPercentage && <span className="font-bold">{percentage}%</span>}
        </div>
      )}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${heights[size]}`}>
        <div
          className={`${heights[size]} rounded-full transition-all duration-500 ease-out ${colorClass}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
