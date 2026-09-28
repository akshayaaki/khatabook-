'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { formatINR, formatIndianDate } from '@/lib/formatters';
import { DateRangePreset } from '@/lib/types';
import {
  Calendar,
  Filter,
  TrendingUp,
  AlertTriangle,
  Users,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import Link from 'next/link';

export function AnalyticsView() {
  const [range, setRange] = useState<DateRangePreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        range,
        ...(range === 'custom' && startDate && endDate ? { startDate, endDate } : {}),
      });
      const res = await fetch(`/api/analytics?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch {
      console.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [range, startDate, endDate]);

  const summary = analyticsData?.summary || {
    totalCustomers: 0,
    activeCustomers: 0,
    pendingCustomers: 0,
    settledCustomers: 0,
    overdueCustomers: 0,
    totalGiven: 0,
    totalReceived: 0,
    totalPending: 0,
  };

  const timelineData = analyticsData?.timelineData || [];
  const monthlyData = analyticsData?.monthlyData || [];
  const statusDistribution = analyticsData?.statusDistribution || [];
  const overdueList = analyticsData?.overdueList || [];

  return (
    <div className="space-y-6">
      {/* Header & Date Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Financial Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Visual trends, lending volume, repayment tracking, and overdue metrics
          </p>
        </div>

        {/* Date Filter Presets */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs">
          {[
            { key: 'today', label: 'Today' },
            { key: 'this_week', label: 'This Week' },
            { key: 'this_month', label: 'This Month' },
            { key: 'last_month', label: 'Last Month' },
            { key: 'this_year', label: 'This Year' },
            { key: 'all', label: 'All Time' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setRange(tab.key as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                range === tab.key
                  ? 'bg-[#EB5E28] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold uppercase text-slate-400">Total Money Given</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {formatINR(summary.totalGiven)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Total credit lent</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold uppercase text-emerald-700">Total Repayments</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
            {formatINR(summary.totalReceived)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Collections received</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-orange-200/80 bg-orange-50/20 shadow-xs">
          <div className="text-[11px] font-extrabold uppercase text-[#EB5E28]">Current Pending</div>
          <div className="text-xl sm:text-2xl font-black text-[#EB5E28] mt-1">
            {formatINR(summary.totalPending)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Net outstanding balance</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200/80 bg-rose-50/20 shadow-xs">
          <div className="text-[11px] font-bold uppercase text-rose-700">Overdue Accounts</div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
            {summary.overdueCustomers} Accounts
          </div>
          <div className="text-[11px] text-rose-600 mt-0.5">Pending past due date</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Given vs Received Timeline */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">Given vs Received Over Time</h3>
              <p className="text-xs text-slate-500">Timeline of credit extended vs repayments collected</p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            {timelineData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold">
                No transaction data for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="colorGiven" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EB5E28" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#EB5E28" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatINR(Number(val)), '']}
                    labelFormatter={(label) => `Date: ${formatIndianDate(String(label))}`}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area
                    type="monotone"
                    dataKey="given"
                    name="Money Given (₹)"
                    stroke="#EB5E28"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorGiven)"
                  />
                  <Area
                    type="monotone"
                    dataKey="received"
                    name="Money Received (₹)"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorReceived)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Monthly Lending vs Monthly Collections */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">Monthly Lending vs Collections</h3>
              <p className="text-xs text-slate-500">Monthly breakdown of funds lent vs repayments</p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            {monthlyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold">
                No monthly data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: '#64748B' }} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatINR(Number(val)), '']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="given" name="Lent (Given)" fill="#EB5E28" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="received" name="Collections (Got)" fill="#10B981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: Customer Status Distribution Donut */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">Customer Account Status</h3>
              <p className="text-xs text-slate-500">Distribution across Pending, Settled, and Overdue</p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {statusDistribution.every((s: any) => s.value === 0) ? (
              <div className="text-xs text-slate-400 font-semibold">No customer status data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {statusDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any) => [`${val} Customers`, name]}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Overdue Accounts Highlight List */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-rose-600 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Overdue Accounts
              </h3>
              <p className="text-xs text-slate-500">Customers with pending amounts past their due date</p>
            </div>
          </div>

          <div className="h-64 overflow-y-auto divide-y divide-slate-100">
            {overdueList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 font-bold">
                  ✓
                </div>
                <p className="text-xs font-bold text-slate-700">No overdue accounts!</p>
                <p className="text-[11px] text-slate-400">All customer dues are on schedule.</p>
              </div>
            ) : (
              overdueList.map((c: any) => (
                <div key={c.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <Link
                      href={`/customers/${c.id}`}
                      className="font-bold text-sm text-slate-900 hover:text-[#EB5E28]"
                    >
                      {c.name}
                    </Link>
                    <div className="text-xs text-rose-600 font-semibold mt-0.5">
                      Due Date was: {formatIndianDate(c.nextDueDate)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-rose-600">
                      {formatINR(c.pendingAmount)}
                    </div>
                    <Link
                      href={`/customers/${c.id}`}
                      className="text-[11px] font-bold text-[#EB5E28] hover:underline"
                    >
                      Open Khata →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
