import React from 'react';
import { StaffPerformance } from '../../types';

interface StaffLeaderboardProps {
  staff: StaffPerformance[];
}

export const StaffLeaderboard: React.FC<StaffLeaderboardProps> = ({ staff }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
          <tr>
            <th className="py-3.5 px-4">Rank</th>
            <th className="py-3.5 px-4">Staff Member</th>
            <th className="py-3.5 px-4">Designation</th>
            <th className="py-3.5 px-4">Branch</th>
            <th className="py-3.5 px-4 text-center">Tasks Done</th>
            <th className="py-3.5 px-4 text-center">On-Time %</th>
            <th className="py-3.5 px-4 text-center">Target %</th>
            <th className="py-3.5 px-4 text-right">Overall Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {staff.map((s, index) => {
            const rank = s.rank || index + 1;
            const rankBadges: Record<number, string> = {
              1: 'bg-amber-100 text-amber-800 font-extrabold border-amber-300',
              2: 'bg-slate-200 text-slate-800 font-extrabold border-slate-300',
              3: 'bg-orange-100 text-orange-800 font-extrabold border-orange-300',
            };

            return (
              <tr key={s.staffId} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-4">
                  {rank <= 3 ? (
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs border ${rankBadges[rank]}`}>
                      {rank === 1 ? '🥇 1' : rank === 2 ? '🥈 2' : '🥉 3'}
                    </span>
                  ) : (
                    <span className="font-semibold text-slate-400 pl-2">#{rank}</span>
                  )}
                </td>
                <td className="py-3 px-4 font-semibold text-slate-900">
                  {s.fullName}
                  <span className="block text-xs font-normal text-slate-400">{s.employeeId}</span>
                </td>
                <td className="py-3 px-4">{s.designation}</td>
                <td className="py-3 px-4">
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    {s.branchName}
                  </span>
                </td>
                <td className="py-3 px-4 text-center font-bold text-slate-800">{s.completedTasks}</td>
                <td className="py-3 px-4 text-center">
                  <span className={s.onTimeRate >= 80 ? 'text-emerald-600 font-bold' : 'text-slate-600'}>
                    {s.onTimeRate}%
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={s.targetAchievementRate >= 80 ? 'text-emerald-600 font-bold' : 'text-slate-600'}>
                    {s.targetAchievementRate}%
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-base font-black text-brand-700">{s.overallScore}</span>
                </td>
              </tr>
            );
          })}
          {staff.length === 0 && (
            <tr>
              <td colSpan={8} className="py-8 text-center text-slate-400">
                No staff ranking data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
