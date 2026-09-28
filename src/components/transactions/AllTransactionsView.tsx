'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Transaction, TransactionType, PaymentMethod } from '@/lib/types';
import { formatINR, formatIndianDate, formatIndianTime } from '@/lib/formatters';
import {
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Banknote,
  CreditCard,
  ChevronRight,
  Filter,
  Calendar,
  Trash2,
  Edit2,
  Users,
  Wallet,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

export function AllTransactionsView() {
  const { success, error } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'GAVE' | 'GOT'>('ALL');
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'Cash' | 'UPI'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'today' | 'week' | 'month'>('ALL');

  // Delete dialog
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/transactions?limit=200');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch {
      error('Failed to load transactions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!txToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/transactions/${txToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        success('Transaction deleted successfully.');
        setTxToDelete(null);
        fetchTransactions();
      } else {
        error(data.error || 'Failed to delete transaction.');
      }
    } catch {
      error('Connection error.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered transactions calculation
  const filteredTransactions = transactions.filter((t) => {
    // Search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = t.customerName?.toLowerCase().includes(q);
      const matchPhone = t.customerPhone?.toLowerCase().includes(q);
      const matchNotes = t.notes?.toLowerCase().includes(q);
      const matchAmount = t.amount.toString().includes(q);
      if (!matchName && !matchPhone && !matchNotes && !matchAmount) return false;
    }

    // Type
    if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;

    // Method
    if (methodFilter !== 'ALL' && t.paymentMethod !== methodFilter) return false;

    // Date
    if (dateFilter !== 'ALL') {
      const txDate = new Date(t.date);
      const now = new Date();
      if (dateFilter === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        if (t.date !== todayStr) return false;
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 86400000);
        if (txDate < weekAgo) return false;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 86400000);
        if (txDate < monthAgo) return false;
      }
    }

    return true;
  });

  // Calculate totals for filtered list
  const totalGiven = filteredTransactions
    .filter((t) => t.type === 'GAVE')
    .reduce((a, b) => a + b.amount, 0);

  const totalReceived = filteredTransactions
    .filter((t) => t.type === 'GOT')
    .reduce((a, b) => a + b.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">All Transactions</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete transaction history and ledger feed across all customers
          </p>
        </div>

        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#EB5E28] hover:bg-[#d64f1d] text-white text-xs font-bold rounded-xl shadow-md shadow-[#EB5E28]/25 transition"
        >
          <Users className="w-4 h-4" />
          <span>Open Customers Khata</span>
        </Link>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold uppercase text-slate-400">Total Filtered Entries</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {filteredTransactions.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Recorded transactions</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold uppercase text-rose-700">Total Money Given</div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
            {formatINR(totalGiven)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Lent / Credit given</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold uppercase text-emerald-700">Total Received</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
            {formatINR(totalReceived)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Repayments collected</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-orange-200/80 bg-orange-50/20 shadow-xs">
          <div className="text-[11px] font-extrabold uppercase text-[#EB5E28]">Net Difference</div>
          <div className="text-xl sm:text-2xl font-black text-[#EB5E28] mt-1">
            {formatINR(Math.max(0, totalGiven - totalReceived))}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Net uncollected amount</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search */}
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by customer name, phone, notes, amount..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#EB5E28] transition"
            />
          </div>

          {/* Quick Filter Selectors */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e: any) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#EB5E28]"
            >
              <option value="ALL">All Types (Given & Got)</option>
              <option value="GAVE">YOU GAVE Only</option>
              <option value="GOT">YOU GOT Only</option>
            </select>

            {/* Method Filter */}
            <select
              value={methodFilter}
              onChange={(e: any) => setMethodFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#EB5E28]"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="Cash">Cash Only</option>
              <option value="UPI">UPI Only</option>
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e: any) => setDateFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#EB5E28]"
            >
              <option value="ALL">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table & Mobile Feed */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center animate-pulse">
          <div className="h-6 w-48 bg-slate-200 mx-auto rounded-md mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl" />
            ))}
          </div>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#EB5E28] mx-auto flex items-center justify-center font-bold text-xl">
            <Wallet className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No transactions found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search || typeFilter !== 'ALL' || methodFilter !== 'ALL' || dateFilter !== 'ALL'
              ? 'No transactions matched your selected filters.'
              : 'Record money you gave or received by opening a customer khata ledger.'}
          </p>
          <Link
            href="/customers"
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#EB5E28] hover:bg-[#d64f1d] text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            <span>Go to Customers</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-5">Date & Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredTransactions.map((tx) => {
                  const isGave = tx.type === 'GAVE';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-slate-900">{formatIndianDate(tx.date)}</div>
                        <div className="text-xs text-slate-400">{formatIndianTime(tx.time)}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <Link
                          href={`/customers/${tx.customerId}`}
                          className="font-bold text-slate-900 hover:text-[#EB5E28] transition block"
                        >
                          {tx.customerName}
                        </Link>
                        {tx.customerPhone && (
                          <span className="text-xs text-slate-400">{tx.customerPhone}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                            isGave
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isGave ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                          <span>{isGave ? 'YOU GAVE' : 'YOU GOT'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`text-base font-black ${
                            isGave ? 'text-slate-900' : 'text-emerald-600'
                          }`}
                        >
                          {isGave ? '-' : '+'} {formatINR(tx.amount)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          {tx.paymentMethod === 'UPI' ? (
                            <CreditCard className="w-3.5 h-3.5 text-[#EB5E28]" />
                          ) : (
                            <Banknote className="w-3.5 h-3.5 text-slate-500" />
                          )}
                          <span>{tx.paymentMethod}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                        {tx.notes || '—'}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/customers/${tx.customerId}`}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-[#EB5E28] hover:text-white text-slate-700 text-xs font-bold rounded-lg transition inline-flex items-center gap-1"
                          >
                            <span>Ledger</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => setTxToDelete(tx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Transaction"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards Feed */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredTransactions.map((tx) => {
              const isGave = tx.type === 'GAVE';
              return (
                <div key={tx.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        href={`/customers/${tx.customerId}`}
                        className="font-bold text-base text-slate-900 hover:text-[#EB5E28]"
                      >
                        {tx.customerName}
                      </Link>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 font-medium">
                        <span>{formatIndianDate(tx.date)}</span>
                        <span>•</span>
                        <span>{formatIndianTime(tx.time)}</span>
                      </div>
                    </div>

                    <span
                      className={`text-base font-black ${
                        isGave ? 'text-slate-900' : 'text-emerald-600'
                      }`}
                    >
                      {isGave ? '-' : '+'} {formatINR(tx.amount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          isGave ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {isGave ? 'YOU GAVE' : 'YOU GOT'}
                      </span>
                      <span className="text-slate-600 font-semibold">{tx.paymentMethod}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/customers/${tx.customerId}`}
                        className="text-xs font-bold text-[#EB5E28] hover:underline"
                      >
                        Open Khata →
                      </Link>
                    </div>
                  </div>

                  {tx.notes && (
                    <p className="text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg italic">
                      &quot;{tx.notes}&quot;
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!txToDelete}
        onClose={() => setTxToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Transaction?"
        message={`Delete this ${txToDelete?.type === 'GAVE' ? 'Given' : 'Received'} payment of ${formatINR(
          txToDelete?.amount || 0
        )}?`}
        confirmText="Delete Transaction"
        isLoading={isDeleting}
      />
    </div>
  );
}
