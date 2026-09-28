'use client';

import React from 'react';
import { DashboardSummary } from '@/lib/types';
import { formatINR } from '@/lib/formatters';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
} from 'lucide-react';

interface SummaryCardsProps {
  summary: DashboardSummary | null;
  isLoading?: boolean;
}

export function SummaryCards({ summary, isLoading }: SummaryCardsProps) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-200/70 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Primary Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Total Given */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Money Given
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatINR(summary.totalGiven)}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-medium text-slate-400">
            All loans & credit extended
          </div>
        </div>

        {/* Total Received */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Received
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatINR(summary.totalReceived)}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-medium text-slate-400">
            Total repayments collected
          </div>
        </div>

        {/* Total Pending */}
        <div className="bg-gradient-to-br from-white to-orange-50/50 p-5 rounded-2xl border-2 border-[#EB5E28]/30 shadow-sm relative overflow-hidden group hover:border-[#EB5E28]/60 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#EB5E28]">
              Total Net Pending
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#EB5E28] text-white flex items-center justify-center shadow-sm shadow-[#EB5E28]/30">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-[#EB5E28] tracking-tight">
              {formatINR(summary.totalPending)}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-500">
            Total outstanding balance across all customers
          </div>
        </div>
      </div>

      {/* Customer Status Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total / Active Customers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900">{summary.activeCustomers}</div>
            <div className="text-[11px] font-semibold text-slate-500">Active Customers</div>
          </div>
        </div>

        {/* Pending Customers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900">{summary.pendingCustomers}</div>
            <div className="text-[11px] font-semibold text-slate-500">Pending Dues</div>
          </div>
        </div>

        {/* Settled Customers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900">{summary.settledCustomers}</div>
            <div className="text-[11px] font-semibold text-slate-500">Settled (₹0)</div>
          </div>
        </div>

        {/* Overdue Customers */}
        <div className="bg-white p-4 rounded-xl border border-rose-200/80 bg-rose-50/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-black text-rose-600">{summary.overdueCustomers}</div>
            <div className="text-[11px] font-semibold text-rose-700">Overdue Repayments</div>
          </div>
        </div>
      </div>
    </div>
  );
}
