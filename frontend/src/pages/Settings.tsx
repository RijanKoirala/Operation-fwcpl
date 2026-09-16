import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Settings as SettingsIcon, Save, RotateCcw, ShieldAlert, Award, Building, Sliders, CheckCircle2 } from 'lucide-react';
import { Modal } from '../components/common/Modal';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'weights' | 'company' | 'maintenance'>('weights');

  // Weights state
  const [weights, setWeights] = useState({
    target_weight: 40,
    task_weight: 30,
    ontime_weight: 15,
    support_weight: 15
  });

  // Company info state
  const [companyInfo, setCompanyInfo] = useState({
    company_name: 'Fiber World Communication Pvt. Ltd.',
    short_name: 'FWCPL',
    country: 'Nepal',
    timezone: 'Asia/Kathmandu',
    support_email: 'support@fwcpl.com.np',
    support_phone: '+977-1-4567890'
  });

  // Modals & triggers
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.settings.get();
      if (res.settings) {
        if (res.settings.weights) setWeights(res.settings.weights);
        if (res.settings.company) setCompanyInfo(prev => ({ ...prev, ...res.settings.company }));
      }
    } catch (err) {
      console.log('Using default system settings');
    }
  };

  const totalWeight = Number(weights.target_weight) + Number(weights.task_weight) + Number(weights.ontime_weight) + Number(weights.support_weight);
  const isWeightValid = totalWeight === 100;

  const handleSaveWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWeightValid) {
      alert(`Weights must total exactly 100%! Current sum is ${totalWeight}%.`);
      return;
    }
    try {
      await api.settings.updateWeights(weights);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update scoring weights');
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.settings.updateCompany(companyInfo);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update company info');
    }
  };

  const handleResetData = async () => {
    try {
      setResetting(true);
      await api.settings.resetDemo();
      setShowResetModal(false);
      alert('System demo data successfully refreshed and re-seeded!');
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Failed to reset demo data');
    } finally {
      setResetting(false);
    }
  };

  const isSuperAdmin = user?.role === 'Super Admin';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="w-7 h-7 text-indigo-600" />
          System Settings & Operational Configurations
        </h1>
        <p className="text-gray-500 text-sm">
          Fine-tune calculation weights, organizational branding, and maintenance operations.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Configurations successfully saved and synchronized!
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('weights')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'weights'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Award className="w-4 h-4" /> Performance Scoring Weights
        </button>
        <button
          onClick={() => setActiveTab('company')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'company'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Building className="w-4 h-4" /> Company & Organization
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`py-3 px-5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'maintenance'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-500" /> System Maintenance
          </button>
        )}
      </div>

      {/* Tab 1: Scoring Weights */}
      {activeTab === 'weights' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Branch & Staff Composite Scoring Engine</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                The podium rankings and performance scores are dynamically calculated using this weighted mathematical model.
              </p>
            </div>
            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
              isWeightValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              Total: {totalWeight}% / 100%
            </div>
          </div>

          <form onSubmit={handleSaveWeights} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  1. Target Achievement Weight (%)
                </label>
                <p className="text-[11px] text-gray-500 mb-2">Weight for quarterly/monthly KPI completion percentage.</p>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={weights.target_weight}
                  onChange={e => setWeights({ ...weights, target_weight: Number(e.target.value) })}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  2. Task Volume Completion Weight (%)
                </label>
                <p className="text-[11px] text-gray-500 mb-2">Weight for raw ratio of finished tasks vs assigned tasks.</p>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={weights.task_weight}
                  onChange={e => setWeights({ ...weights, task_weight: Number(e.target.value) })}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  3. On-Time Delivery Rate (%)
                </label>
                <p className="text-[11px] text-gray-500 mb-2">Weight rewarded for completing tasks before strict deadlines.</p>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={weights.ontime_weight}
                  onChange={e => setWeights({ ...weights, ontime_weight: Number(e.target.value) })}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  4. Support Ticket SLA Resolution Rate (%)
                </label>
                <p className="text-[11px] text-gray-500 mb-2">Weight for solving technical tickets within SLA window.</p>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={weights.support_weight}
                  onChange={e => setWeights({ ...weights, support_weight: Number(e.target.value) })}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                Formula: <code className="bg-gray-100 px-2 py-0.5 rounded font-mono text-[11px]">Score = (Target × {weights.target_weight}%) + (Task × {weights.task_weight}%) + (OnTime × {weights.ontime_weight}%) + (SLA × {weights.support_weight}%)</code>
              </span>
              <button
                type="submit"
                disabled={!isWeightValid}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> Save Weights
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Company Info */}
      {activeTab === 'company' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-gray-900">Organization Information</h2>
          <form onSubmit={handleSaveCompany} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Organization Legal Name</label>
                <input
                  type="text"
                  value={companyInfo.company_name}
                  onChange={e => setCompanyInfo({ ...companyInfo, company_name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Short Name / Code</label>
                <input
                  type="text"
                  value={companyInfo.short_name}
                  onChange={e => setCompanyInfo({ ...companyInfo, short_name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Headquarters Country</label>
                <input
                  type="text"
                  value={companyInfo.country}
                  onChange={e => setCompanyInfo({ ...companyInfo, country: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">System Timezone</label>
                <input
                  type="text"
                  value={companyInfo.timezone}
                  onChange={e => setCompanyInfo({ ...companyInfo, timezone: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Support Email</label>
                <input
                  type="email"
                  value={companyInfo.support_email}
                  onChange={e => setCompanyInfo({ ...companyInfo, support_email: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Support Hotline Phone</label>
                <input
                  type="text"
                  value={companyInfo.support_phone}
                  onChange={e => setCompanyInfo({ ...companyInfo, support_phone: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition"
              >
                <Save className="w-4 h-4" /> Save Information
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Maintenance */}
      {activeTab === 'maintenance' && isSuperAdmin && (
        <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-rose-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Administrative Maintenance Zone
            </h2>
            <p className="text-xs text-rose-600 mt-1">
              Actions in this section directly affect database tables and system state.
            </p>
          </div>

          <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-200 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-rose-900">Reset Demo Data</h3>
              <p className="text-xs text-rose-700 mt-0.5 max-w-xl">
                Truncate current transactional data and re-seed the standard Fiber World demo environment (5 branches, 22 employees, 35 tasks, connections, tickets, targets).
              </p>
            </div>
            <button
              onClick={() => setShowResetModal(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" /> Reset Demo
            </button>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Confirm System Data Reset"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-700">
            Are you sure you want to reset the system demo data? All currently created tasks, tickets, and follow-ups will be restored to the initial test state.
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setShowResetModal(false)}
              className="px-4 py-2 border rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={resetting}
              onClick={handleResetData}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              {resetting ? 'Resetting...' : 'Yes, Reset Data'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
