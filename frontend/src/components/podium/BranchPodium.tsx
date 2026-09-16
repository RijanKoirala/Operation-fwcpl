import React from 'react';
import { Award, Building2, Target, CheckSquare, Clock } from 'lucide-react';
import { BranchPerformance } from '../../types';

interface BranchPodiumProps {
  podium: {
    first: BranchPerformance | null;
    second: BranchPerformance | null;
    third: BranchPerformance | null;
  };
  onNavigate?: (path: string) => void;
}

export const BranchPodium: React.FC<BranchPodiumProps> = ({ podium, onNavigate }) => {
  const { first, second, third } = podium;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <div className="flex items-center gap-2 mb-8">
        <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
          <Award className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Top Performing Branches Podium</h3>
          <p className="text-xs text-slate-500 mt-0.5">Automated branch performance ranking based on configured KPI weights</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4 pb-2">
        {/* 2nd Place Branch */}
        <div className="order-2 md:order-1 flex flex-col items-center">
          {second ? (
            <div 
              onClick={() => onNavigate?.(`/branches/${second.branchId}`)}
              className="w-full flex flex-col items-center cursor-pointer hover:scale-[1.02] transition-transform"
              title={`Click to view ${second.branchName} dashboard`}
            >
              <div className="relative mb-3">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-slate-600 shadow-md">
                  <Building2 className="w-8 h-8" />
                </div>
                <div className="absolute -bottom-2 -right-1 w-7 h-7 rounded-full bg-slate-400 text-white flex items-center justify-center font-black text-sm shadow">
                  🥈
                </div>
              </div>
              <h4 className="font-bold text-slate-900 text-sm text-center hover:text-indigo-600 transition-colors">{second.branchName}</h4>
              <p className="text-xs text-slate-500 text-center">{second.city}, {second.province}</p>

              <div className="w-full mt-4 bg-gradient-to-t from-slate-100 to-slate-50 border border-slate-200 rounded-2xl p-4 shadow-inner h-48 flex flex-col justify-between">
                <div className="text-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Score</span>
                  <p className="text-3xl font-black text-slate-800">{second.overallScore}</p>
                </div>
                <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-200/60 font-medium">
                  <div className="flex justify-between"><span>Target Achievement:</span><b>{second.targetAchievementRate}%</b></div>
                  <div className="flex justify-between"><span>Task Completion:</span><b>{second.taskCompletionRate}%</b></div>
                  <div className="flex justify-between"><span>On-Time SLA:</span><b>{second.onTimeRate}%</b></div>
                  <div className="flex justify-between"><span>Support Score:</span><b>{second.supportPerformanceRate}%</b></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-xs text-slate-400">No branch data</div>
          )}
        </div>

        {/* 1st Place Branch (Elevated Center) */}
        <div className="order-1 md:order-2 flex flex-col items-center">
          {first ? (
            <div 
              onClick={() => onNavigate?.(`/branches/${first.branchId}`)}
              className="w-full flex flex-col items-center cursor-pointer hover:scale-[1.02] transition-transform"
              title={`Click to view ${first.branchName} dashboard`}
            >
              <div className="relative mb-3">
                <div className="w-20 h-20 rounded-2xl bg-amber-50 border-2 border-amber-400 flex items-center justify-center text-amber-700 shadow-lg animate-pulse">
                  <Building2 className="w-10 h-10" />
                </div>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-2xl">🏆</span>
                </div>
                <div className="absolute -bottom-2 -right-1 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-sm shadow">
                  🥇
                </div>
              </div>
              <h4 className="font-extrabold text-slate-900 text-base text-center hover:text-indigo-600 transition-colors">{first.branchName}</h4>
              <p className="text-xs text-amber-800 font-medium text-center">{first.city}, {first.province}</p>

              <div className="w-full mt-4 bg-gradient-to-t from-amber-100/90 to-amber-50/50 border border-amber-300 rounded-2xl p-4 shadow-md h-56 flex flex-col justify-between">
                <div className="text-center">
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Top Branch Score</span>
                  <p className="text-4xl font-black text-amber-950">{first.overallScore}</p>
                </div>
                <div className="space-y-1.5 text-xs text-amber-950 pt-2 border-t border-amber-200 font-semibold">
                  <div className="flex justify-between"><span>Target Achievement:</span><b className="text-amber-900">{first.targetAchievementRate}%</b></div>
                  <div className="flex justify-between"><span>Task Completion:</span><b className="text-amber-900">{first.taskCompletionRate}%</b></div>
                  <div className="flex justify-between"><span>On-Time SLA:</span><b className="text-amber-900">{first.onTimeRate}%</b></div>
                  <div className="flex justify-between"><span>Support Score:</span><b className="text-amber-900">{first.supportPerformanceRate}%</b></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-xs text-slate-400">No branch data</div>
          )}
        </div>

        {/* 3rd Place Branch */}
        <div className="order-3 md:order-3 flex flex-col items-center">
          {third ? (
            <div 
              onClick={() => onNavigate?.(`/branches/${third.branchId}`)}
              className="w-full flex flex-col items-center cursor-pointer hover:scale-[1.02] transition-transform"
              title={`Click to view ${third.branchName} dashboard`}
            >
              <div className="relative mb-3">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 border-2 border-orange-300 flex items-center justify-center text-amber-800 shadow-md">
                  <Building2 className="w-7 h-7" />
                </div>
                <div className="absolute -bottom-2 -right-1 w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center font-black text-xs shadow">
                  🥉
                </div>
              </div>
              <h4 className="font-bold text-slate-900 text-sm text-center hover:text-indigo-600 transition-colors">{third.branchName}</h4>
              <p className="text-xs text-slate-500 text-center">{third.city}, {third.province}</p>

              <div className="w-full mt-4 bg-gradient-to-t from-orange-50 to-orange-50/20 border border-orange-200 rounded-2xl p-4 shadow-inner h-40 flex flex-col justify-between">
                <div className="text-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Score</span>
                  <p className="text-2xl font-black text-slate-800">{third.overallScore}</p>
                </div>
                <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-200/60 font-medium">
                  <div className="flex justify-between"><span>Target:</span><b>{third.targetAchievementRate}%</b></div>
                  <div className="flex justify-between"><span>Task:</span><b>{third.taskCompletionRate}%</b></div>
                  <div className="flex justify-between"><span>On-Time:</span><b>{third.onTimeRate}%</b></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center text-xs text-slate-400">No branch data</div>
          )}
        </div>
      </div>
    </div>
  );
};
