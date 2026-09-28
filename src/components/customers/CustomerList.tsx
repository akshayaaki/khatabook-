'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Customer, CustomerStatus } from '@/lib/types';
import { formatINR, formatIndianDate } from '@/lib/formatters';
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  Archive,
  Trash2,
  RotateCcw,
  Phone,
  Mail,
} from 'lucide-react';
import { CustomerModal } from './CustomerModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

export function CustomerList() {
  const { success, error } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'settled' | 'overdue' | 'archived'>('all');
  const [sort, setSort] = useState<'name' | 'dueDate' | 'pending' | 'recent'>('name');

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  // Confirm Dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
  });

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const isArchived = filter === 'archived';
      const query = new URLSearchParams({
        search,
        filter: isArchived ? 'all' : filter,
        sort,
        archived: isArchived ? 'true' : 'false',
      });
      const res = await fetch(`/api/customers?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch {
      error('Failed to load customers.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [filter, sort, search]);

  // Listen for global data updates
  useEffect(() => {
    const handleUpdate = () => fetchCustomers();
    window.addEventListener('khata-data-updated', handleUpdate);
    return () => window.removeEventListener('khata-data-updated', handleUpdate);
  }, []);

  const handleArchiveCustomer = (customer: Customer, isRestore: boolean = false) => {
    setConfirmDialog({
      isOpen: true,
      title: isRestore ? `Restore ${customer.name}?` : `Archive ${customer.name}?`,
      message: isRestore
        ? `This customer will be returned to the active customers list.`
        : `Archived customers are hidden from the active list. All ledger transactions will be safely preserved.`,
      confirmText: isRestore ? 'Restore Customer' : 'Archive Customer',
      action: async () => {
        const res = await fetch(
          `/api/customers/${customer.id}?action=${isRestore ? 'restore' : 'archive'}`,
          { method: 'DELETE' }
        );
        if (res.ok) {
          success(isRestore ? 'Customer restored.' : 'Customer archived.');
          fetchCustomers();
        }
      },
    });
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete ${customer.name}?`,
      message: `Are you sure you want to delete this customer? All historical transactions will remain preserved for your financial records.`,
      confirmText: 'Delete Customer',
      action: async () => {
        const res = await fetch(`/api/customers/${customer.id}?action=delete`, {
          method: 'DELETE',
        });
        if (res.ok) {
          success('Customer deleted. Historical records preserved.');
          fetchCustomers();
        }
      },
    });
  };

  const getStatusBadge = (status?: CustomerStatus) => {
    switch (status) {
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-500" /> OVERDUE
          </span>
        );
      case 'SETTLED':
      case 'NO_OUTSTANDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600" /> SETTLED
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
            <Clock className="w-3 h-3 text-[#EB5E28]" /> PENDING
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Customer Khatas</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your customers, track individual ledgers, and monitor pending balances
          </p>
        </div>

        <button
          onClick={() => {
            setCustomerToEdit(null);
            setIsAddOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#EB5E28] hover:bg-[#d64f1d] text-white text-sm font-bold rounded-xl shadow-md shadow-[#EB5E28]/25 transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Customer</span>
        </button>
      </div>

      {/* Controls: Search, Filter Tabs, Sort */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, phone, email, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#EB5E28] transition"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-600">Sort:</span>
            <select
              value={sort}
              onChange={(e: any) => setSort(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#EB5E28]"
            >
              <option value="name">Customer Name (A-Z)</option>
              <option value="pending">Highest Pending Amount</option>
              <option value="dueDate">Upcoming Due Date</option>
              <option value="recent">Recently Active</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100">
          {[
            { key: 'all', label: 'All Customers' },
            { key: 'pending', label: 'Pending Dues' },
            { key: 'settled', label: 'Settled (₹0)' },
            { key: 'overdue', label: 'Overdue' },
            { key: 'archived', label: 'Archived' },
          ].map((tab) => {
            const isActive = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100/70 text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Customer List Table & Cards */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center animate-pulse">
          <div className="h-6 w-48 bg-slate-200 mx-auto rounded-md mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl" />
            ))}
          </div>
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#EB5E28] mx-auto flex items-center justify-center font-bold text-xl">
            ₹
          </div>
          <h3 className="text-base font-bold text-slate-900">No customers found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search
              ? 'No matching customer found with your search query.'
              : filter === 'archived'
              ? 'No archived customers.'
              : 'Add your first customer to begin recording transactions and managing credit.'}
          </p>
          {!search && filter !== 'archived' && (
            <button
              onClick={() => {
                setCustomerToEdit(null);
                setIsAddOpen(true);
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#EB5E28] hover:bg-[#d64f1d] text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Customer</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-5">Customer</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-right">Given (₹)</th>
                  <th className="py-3 px-4 text-right">Received (₹)</th>
                  <th className="py-3 px-4 text-right">Pending (₹)</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 px-5">
                      <Link
                        href={`/customers/${c.id}`}
                        className="font-bold text-slate-900 hover:text-[#EB5E28] block"
                      >
                        {c.name}
                      </Link>
                      {c.notes && (
                        <span className="text-[11px] text-slate-400 truncate block max-w-xs">
                          {c.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-xs">
                      <div className="font-semibold text-slate-700">{c.phone}</div>
                      {c.email && <div className="text-slate-400 text-[11px]">{c.email}</div>}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-slate-800">
                      {formatINR(c.totalGiven || 0)}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-emerald-600">
                      {formatINR(c.totalReceived || 0)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span
                        className={`font-black text-sm ${
                          (c.pendingAmount || 0) > 0 ? 'text-[#EB5E28]' : 'text-slate-500'
                        }`}
                      >
                        {formatINR(c.pendingAmount || 0)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs font-semibold text-slate-600">
                      {c.nextDueDate ? formatIndianDate(c.nextDueDate) : '—'}
                    </td>
                    <td className="py-4 px-4">{getStatusBadge(c.status)}</td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/customers/${c.id}`}
                          className="px-3 py-1.5 bg-[#EB5E28] hover:bg-[#d64f1d] text-white text-xs font-bold rounded-lg transition inline-flex items-center gap-1 shadow-2xs"
                        >
                          <span>Open Khata</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>

                        {filter === 'archived' ? (
                          <button
                            onClick={() => handleArchiveCustomer(c, true)}
                            title="Restore Customer"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchiveCustomer(c, false)}
                            title="Archive Customer"
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteCustomer(c)}
                          title="Delete Customer"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100">
            {customers.map((c) => (
              <div key={c.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/customers/${c.id}`}
                      className="font-bold text-base text-slate-900 hover:text-[#EB5E28]"
                    >
                      {c.name}
                    </Link>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{c.phone}</span>
                      {c.nextDueDate && <span>• Due: {formatIndianDate(c.nextDueDate)}</span>}
                    </div>
                  </div>
                  {getStatusBadge(c.status)}
                </div>

                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 text-center">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Given</div>
                    <div className="text-xs font-bold text-slate-800">{formatINR(c.totalGiven || 0)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Received</div>
                    <div className="text-xs font-bold text-emerald-600">{formatINR(c.totalReceived || 0)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Pending</div>
                    <div className="text-xs font-black text-[#EB5E28]">{formatINR(c.pendingAmount || 0)}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1">
                    {filter === 'archived' ? (
                      <button
                        onClick={() => handleArchiveCustomer(c, true)}
                        className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg"
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => handleArchiveCustomer(c, false)}
                        className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                      >
                        Archive
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteCustomer(c)}
                      className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg"
                    >
                      Delete
                    </button>
                  </div>

                  <Link
                    href={`/customers/${c.id}`}
                    className="px-3.5 py-1.5 bg-[#EB5E28] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1"
                  >
                    <span>Open Khata</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      <CustomerModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        customerToEdit={customerToEdit}
        onSuccess={() => {
          setIsAddOpen(false);
          fetchCustomers();
        }}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={async () => {
          await confirmDialog.action();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
      />
    </div>
  );
}
