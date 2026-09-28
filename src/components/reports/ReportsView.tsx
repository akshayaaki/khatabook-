'use client';

import React, { useState, useEffect } from 'react';
import { Customer, Transaction, DashboardSummary } from '@/lib/types';
import { formatINR, formatIndianDate, formatIndianTime, getTodayDateString, getCurrentTimeString } from '@/lib/formatters';
import {
  generateCustomerStatementPDF,
  generateOverallReportPDF,
  generateSettlementReceiptPDF,
} from '@/lib/reports';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  CheckCircle,
  AlertTriangle,
  Clock,
  User,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export function ReportsView() {
  const { success, error } = useToast();

  const [reportType, setReportType] = useState<
    'individual' | 'all' | 'pending' | 'settled' | 'overdue' | 'transactions' | 'settlement_receipt'
  >('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [custRes, txRes, anaRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/transactions?limit=200'),
        fetch('/api/analytics'),
      ]);

      if (custRes.ok) {
        const d = await custRes.json();
        setCustomers(d.customers || []);
        if (d.customers?.length > 0 && !selectedCustomerId) {
          setSelectedCustomerId(d.customers[0].id);
        }
      }
      if (txRes.ok) {
        const d = await txRes.json();
        setTransactions(d.transactions || []);
      }
      if (anaRes.ok) {
        const d = await anaRes.json();
        setSummary(d.summary || null);
      }
    } catch {
      error('Failed to load reporting data.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const getFilteredCustomers = () => {
    switch (reportType) {
      case 'pending':
        return customers.filter((c) => c.status === 'PENDING');
      case 'settled':
        return customers.filter((c) => c.status === 'SETTLED' || c.status === 'NO_OUTSTANDING');
      case 'overdue':
        return customers.filter((c) => c.status === 'OVERDUE');
      default:
        return customers;
    }
  };

  const handleDownloadPDF = async () => {
    try {
      if (reportType === 'individual') {
        if (!selectedCustomer) {
          error('Please select a customer first.');
          return;
        }
        // Fetch detailed customer data
        const res = await fetch(`/api/customers/${selectedCustomer.id}`);
        const data = await res.json();
        const doc = generateCustomerStatementPDF({
          customer: data.customer,
          transactions: data.transactions || [],
          dateRangeLabel: dateRange.toUpperCase().replace('_', ' '),
        });
        doc.save(`Personal_Khata_${selectedCustomer.name.replace(/\s+/g, '_')}_Statement.pdf`);
        success('Customer statement downloaded successfully.');
      } else if (reportType === 'settlement_receipt') {
        if (!selectedCustomer) {
          error('Please select a customer first.');
          return;
        }
        const doc = generateSettlementReceiptPDF({ customer: selectedCustomer });
        doc.save(`Personal_Khata_${selectedCustomer.name.replace(/\s+/g, '_')}_Settlement_Receipt.pdf`);
        success('Settlement receipt downloaded successfully.');
      } else {
        const filtered = getFilteredCustomers();
        const doc = generateOverallReportPDF({
          summary: summary || {
            totalCustomers: customers.length,
            activeCustomers: customers.length,
            pendingCustomers: customers.filter((c) => c.status === 'PENDING').length,
            settledCustomers: customers.filter((c) => c.status === 'SETTLED').length,
            overdueCustomers: customers.filter((c) => c.status === 'OVERDUE').length,
            totalGiven: customers.reduce((a, b) => a + (b.totalGiven || 0), 0),
            totalReceived: customers.reduce((a, b) => a + (b.totalReceived || 0), 0),
            totalPending: customers.reduce((a, b) => a + (b.pendingAmount || 0), 0),
          },
          customers: filtered,
          title:
            reportType === 'pending'
              ? 'Pending Dues Report'
              : reportType === 'settled'
              ? 'Settled Accounts Report'
              : reportType === 'overdue'
              ? 'Overdue Accounts Report'
              : 'Overall Customer Khata Report',
          dateRangeLabel: dateRange.toUpperCase().replace('_', ' '),
        });
        doc.save(`Personal_Khata_${reportType}_Report.pdf`);
        success('Report PDF downloaded successfully.');
      }
    } catch {
      error('Failed to generate PDF report.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const displayCustomers = getFilteredCustomers();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Financial Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Download professional PDFs or print customer account statements & overall reports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-[#EB5E28] hover:bg-[#d64f1d] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-[#EB5E28]/20 transition"
          >
            <Download className="w-4 h-4" />
            <span>Generate & Download PDF</span>
          </button>
        </div>
      </div>

      {/* Report Configuration Controls (Hidden during print) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Report Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e: any) => setReportType(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#EB5E28]"
            >
              <option value="all">Overall Khata Report (All Customers)</option>
              <option value="individual">Individual Customer Statement</option>
              <option value="pending">Pending Dues Report</option>
              <option value="settled">Settled Accounts Report</option>
              <option value="overdue">Overdue Accounts Report</option>
              <option value="settlement_receipt">Settlement Receipt</option>
            </select>
          </div>

          {/* Customer Selector (for Individual / Settlement Receipt) */}
          {(reportType === 'individual' || reportType === 'settlement_receipt') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Customer
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#EB5E28]"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) - {formatINR(c.pendingAmount || 0)} pending
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range Preset */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#EB5E28]"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Report Preview Document */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6 print:border-0 print:p-0">
        {/* Printable Header Banner */}
        <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
          <div>
            <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              PERSONAL KHATA
            </div>
            <div className="text-xs font-bold text-[#EB5E28] uppercase tracking-wider mt-0.5">
              {reportType === 'individual'
                ? `Customer Statement — ${selectedCustomer?.name}`
                : reportType === 'settlement_receipt'
                ? `Official Settlement Receipt`
                : `Financial Summary Report`}
            </div>
          </div>
          <div className="text-left sm:text-right text-xs text-slate-500 font-semibold">
            <div>Generated: {formatIndianDate(getTodayDateString())}</div>
            <div>Time: {getCurrentTimeString()}</div>
            <div>Filter: {dateRange.toUpperCase().replace('_', ' ')}</div>
          </div>
        </div>

        {/* Individual Statement View */}
        {reportType === 'individual' && selectedCustomer && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">{selectedCustomer.name}</h3>
                <div className="text-xs text-slate-600 mt-1">Phone: {selectedCustomer.phone}</div>
                {selectedCustomer.email && (
                  <div className="text-xs text-slate-600">Email: {selectedCustomer.email}</div>
                )}
                {selectedCustomer.notes && (
                  <div className="text-xs text-slate-500 italic mt-1">&quot;{selectedCustomer.notes}&quot;</div>
                )}
              </div>

              <div className="text-left sm:text-right space-y-1">
                <div className="text-xs text-slate-500">
                  Total Given: <span className="font-bold text-slate-900">{formatINR(selectedCustomer.totalGiven || 0)}</span>
                </div>
                <div className="text-xs text-slate-500">
                  Total Received: <span className="font-bold text-emerald-600">{formatINR(selectedCustomer.totalReceived || 0)}</span>
                </div>
                <div className="text-sm font-black text-[#EB5E28]">
                  Pending Balance: {formatINR(selectedCustomer.pendingAmount || 0)}
                </div>
                <div className="text-xs font-bold text-slate-600">
                  Status: {selectedCustomer.status}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-sm text-slate-900">Transaction History</h4>
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 font-bold text-slate-700">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Time</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Method</th>
                    <th className="p-2.5">Notes</th>
                    <th className="p-2.5 text-right">Given (₹)</th>
                    <th className="p-2.5 text-right">Received (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {transactions
                    .filter((t) => t.customerId === selectedCustomer.id)
                    .map((t) => (
                      <tr key={t.id}>
                        <td className="p-2.5 font-medium">{formatIndianDate(t.date)}</td>
                        <td className="p-2.5 text-slate-500">{formatIndianTime(t.time)}</td>
                        <td className="p-2.5 font-bold">
                          {t.type === 'GAVE' ? 'YOU GAVE' : 'YOU GOT'}
                        </td>
                        <td className="p-2.5">{t.paymentMethod}</td>
                        <td className="p-2.5 text-slate-600">{t.notes || '—'}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">
                          {t.type === 'GAVE' ? formatINR(t.amount) : '—'}
                        </td>
                        <td className="p-2.5 text-right font-bold text-emerald-600">
                          {t.type === 'GOT' ? formatINR(t.amount) : '—'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Overall / Filtered Customer Table View */}
        {reportType !== 'individual' && reportType !== 'settlement_receipt' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 font-bold text-slate-700 uppercase">
                  <tr>
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3 text-right">Total Given (₹)</th>
                    <th className="p-3 text-right">Total Received (₹)</th>
                    <th className="p-3 text-right">Pending Amount (₹)</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {displayCustomers.map((c) => (
                    <tr key={c.id}>
                      <td className="p-3 font-bold text-slate-900">{c.name}</td>
                      <td className="p-3 font-medium text-slate-600">{c.phone}</td>
                      <td className="p-3 text-right font-bold text-slate-800">
                        {formatINR(c.totalGiven || 0)}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-600">
                        {formatINR(c.totalReceived || 0)}
                      </td>
                      <td className="p-3 text-right font-black text-[#EB5E28]">
                        {formatINR(c.pendingAmount || 0)}
                      </td>
                      <td className="p-3 font-medium text-slate-600">
                        {c.nextDueDate ? formatIndianDate(c.nextDueDate) : '—'}
                      </td>
                      <td className="p-3 font-bold">{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settlement Receipt Preview */}
        {reportType === 'settlement_receipt' && selectedCustomer && (
          <div className="p-6 border-2 border-slate-300 rounded-xl space-y-4 text-center max-w-lg mx-auto">
            <div className="text-base font-extrabold text-emerald-700 bg-emerald-50 py-2 rounded-lg">
              ✓ ACCOUNT FULLY SETTLED & CLEARED
            </div>
            <div className="text-sm font-bold text-slate-900">{selectedCustomer.name}</div>
            <div className="text-xs text-slate-500">Phone: {selectedCustomer.phone}</div>
            <div className="text-xs font-semibold text-slate-700 pt-2 border-t border-slate-200">
              Total Borrowed: {formatINR(selectedCustomer.totalGiven || 0)} | Total Repaid:{' '}
              {formatINR(selectedCustomer.totalReceived || selectedCustomer.totalGiven || 0)}
            </div>
            <div className="text-lg font-black text-emerald-600">Balance: ₹0.00 (Zero)</div>
          </div>
        )}

        <div className="text-center text-[10px] text-slate-400 pt-4 border-t border-slate-100">
          Personal Khata • Digital Money Ledger • Generated on {formatIndianDate(getTodayDateString())}
        </div>
      </div>
    </div>
  );
}
