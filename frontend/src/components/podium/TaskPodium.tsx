import React, { useState } from 'react';
import { Trophy, Award, Medal, CheckCircle2, Clock } from 'lucide-react';
import { StaffPerformance } from '../../types';

interface TaskPodiumProps {
  podium: {
    first: StaffPerformance | null;
    second: StaffPerformance | null;
    third: StaffPerformance | null;
  };
  onPeriodChange?: (period: string) => void;
  currentPeriod?: string;
}

export const TaskPodium: React.FC<TaskPodiumProps> = ({
  podium,
  onPeriodChange,
  currentPeriod = 'month',
}) => {
  const { first, second, third } = podium;

  const periods = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'quarter', label: 'This Quarter' },
    { key: 'year', label: 'This Year' },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      {/* Header with period filter buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
              <Trophy className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Top Task Completers Podium</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">Real-time operational ranking based on task completion and SLA compliance</p>
        </div>

        {onPeriodChange && (
          <div className="inline-flex bg-slate-100 p-1 rounded-xl">
            {periods.map(p => (
              <button
                key={p.key}
                onClick={() => onPeriodChange(p.key)}
                className={`text-xs px-3 py-1.5 font-semibold rounded-lg transition-all ${
                  currentPeriod === p.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3D Olympic Podium Layout: 2nd (Left), 1st (Center, Elevated), 3rd (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4 pb-2">
        {/* 2nd Place (Silver) */}
        <div className="order-2 md:order-1 flex flex-col items-center">
          {second ? (
            <div className="w-full flex flex-col items-center">
              <div className="relative mb-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-slate-300 to-slate-100 border-4 border-slate-300 flex items-center justify-center text-slate-700 font-bold text-xl shadow-lg">
                  {second.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div className="absolute -bottom-2 -right-1 w-7 h-7 rounded-full bg-slate-400 text-white flex items-center justify-center font-black text-sm shadow">
                  🥈
                </div>
              </div>
              <h4 className="font-bold text-slate-900 text-sm text-center line-clamp-1">{second.fullName}</h4>
              <p className="text-xs text-slate-500 text-center">{second.designation}</p>
              <span className="text-[11px] px-2 py-0.5 mt-1 bg-slate-100 text-slate-600 rounded-full font-medium">
                {second.branchName}
              </span>

              {/* Podium Block */}
              <div className="w-full mt-4 bg-gradient-to-t from-slate-100 to-slate-50 border border-slate-200 rounded-2xl p-4 text-center shadow-inner h-36 flex flex-col justify-center">
                <span className="text-2xl font-black text-slate-400 mb-1">2nd</span>
                <p className="text-lg font-black text-slate-800">{second.completedTasks} Tasks</p>
                <div className="flex justify-center items-center gap-3 text-xs text-slate-600 mt-1 font-medium">
                  <span>{second.onTimeRate}% On-Time</span>
                  <span>•</span>
                  <span>Score: <b className="text-slate-900">{second.overallScore}</b></span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-xs text-slate-400">No data</div>
          )}
        </div>

        {/* 1st Place (Gold - Taller & Center) */}
        <div className="order-1 md:order-2 flex flex-col items-center">
          {first ? (
            <div className="w-full flex flex-col items-center">
              <div className="relative mb-3">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 border-4 border-amber-300 flex items-center justify-center text-amber-900 font-extrabold text-2xl shadow-xl animate-pulse">
                  {first.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-2xl">👑</span>
                </div>
                <div className="absolute -bottom-2 -right-1 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-sm shadow">
                  🥇
                </div>
              </div>
              <h4 className="font-bold text-slate-900 text-base text-center line-clamp-1">{first.fullName}</h4>
              <p className="text-xs text-amber-700 font-semibold text-center">{first.designation}</p>
              <span className="text-[11px] px-2.5 py-0.5 mt-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full font-semibold">
                {first.branchName}
              </span>

              {/* Podium Block (Elevated) */}
              <div className="w-full mt-4 bg-gradient-to-t from-amber-100/80 to-amber-50/50 border border-amber-200 rounded-2xl p-4 text-center shadow-md h-44 flex flex-col justify-center">
                <span className="text-3xl font-black text-amber-500 mb-1">1st</span>
                <p className="text-2xl font-black text-amber-950">{first.completedTasks} Tasks</p>
                <div className="flex justify-center items-center gap-3 text-xs text-amber-900 mt-1 font-semibold">
                  <span>{first.onTimeRate}% On-Time</span>
                  <span>•</span>
                  <span>Score: <b className="text-amber-950 text-sm">{first.overallScore}</b></span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-xs text-slate-400">No data</div>
          )}
        </div>

        {/* 3rd Place (Bronze) */}
        <div className="order-3 md:order-3 flex flex-col items-center">
          {third ? (
            <div className="w-full flex flex-col items-center">
              <div className="relative mb-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-700/40 to-amber-600/20 border-4 border-amber-600/40 flex items-center justify-center text-amber-900 font-bold text-lg shadow-md">
                  {third.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div className="absolute -bottom-2 -right-1 w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center font-black text-xs shadow">
                  🥉
                </div>
              </div>
              <h4 className="font-bold text-slate-900 text-sm text-center line-clamp-1">{third.fullName}</h4>
              <p className="text-xs text-slate-500 text-center">{third.designation}</p>
              <span className="text-[11px] px-2 py-0.5 mt-1 bg-slate-100 text-slate-600 rounded-full font-medium">
                {third.branchName}
              </span>

              {/* Podium Block */}
              <div className="w-full mt-4 bg-gradient-to-t from-orange-50 to-orange-50/30 border border-orange-200/60 rounded-2xl p-4 text-center shadow-inner h-28 flex flex-col justify-center">
                <span className="text-xl font-black text-amber-700/60 mb-1">3rd</span>
                <p className="text-base font-black text-slate-800">{third.completedTasks} Tasks</p>
                <div className="flex justify-center items-center gap-2 text-xs text-slate-600 mt-1 font-medium">
                  <span>{third.onTimeRate}% On-Time</span>
                  <span>•</span>
                  <span>Score: <b className="text-slate-900">{third.overallScore}</b></span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center text-xs text-slate-400">No data</div>
          )}
        </div>
      </div>
    </div>
  );
};
