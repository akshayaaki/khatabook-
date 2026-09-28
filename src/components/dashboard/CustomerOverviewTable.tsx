'use client';

import React from 'react';
import Link from 'next/link';
import { Customer } from '@/lib/types';
import { formatINR, formatIndianDate } from '@/lib/formatters';
import { ArrowRight, ChevronRight, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface CustomerOverviewTableProps {
  customers: Customer[];
  isLoading?: boolean;
  onOpenKhata: (customer: Customer) => void;
}

export function CustomerOverviewTable({
  customers,
  isLoading,
  onOpenKhata,
}: CustomerOverviewTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-slate-200 rounded-md" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-500" /> OVERDUE
          </span>
        );
      case 'SETTLED':
      case 'NO_OUTSTANDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600" /> SETTLED
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
            <Clock className="w-3 h-3 text-[#EB5E28]" /> PENDING
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Customer Ledgers Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">Summary of customer accounts and pending amounts</p>
        </div>
        <Link
          href="/customers"
          className="text-xs font-bold text-[#EB5E28] hover:text-[#d64f1d] inline-flex items-center gap-1 group"
        >
          <span>View All Customers</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
        </Link>
      </div>

      {customers.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-sm font-semibold text-slate-600">No customers yet.</p>
          <p className="text-xs text-slate-400 mt-1">Add your first customer to start tracking your khata.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4 text-right">Total Given</th>
                <th className="py-3 px-4 text-right">Total Received</th>
                <th className="py-3 px-4 text-right">Pending Amount</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {customers.slice(0, 6).map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/70 transition cursor-pointer"
                  onClick={() => onOpenKhata(c)}
                >
                  <td className="py-3.5 px-5">
                    <div className="font-bold text-slate-900">{c.name}</div>
                    {c.email && <div className="text-xs text-slate-400">{c.email}</div>}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">{c.phone}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                    {formatINR(c.totalGiven || 0)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                    {formatINR(c.totalReceived || 0)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`font-black text-sm ${
                        (c.pendingAmount || 0) > 0 ? 'text-[#EB5E28]' : 'text-slate-500'
                      }`}
                    >
                      {formatINR(c.pendingAmount || 0)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600 font-semibold">
                    {c.nextDueDate ? formatIndianDate(c.nextDueDate) : '—'}
                  </td>
                  <td className="py-3.5 px-4">{getStatusBadge(c.status)}</td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenKhata(c);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-[#EB5E28] hover:text-white text-slate-700 text-xs font-bold rounded-lg transition inline-flex items-center gap-1 shadow-2xs"
                    >
                      <span>Open Khata</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
