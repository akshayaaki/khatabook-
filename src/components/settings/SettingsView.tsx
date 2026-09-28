'use client';

import React from 'react';
import { UserProfile, useUser } from '@clerk/nextjs';
import { ShieldCheck, Shield } from 'lucide-react';

export function SettingsView() {
  const { user, isLoaded } = useUser();

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Settings & Account</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your account credentials, security preferences, and active devices powered by Clerk
        </p>
      </div>

      {/* Account Info Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#EB5E28] flex items-center justify-center font-black text-lg">
            {isLoaded && user?.firstName ? user.firstName[0].toUpperCase() : '👤'}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isLoaded ? user?.fullName || user?.username || 'Owner' : 'Loading account...'}
            </h2>
            <p className="text-xs text-slate-500">
              {isLoaded ? user?.primaryEmailAddress?.emailAddress || 'Owner Account' : ''}
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4" />
          <span>Clerk Protected</span>
        </div>
      </div>

      {/* Section: Clerk Profile Component */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden p-2 sm:p-6">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h2 className="text-base font-bold text-slate-900">Security & Authentication</h2>
          <p className="text-xs text-slate-500">
            Change password, email, configure 2FA, and manage connected devices
          </p>
        </div>

        <UserProfile
          routing="hash"
          appearance={{
            elements: {
              card: 'shadow-none border-0 p-0',
              navbar: 'hidden',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
            },
          }}
        />
      </div>

      {/* Section: App Specifications */}
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
    </div>
  );
}
