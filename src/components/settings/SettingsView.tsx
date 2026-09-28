'use client';

import React, { useState, useEffect } from 'react';
import { DeviceSession } from '@/lib/types';
import { formatIndianDate, formatIndianTime } from '@/lib/formatters';
import {
  KeyRound,
  Laptop,
  Smartphone,
  Shield,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

export function SettingsView() {
  const { success, error } = useToast();

  // User credentials
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingCreds, setIsUpdatingCreds] = useState(false);

  // Field errors
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Sessions
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // Confirm dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
  });

  const loadData = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const d = await meRes.json();
        setCurrentUser(d.user);
        setNewUsername(d.user?.username || '');
        setNewEmail(d.user?.email || '');
        setSessions(d.activeSessions || []);
      }
    } catch {
      error('Failed to load profile settings.');
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const validateCredentials = (): boolean => {
    let valid = true;
    setUsernameError('');
    setPasswordError('');

    if (newUsername && newUsername.trim().length < 3) {
      setUsernameError('Username must be at least 3 characters.');
      valid = false;
    }

    if (newPassword) {
      if (newPassword.length < 5) {
        setPasswordError('New password must be at least 5 characters long.');
        valid = false;
      } else if (newPassword !== confirmPassword) {
        setPasswordError('New password and confirmation do not match.');
        valid = false;
      }
    }

    if (!currentPassword) {
      error('Please enter your current password to save changes.');
      valid = false;
    }

    return valid;
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCredentials()) {
      return;
    }

    setIsUpdatingCreds(true);
    try {
      const res = await fetch('/api/auth/update-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newUsername: newUsername !== currentUser?.username ? newUsername.trim() : undefined,
          newEmail: newEmail !== currentUser?.email ? newEmail.trim() : undefined,
          newPassword: newPassword ? newPassword.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || 'Failed to update credentials.');
        setIsUpdatingCreds(false);
        return;
      }

      success('Account credentials updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      loadData();
    } catch {
      error('Unable to connect to server.');
    } finally {
      setIsUpdatingCreds(false);
    }
  };

  const handleLogoutAllOtherDevices = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Logout All Other Devices?',
      message:
        'This will immediately revoke access and sign out all other connected devices (up to 3). Your current session will remain active.',
      action: async () => {
        const res = await fetch('/api/auth/logout-others', { method: 'POST' });
        if (res.ok) {
          success('All other devices have been logged out.');
          loadData();
        } else {
          error('Failed to logout other devices.');
        }
      },
    });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Settings & Account</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your owner login credentials, active device sessions, and app preferences
        </p>
      </div>

      {/* Section 1: Owner Account Credentials */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#EB5E28] flex items-center justify-center font-bold">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Owner Login Credentials</h2>
            <p className="text-xs text-slate-500">
              Update username, email, and password for your private ledger access
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateCredentials} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Username
              </label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => {
                  setNewUsername(e.target.value);
                  if (usernameError) setUsernameError('');
                }}
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm font-semibold focus:bg-white focus:outline-none transition ${
                  usernameError ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[#EB5E28]'
                }`}
              />
              {usernameError && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {usernameError}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="owner@example.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:border-[#EB5E28]"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Change Password <span className="text-slate-400 font-normal">(Leave blank to keep unchanged)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  placeholder="••••••••"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm font-semibold focus:bg-white focus:outline-none transition ${
                    passwordError ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[#EB5E28]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  placeholder="••••••••"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm font-semibold focus:bg-white focus:outline-none transition ${
                    passwordError ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-[#EB5E28]'
                  }`}
                />
              </div>
            </div>
            {passwordError && (
              <p className="text-[11px] text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {passwordError}
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 bg-orange-50/50 p-3.5 rounded-xl">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Current Password <span className="text-rose-500">* (Required to save changes)</span>
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#EB5E28]"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUpdatingCreds}
              className="px-5 py-2.5 bg-[#EB5E28] hover:bg-[#d64f1d] text-white text-xs font-bold rounded-xl shadow-md shadow-[#EB5E28]/20 transition disabled:opacity-50"
            >
              {isUpdatingCreds ? 'Saving Changes...' : 'Update Credentials'}
            </button>
          </div>
        </form>
      </div>

      {/* Section 2: Active Devices & Session Management */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Active Device Sessions</h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
                  Max 3 Devices
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Connected devices accessing Personal Khata. Real-time multi-device synchronization.
              </p>
            </div>
          </div>

          {sessions.length > 1 && (
            <button
              onClick={handleLogoutAllOtherDevices}
              className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout All Other Devices</span>
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {sessions.map((sess) => (
            <div key={sess.id} className="py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
                  {sess.deviceInfo.toLowerCase().includes('phone') ? (
                    <Smartphone className="w-4 h-4" />
                  ) : (
                    <Laptop className="w-4 h-4" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{sess.deviceInfo}</span>
                    {sess.isCurrent && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Current Device
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Last active: {formatIndianDate(sess.lastActive)} at {formatIndianTime(sess.lastActive)}
                  </div>
                </div>
              </div>

              <div className="text-right text-xs text-slate-500 font-semibold">
                IP: {sess.ipAddress || '127.0.0.1'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: App Specifications */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          Application Specifications
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 block mb-1">Theme</span>
            <span className="text-slate-900 font-bold">Light Theme Only</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 block mb-1">Currency & Numbering</span>
            <span className="text-slate-900 font-bold">Indian Rupee (INR / ₹)</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 block mb-1">Timezone</span>
            <span className="text-slate-900 font-bold">Asia / Kolkata</span>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={async () => {
          await confirmDialog.action();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }}
        title={confirmDialog.title}
        message={confirmDialog.message}
      />
    </div>
  );
}
