'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Customer, Transaction, Deadline, TransactionType, CustomerStatus } from '@/lib/types';
import { formatINR, formatIndianDate, formatIndianTime } from '@/lib/formatters';
import { getWhatsAppSummaryUrl, getWhatsAppReminderUrl } from '@/lib/whatsapp';
import { generateCustomerStatementPDF, generateSettlementReceiptPDF } from '@/lib/reports';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Share2,
  Send,
  FileDown,
  Edit2,
  Archive,
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  Banknote,
  MoreVertical,
  CheckCheck,
} from 'lucide-react';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import { CustomerModal } from './CustomerModal';
import { DeadlineModal } from './DeadlineModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

interface CustomerDetailProps {
  customerId: string;
}

export function CustomerDetail({ customerId }: CustomerDetailProps) {
  const router = useRouter();
  const { success, error } = useToast();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deadline, setDeadline] = useState<Deadline | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txInitialType, setTxInitialType] = useState<TransactionType>('GAVE');
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);

  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false);

  // Confirm delete transaction / customer
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

  const fetchCustomerData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
        setTransactions(data.transactions || []);
        setDeadline(data.deadline || null);
      } else {
        error('Customer not found.');
        router.push('/customers');
      }
    } catch {
      error('Failed to load customer details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchCustomerData();
    }
  }, [customerId]);

  const handleOpenTransaction = (type: TransactionType) => {
    setTxToEdit(null);
    setTxInitialType(type);
    setIsTxModalOpen(true);
  };

  const handleEditTransaction = (tx: Transaction) => {
    setTxToEdit(tx);
    setIsTxModalOpen(true);
  };

  const handleDeleteTransaction = (tx: Transaction) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Transaction?',
      message: `Delete this ${tx.type === 'GAVE' ? 'Given' : 'Received'} payment of ${formatINR(
        tx.amount
      )} recorded on ${formatIndianDate(tx.date)}?`,
      confirmText: 'Delete Transaction',
      action: async () => {
        const res = await fetch(`/api/transactions/${tx.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
          success('Transaction deleted.');
          fetchCustomerData();
        } else {
          error(data.error || 'Failed to delete transaction.');
        }
      },
    });
  };

  const handleDeleteCustomer = () => {
    if (!customer) return;
    setConfirmDialog({
      isOpen: true,
      title: `Delete ${customer.name}?`,
      message:
        'Are you sure you want to delete this customer? Historical transactions will remain preserved for your ledger statements.',
      confirmText: 'Delete Customer',
      action: async () => {
        const res = await fetch(`/api/customers/${customer.id}?action=delete`, { method: 'DELETE' });
        if (res.ok) {
          success('Customer deleted.');
          router.push('/customers');
        }
      },
    });
  };

  const handleDownloadPDF = () => {
    if (!customer) return;
    const doc = generateCustomerStatementPDF({
      customer,
      transactions,
      dateRangeLabel: 'All Time Statement',
    });
    doc.save(`Personal_Khata_${customer.name.replace(/\s+/g, '_')}_Statement.pdf`);
    success('Customer statement PDF downloaded.');
  };

  const handleDownloadSettlementReceipt = () => {
    if (!customer) return;
    const doc = generateSettlementReceiptPDF({ customer });
    doc.save(`Personal_Khata_${customer.name.replace(/\s+/g, '_')}_Settlement_Receipt.pdf`);
    success('Settlement receipt downloaded.');
  };

  const handleWhatsAppShare = () => {
    if (!customer) return;
    const url = getWhatsAppSummaryUrl(customer);
    window.open(url, '_blank');
  };

  const handleSendReminder = () => {
    if (!customer) return;
    const url = getWhatsAppReminderUrl(customer);
    window.open(url, '_blank');
  };

  if (isLoading || !customer) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded-md" />
        <div className="h-44 bg-slate-200 rounded-2xl" />
        <div className="h-96 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  const isSettled = (customer.pendingAmount || 0) === 0 && (customer.totalGiven || 0) > 0;

  return (
    <div className="space-y-6">
      {/* Top Bar: Back & Profile Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3 py-2 rounded-xl border border-slate-200/80 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditCustomerOpen(true)}
            className="p-2 text-slate-600 hover:bg-white rounded-xl border border-slate-200/80 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Edit Customer</span>
          </button>

          <button
            onClick={handleDeleteCustomer}
            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {/* Customer Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{customer.name}</h1>
              {customer.status === 'OVERDUE' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-500" /> OVERDUE
                </span>
              )}
              {isSettled && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-600" /> SETTLED
                </span>
              )}
              {customer.status === 'PENDING' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#EB5E28]" /> PENDING
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-semibold mt-1">
              <span>📞 {customer.phone}</span>
              {customer.email && <span>• ✉️ {customer.email}</span>}
              <span>• Added: {formatIndianDate(customer.createdAt)}</span>
            </div>

            {customer.notes && (
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl mt-3 max-w-xl">
                <span className="font-bold text-slate-700">Note:</span> {customer.notes}
              </p>
            )}

            {/* Custom Fields */}
            {Array.isArray(customer.customFields) && customer.customFields.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {customer.customFields.map((f, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg"
                  >
                    <span className="text-slate-400">{f.label}:</span> {f.value}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quick Sharing & Reminder Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition inline-flex items-center gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              <span>Share WhatsApp</span>
            </button>

            {(customer.pendingAmount || 0) > 0 && (
              <button
                onClick={handleSendReminder}
                className="px-3.5 py-2 rounded-xl bg-[#EB5E28] hover:bg-[#d64f1d] text-white text-xs font-bold shadow-xs transition inline-flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>Send Reminder</span>
              </button>
            )}

            <button
              onClick={handleDownloadPDF}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition inline-flex items-center gap-1.5"
            >
              <FileDown className="w-4 h-4" />
              <span>Statement PDF</span>
            </button>

            {isSettled && (
              <button
                onClick={handleDownloadSettlementReceipt}
                className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition inline-flex items-center gap-1.5"
              >
                <CheckCheck className="w-4 h-4 text-emerald-600" />
                <span>Settlement Receipt</span>
              </button>
            )}
          </div>
        </div>

        {/* Financial Summary Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Given</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {formatINR(customer.totalGiven || 0)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Total Received
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
              {formatINR(customer.totalReceived || 0)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-orange-50/60 border border-orange-100">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#EB5E28]">
              Pending Balance
            </div>
            <div className="text-xl sm:text-2xl font-black text-[#EB5E28] mt-1">
              {formatINR(customer.pendingAmount || 0)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Due Date</div>
              <div className="text-sm font-black text-slate-800 mt-1">
                {customer.nextDueDate ? formatIndianDate(customer.nextDueDate) : 'No due date set'}
              </div>
            </div>
            <button
              onClick={() => setIsDeadlineModalOpen(true)}
              className="text-[11px] font-bold text-[#EB5E28] hover:underline mt-1 text-left"
            >
              {customer.nextDueDate ? 'Change Due Date' : '+ Set Due Date'}
            </button>
          </div>
        </div>
      </div>

      {/* Primary Financial Action Buttons */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          onClick={() => handleOpenTransaction('GAVE')}
          className="flex items-center justify-center gap-2 sm:gap-3 py-4 sm:py-5 px-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-base sm:text-lg shadow-lg shadow-rose-500/25 transform active:scale-95 transition"
        >
          <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>+ YOU GAVE ₹</span>
        </button>

        <button
          onClick={() => handleOpenTransaction('GOT')}
          className="flex items-center justify-center gap-2 sm:gap-3 py-4 sm:py-5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base sm:text-lg shadow-lg shadow-emerald-600/25 transform active:scale-95 transition"
        >
          <ArrowDownLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>+ YOU GOT ₹</span>
        </button>
      </div>

      {/* Transactions Chronological Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Ledger History & Timeline</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological records with running balance calculation
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {transactions.length} Transactions
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-bold text-slate-700">No transactions recorded yet.</p>
            <p className="text-xs text-slate-400">
              Click &quot;YOU GAVE ₹&quot; or &quot;YOU GOT ₹&quot; above to record the first entry.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => {
              const isGave = tx.type === 'GAVE';
              return (
                <div
                  key={tx.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isGave
                          ? 'bg-rose-50 text-rose-600 border border-rose-100'
                          : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      }`}
                    >
                      {isGave ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                            isGave ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isGave ? 'YOU GAVE' : 'YOU GOT'}
                        </span>

                        <span className="text-base font-black text-slate-900">
                          {formatINR(tx.amount)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1 font-medium">
                        <span>📅 {formatIndianDate(tx.date)}</span>
                        <span>•</span>
                        <span>⏰ {formatIndianTime(tx.time)}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-slate-600 font-semibold">
                          {tx.paymentMethod === 'UPI' ? (
                            <CreditCard className="w-3.5 h-3.5 text-[#EB5E28]" />
                          ) : (
                            <Banknote className="w-3.5 h-3.5 text-slate-500" />
                          )}
                          {tx.paymentMethod}
                        </span>
                      </div>

                      {tx.notes && (
                        <p className="text-xs text-slate-600 italic mt-1 bg-slate-50 px-2.5 py-1 rounded-lg">
                          &quot;{tx.notes}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Running Balance & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Running Balance</div>
                      <div className="text-sm font-black text-slate-800">
                        {formatINR(tx.runningBalance ?? 0)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditTransaction(tx)}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        title="Edit Transaction"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTransaction(tx)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete Transaction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        customer={customer}
        initialType={txInitialType}
        transactionToEdit={txToEdit}
        onSuccess={() => {
          setIsTxModalOpen(false);
          fetchCustomerData();
        }}
      />

      {/* Edit Customer Modal */}
      <CustomerModal
        isOpen={isEditCustomerOpen}
        onClose={() => setIsEditCustomerOpen(false)}
        customerToEdit={customer}
        onSuccess={() => {
          setIsEditCustomerOpen(false);
          fetchCustomerData();
        }}
      />

      {/* Set Deadline Modal */}
      <DeadlineModal
        isOpen={isDeadlineModalOpen}
        onClose={() => setIsDeadlineModalOpen(false)}
        customer={customer}
        existingDeadline={deadline}
        onSuccess={() => fetchCustomerData()}
      />

      {/* Confirm Dialog */}
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
