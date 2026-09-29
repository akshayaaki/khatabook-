'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldCheck,
  Shield,
  User,
  Mail,
  KeyRound,
  LogOut,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';

export function SettingsView() {
  const router = useRouter();
  const { user, ownerUser, isLoaded = true, signOutUser, resetPassword, updateUserProfile } = useAuth() as any;

  const [displayName, setDisplayName] = useState(user?.displayName || ownerUser?.name || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const [signingOut, setSigningOut] = useState(false);

  const email = user?.email || ownerUser?.email || 'owner@personalkhata.local';
  const providerId = user?.providerData?.[0]?.providerId || 'firebase/password';
  const isGoogle = providerId === 'google.com';

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setUpdatingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      await updateUserProfile(displayName.trim());
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 4000);
    } catch (err: any) {
      setProfileError(err?.message || 'Failed to update profile name');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!email) return;
    setSendingReset(true);
    setResetError(null);
    setResetEmailSent(false);

    try {
      await resetPassword(email);
      setResetEmailSent(true);
      setTimeout(() => setResetEmailSent(false), 5000);
    } catch (err: any) {
      setResetError(err?.message || 'Failed to send password reset email');
    } finally {
      setSendingReset(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOutUser();
      router.push('/sign-in');
      router.refresh();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setSigningOut(false);
    }
  };

  const nameInitial = displayName ? displayName[0]?.toUpperCase() : 'O';

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Settings & Account</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your owner profile, security credentials, and active sessions powered by Firebase
        </p>
      </div>

      {/* Account Info Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={displayName}
              className="w-14 h-14 rounded-2xl object-cover ring-2 ring-[#EB5E28]/20"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#EB5E28] flex items-center justify-center font-black text-2xl shadow-xs">
              {nameInitial}
            </div>
          )}
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {displayName || 'Khata Owner'}
            </h2>
            <p className="text-xs text-slate-500">{email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                {isGoogle ? 'Google Account' : 'Email & Password'}
              </span>
              <span className="text-[10px] text-slate-400">
                UID: {user?.uid?.substring(0, 10)}...
              </span>
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl text-xs font-bold self-start sm:self-auto shadow-xs">
          <ShieldCheck className="w-4 h-4" />
          <span>Firebase Authenticated</span>
        </div>
      </div>

      {/* Section: Profile Details */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-[#EB5E28]" />
            Owner Profile Information
          </h2>
          <p className="text-xs text-slate-500">
            Update your display name shown in invoices, reminders, and customer reports
          </p>
        </div>

        {profileSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-700 text-xs font-medium animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Profile name updated successfully!
          </div>
        )}

        {profileError && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-red-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {profileError}
          </div>
        )}

        <form onSubmit={handleUpdateName} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Owner / Business Display Name
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:bg-white focus:border-[#EB5E28] focus:ring-2 focus:ring-[#EB5E28]/15 transition font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              disabled
              value={email}
              className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-2xl text-sm text-slate-500 font-medium cursor-not-allowed"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Email is managed through your authentication provider.
            </span>
          </div>

          <button
            type="submit"
            disabled={updatingProfile}
            className="px-5 py-2.5 bg-[#EB5E28] hover:bg-[#d64f1d] text-white text-xs font-bold rounded-2xl shadow-sm shadow-[#EB5E28]/25 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            {updatingProfile ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </form>
      </div>

      {/* Section: Security & Password */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#EB5E28]" />
            Security & Password Reset
          </h2>
          <p className="text-xs text-slate-500">
            Send password reset instructions directly to your email
          </p>
        </div>

        {resetEmailSent && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-700 text-xs font-medium animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Password reset link sent to {email}. Check your inbox!
          </div>
        )}

        {resetError && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-red-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {resetError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div>
            <div className="font-bold text-xs text-slate-900">Reset Account Password</div>
            <div className="text-[11px] text-slate-500">
              Receive a secure Firebase link to reset your account password.
            </div>
          </div>

          <button
            type="button"
            onClick={handleSendPasswordReset}
            disabled={sendingReset || !email}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 shadow-xs flex items-center gap-2 transition disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            {sendingReset ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#EB5E28]" />
            ) : (
              <Mail className="w-3.5 h-3.5 text-[#EB5E28]" />
            )}
            <span>Send Reset Email</span>
          </button>
        </div>
      </div>

      {/* Section: Active Session */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-4">
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Laptop className="w-4 h-4 text-[#EB5E28]" />
              Active Session & Device
            </h2>
            <p className="text-xs text-slate-500">Currently authenticated device session</p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#EB5E28]">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                <span>Current Device</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <div className="text-[11px] text-slate-500">
                Session Token: Active & Verified
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 transition cursor-pointer flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{signingOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>
      </div>

      {/* Section: App Specifications */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#EB5E28]" />
          Application Specifications
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block mb-1">Theme</span>
            <span className="text-slate-900 font-bold">Light Theme Only</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block mb-1">Currency & Numbering</span>
            <span className="text-slate-900 font-bold">Indian Rupee (INR / ₹)</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block mb-1">Timezone</span>
            <span className="text-slate-900 font-bold">Asia / Kolkata</span>
          </div>
        </div>
      </div>
    </div>
  );
}
