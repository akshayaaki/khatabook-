'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('adminqwerty');
  const [password, setPassword] = useState('qwerty');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Invalid credentials. Please try again.');
        setIsLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setErrorMessage('Unable to connect to server. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Container */}
      <div className="w-full max-w-md space-y-6">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#EB5E28] flex items-center justify-center text-white font-black text-3xl mx-auto shadow-lg shadow-[#EB5E28]/30">
            ₹
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Personal Khata</h1>
          <p className="text-xs font-semibold text-slate-500">
            Your private, single-owner personal money ledger
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white p-7 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">Owner Sign In</span>
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Private Access</span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 animate-in fade-in">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="adminqwerty"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:border-[#EB5E28] focus:ring-2 focus:ring-[#EB5E28]/15 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:border-[#EB5E28] focus:ring-2 focus:ring-[#EB5E28]/15 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#EB5E28] hover:bg-[#d64f1d] text-white font-bold text-sm rounded-xl shadow-lg shadow-[#EB5E28]/25 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In to Khata'}</span>
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Initial credentials hint block */}
          <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-100 text-[11px] text-slate-600 space-y-1">
            <span className="font-bold text-[#EB5E28] block">Default Initial Credentials:</span>
            <div>
              Username: <code className="font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-orange-200">adminqwerty</code>
            </div>
            <div>
              Password: <code className="font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-orange-200">qwerty</code>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              (You can change your username and password anytime in Settings)
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-400 font-medium">
          Personal Khata • Up to 3 active devices synchronized
        </div>
      </div>
    </div>
  );
}
