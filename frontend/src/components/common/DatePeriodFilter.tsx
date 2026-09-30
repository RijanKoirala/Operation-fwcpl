import React from 'react';
import { Calendar, Clock } from 'lucide-react';

export type DatePeriod =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'specific_date'
  | 'custom';

export type DateMode = 'requested' | 'completed';

/**
 * Formats any timestamp / date string into readable local application format:
 * Example: "29 Sep 2026, 11:24 AM"
 * If pure YYYY-MM-DD date without time: "29 Sep 2026"
 * If empty/null/invalid: "—"
 */
export const formatDateTime = (
  dateStr?: string | Date | null,
  fallbackDateStr?: string | Date | null
): string => {
  const target = dateStr || fallbackDateStr;
  if (!target) return '—';

  // If pure date string (YYYY-MM-DD) without time
  if (typeof target === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(target.trim())) {
    const [y, m, day] = target.trim().split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${months[m - 1]} ${y}`;
  }

  const d = new Date(target);
  if (isNaN(d.getTime())) return '—';

  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 hour is 12 AM

  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
};

/**
 * Calculates start and end YYYY-MM-DD boundaries in local browser timezone for a given period preset.
 */
export const getDateRangeForPeriod = (
  period: DatePeriod,
  specificDate?: string,
  customStart?: string,
  customEnd?: string
): { startDate?: string; endDate?: string } => {
  const now = new Date();

  const formatYMD = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  switch (period) {
    case 'all':
      return { startDate: undefined, endDate: undefined };

    case 'today': {
      const todayStr = formatYMD(now);
      return { startDate: todayStr, endDate: todayStr };
    }

    case 'yesterday': {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = formatYMD(yest);
      return { startDate: yestStr, endDate: yestStr };
    }

    case 'this_week': {
      const d = new Date(now);
      const dayOfWeek = d.getDay(); // 0 is Sun, 1 is Mon...
      const distanceToMonday = (dayOfWeek + 6) % 7;
      const monday = new Date(d);
      monday.setDate(d.getDate() - distanceToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { startDate: formatYMD(monday), endDate: formatYMD(sunday) };
    }

    case 'last_week': {
      const d = new Date(now);
      const dayOfWeek = d.getDay();
      const distanceToMonday = (dayOfWeek + 6) % 7;
      const thisMonday = new Date(d);
      thisMonday.setDate(d.getDate() - distanceToMonday);
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(thisMonday.getDate() - 7);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      return { startDate: formatYMD(lastMonday), endDate: formatYMD(lastSunday) };
    }

    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { startDate: formatYMD(start), endDate: formatYMD(end) };
    }

    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: formatYMD(start), endDate: formatYMD(end) };
    }

    case 'specific_date':
      return { startDate: specificDate || undefined, endDate: specificDate || undefined };

    case 'custom':
      return { startDate: customStart || undefined, endDate: customEnd || undefined };

    default:
      return { startDate: undefined, endDate: undefined };
  }
};

interface DatePeriodFilterProps {
  period: DatePeriod;
  onPeriodChange: (newPeriod: DatePeriod) => void;
  specificDate?: string;
  onSpecificDateChange?: (date: string) => void;
  startDate?: string;
  onStartDateChange?: (date: string) => void;
  endDate?: string;
  onEndDateChange?: (date: string) => void;
  dateMode?: DateMode;
  onDateModeChange?: (mode: DateMode) => void;
  showDateMode?: boolean;
  dateLabel?: string;
}

export const DatePeriodFilter: React.FC<DatePeriodFilterProps> = ({
  period,
  onPeriodChange,
  specificDate = '',
  onSpecificDateChange,
  startDate = '',
  onStartDateChange,
  endDate = '',
  onEndDateChange,
  dateMode = 'requested',
  onDateModeChange,
  showDateMode = false,
  dateLabel = 'Date Range',
}) => {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Optional Date Mode Selector (for New Connections: Requested Date vs Completed Date) */}
      {showDateMode && onDateModeChange && (
        <select
          value={dateMode}
          onChange={e => onDateModeChange(e.target.value as DateMode)}
          className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-2 font-semibold cursor-pointer focus:ring-2 focus:ring-brand-500/20"
          title="Filter date based on"
        >
          <option value="requested">Requested Date</option>
          <option value="completed">Completed Date</option>
        </select>
      )}

      {/* Preset Period Selector */}
      <div className="relative">
        <select
          value={period}
          onChange={e => onPeriodChange(e.target.value as DatePeriod)}
          className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl pl-7 pr-3 py-2 font-medium cursor-pointer focus:ring-2 focus:ring-brand-500/20"
          title={dateLabel}
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="this_week">This Week</option>
          <option value="last_week">Last Week</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="specific_date">Specific Date</option>
          <option value="custom">Custom Date Range</option>
        </select>
        <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
      </div>

      {/* Specific Date Picker */}
      {period === 'specific_date' && onSpecificDateChange && (
        <input
          type="date"
          value={specificDate}
          onChange={e => onSpecificDateChange(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-1.5 font-medium focus:ring-2 focus:ring-brand-500/20"
          title="Select specific date"
        />
      )}

      {/* Custom Date Range Pickers */}
      {period === 'custom' && (
        <div className="flex items-center gap-1">
          {onStartDateChange && (
            <input
              type="date"
              value={startDate}
              onChange={e => onStartDateChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-2 py-1.5 font-medium focus:ring-2 focus:ring-brand-500/20"
              title="From date"
            />
          )}
          <span className="text-[11px] text-slate-400 font-bold">to</span>
          {onEndDateChange && (
            <input
              type="date"
              value={endDate}
              onChange={e => onEndDateChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-2 py-1.5 font-medium focus:ring-2 focus:ring-brand-500/20"
              title="To date"
            />
          )}
        </div>
      )}
    </div>
  );
};
