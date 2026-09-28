'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { CustomerOverviewTable } from '@/components/dashboard/CustomerOverviewTable';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { Customer, Transaction, DashboardSummary } from '@/lib/types';
import { Plus, Users, ArrowUpRight, ArrowDownLeft, FileText, ArrowRight } from 'lucide-react';
import { CustomerModal } from '@/components/customers/CustomerModal';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const { error } = useToast();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [anaRes, custRes, txRes] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/customers?limit=10'),
        fetch('/api/transactions?limit=10'),
      ]);

      if (anaRes.status === 401 || custRes.status === 401) {
        router.push('/login');
        return;
      }

      if (anaRes.ok) {
        const d = await anaRes.json();
        setSummary(d.summary || null);
      }

      if (custRes.ok) {
        const d = await custRes.json();
        setCustomers(d.customers || []);
      }

      if (txRes.ok) {
        const d = await txRes.json();
        setRecentTransactions(d.transactions || []);
      }
    } catch {
      error('Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Listen for real-time local events
  useEffect(() => {
    const handleUpdate = () => fetchDashboardData();
    window.addEventListener('khata-data-updated', handleUpdate);
    return () => window.removeEventListener('khata-data-updated', handleUpdate);
  }, []);

  const handleOpenKhata = (customer: Customer) => {
    router.push(`/customers/${customer.id}`);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Dashboard Overview
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Welcome back! Here is the latest financial status of your khata accounts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddCustomerOpen(true)}
              className="px-4 py-2.5 bg-[#EB5E28] hover:bg-[#d64f1d] text-white text-xs font-bold rounded-xl shadow-md shadow-[#EB5E28]/25 inline-flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Customer</span>
            </button>
          </div>
        </div>

        {/* Top Summary Cards */}
        <SummaryCards summary={summary} isLoading={isLoading} />

        {/* Two-Column Grid: Customer Overview & Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Customers Table (2 Cols) */}
          <div className="lg:col-span-2">
            <CustomerOverviewTable
              customers={customers}
              isLoading={isLoading}
              onOpenKhata={handleOpenKhata}
            />
          </div>

          {/* Recent Transactions Feed (1 Col) */}
          <div className="lg:col-span-1">
            <RecentTransactions transactions={recentTransactions} isLoading={isLoading} />
          </div>
        </div>
      </div>

      {/* Add Customer Modal */}
      <CustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onSuccess={() => {
          setIsAddCustomerOpen(false);
          fetchDashboardData();
        }}
      />
    </AppLayout>
  );
}
