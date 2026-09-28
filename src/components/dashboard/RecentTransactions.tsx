'use client';

import React from 'react';
import Link from 'next/link';
import { Transaction } from '@/lib/types';
import { formatINR, formatIndianDate, formatIndianTime } from '@/lib/formatters';
import { ArrowUpRight, ArrowDownLeft, Banknote, CreditCard, ArrowRight, Wallet } from 'lucide-react';

interface RecentTransactionsProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

export function RecentTransactions({ transactions, isLoading }: RecentTransactionsProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3 animate-pulse">
        <div className="h-5 w-36 bg-slate-200 rounded-md" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between">
      <div>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Transactions</h2>
            <p className="text-xs text-slate-500 mt-0.5">Latest payments given and received</p>
          </div>
          <Link
            href="/transactions"
            className="text-xs font-bold text-[#EB5E28] hover:text-[#d64f1d] inline-flex items-center gap-1 group"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
          </Link>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-700">No transactions recorded yet.</p>
            <p className="text-[11px] text-slate-400">
              Open a customer ledger to record payments given or received.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.slice(0, 6).map((tx) => {
              const isGave = tx.type === 'GAVE';
              return (
                <Link
                  key={tx.id}
                  href={`/customers/${tx.customerId}`}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition group block"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isGave
                          ? 'bg-rose-50 text-rose-600 border border-rose-100'
                          : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      }`}
                    >
                      {isGave ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 group-hover:text-[#EB5E28] transition truncate">
                          {tx.customerName || 'Customer'}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0 ${
                            isGave ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isGave ? 'GAVE' : 'GOT'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{formatIndianDate(tx.date)}</span>
                        <span>•</span>
                        <span>{formatIndianTime(tx.time)}</span>
                        {tx.notes && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500 italic truncate max-w-[120px]">
                              {tx.notes}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm sm:text-base font-black ${
                        isGave ? 'text-slate-900' : 'text-emerald-600'
                      }`}
                    >
                      {isGave ? '-' : '+'} {formatINR(tx.amount)}
                    </div>
                    <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                      {tx.paymentMethod === 'UPI' ? (
                        <CreditCard className="w-3 h-3 text-[#EB5E28]" />
                      ) : (
                        <Banknote className="w-3 h-3 text-slate-400" />
                      )}
                      <span>{tx.paymentMethod}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {transactions.length > 0 && (
        <div className="p-3 bg-slate-50/70 border-t border-slate-100 text-center">
          <Link
            href="/transactions"
            className="text-xs font-bold text-[#EB5E28] hover:underline inline-flex items-center gap-1"
          >
            <span>View All Transaction History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
