import React from 'react';
import { BranchPerformance } from '../../types';

interface BranchLeaderboardProps {
  branches: BranchPerformance[];
  onNavigate?: (path: string) => void;
}

export const BranchLeaderboard: React.FC<BranchLeaderboardProps> = ({ branches, onNavigate }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
          <tr>
            <th className="py-3.5 px-4">Rank</th>
            <th className="py-3.5 px-4">Branch</th>
            <th className="py-3.5 px-4">City / Province</th>
            <th className="py-3.5 px-4 text-center">Target %</th>
            <th className="py-3.5 px-4 text-center">Task Done %</th>
            <th className="py-3.5 px-4 text-center">On-Time %</th>
            <th className="py-3.5 px-4 text-center">Support %</th>
            <th className="py-3.5 px-4 text-center">Follow-up %</th>
            <th className="py-3.5 px-4 text-right">Overall Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {branches.map((b, index) => {
            const rank = b.rank || index + 1;
            const rankBadges: Record<number, string> = {
              1: 'bg-amber-100 text-amber-800 font-extrabold border-amber-300',
              2: 'bg-slate-200 text-slate-800 font-extrabold border-slate-300',
              3: 'bg-orange-100 text-orange-800 font-extrabold border-orange-300',
            };

            return (
              <tr 
                key={b.branchId} 
                onClick={() => onNavigate?.(`/branches/${b.branchId}`)}
                className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                title={`Click to view ${b.branchName} dashboard`}
              >
                <td className="py-3 px-4">
                  {rank <= 3 ? (
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs border ${rankBadges[rank]}`}>
                      {rank === 1 ? '🥇 1' : rank === 2 ? '🥈 2' : '🥉 3'}
                    </span>
                  ) : (
                    <span className="font-semibold text-slate-400 pl-2">#{rank}</span>
                  )}
                </td>
                <td className="py-3 px-4 font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                  {b.branchName}
                  <span className="block text-xs font-normal text-slate-400">{b.branchCode}</span>
                </td>
                <td className="py-3 px-4 text-slate-600">{b.city}, {b.province}</td>
                <td className="py-3 px-4 text-center">
                  <span className={b.targetAchievementRate >= 80 ? 'text-emerald-600 font-bold' : 'text-slate-600'}>
                    {b.targetAchievementRate}%
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={b.taskCompletionRate >= 70 ? 'text-emerald-600 font-bold' : 'text-slate-600'}>
                    {b.taskCompletionRate}%
                  </span>
                </td>
                <td className="py-3 px-4 text-center font-medium">{b.onTimeRate}%</td>
                <td className="py-3 px-4 text-center font-medium">{b.supportPerformanceRate}%</td>
                <td className="py-3 px-4 text-center font-medium">{b.followUpPerformanceRate}%</td>
                <td className="py-3 px-4 text-right">
                  <span className="text-base font-black text-brand-700">{b.overallScore}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
