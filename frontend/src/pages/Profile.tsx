import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { User, Lock, Building2, Briefcase, Mail, Phone, Shield, CheckCircle2 } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setMsg({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    try {
      setSaving(true);
      setMsg(null);
      // Calls user profile password update
      await api.auth.updatePassword({ currentPassword, newPassword });
      setMsg({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to update password' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <User className="w-7 h-7 text-indigo-600" />
          My Profile & Account
        </h1>
        <p className="text-gray-500 text-sm">
          View your organizational assignment, permissions, and security credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: User Identity Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-2xl shadow-inner mb-4">
            {user.name.charAt(0)}
          </div>
          <h2 className="font-bold text-gray-900 text-lg">{user.name}</h2>
          <p className="text-xs text-indigo-600 font-semibold mb-2">@{user.username}</p>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-6">
            {user.role}
          </span>

          <div className="space-y-3 text-left border-t border-gray-100 pt-5 text-xs">
            <div className="flex items-center gap-2.5 text-gray-600">
              <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{user.branch_name || 'Headquarters / Global'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-gray-600">
              <Briefcase className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{user.designation || 'Staff Member'} ({user.department || 'Operations'})</span>
            </div>
            <div className="flex items-center gap-2.5 text-gray-600">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{user.email || `${user.username}@fwcpl.com.np`}</span>
            </div>
            <div className="flex items-center gap-2.5 text-gray-600">
              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{user.phone || '+977-9800000000'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-gray-600">
              <Shield className="w-4 h-4 text-gray-400 shrink-0" />
              <span>Status: <strong className="text-emerald-600">Active</strong></span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={logout}
              className="w-full py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold rounded-xl text-xs transition"
            >
              Sign Out of Account
            </button>
          </div>
        </div>

        {/* Right: Security & Password Update */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-600" /> Change Security Password
          </h3>
          <p className="text-xs text-gray-500 mb-6">
            Ensure your account uses a secure password with at least 6 alphanumeric characters.
          </p>

          {msg && (
            <div className={`p-3 rounded-xl text-xs mb-4 flex items-center gap-2 ${
              msg.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : null}
              {msg.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Current Password *</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">New Password *</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 chars)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm New Password *</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-3 border-t flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
