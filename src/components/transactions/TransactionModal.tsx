'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Customer, Transaction, TransactionType, PaymentMethod } from '@/lib/types';
import { formatINR, getTodayDateString, getCurrentTimeString } from '@/lib/formatters';
import { Calendar, Clock, CreditCard, Banknote, AlertCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  initialType?: TransactionType;
  transactionToEdit?: Transaction | null;
  onSuccess: (tx: Transaction) => void;
}

export function TransactionModal({
  isOpen,
  onClose,
  customer,
  initialType = 'GAVE',
  transactionToEdit,
  onSuccess,
}: TransactionModalProps) {
  const { error, success } = useToast();
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [time, setTime] = useState(getCurrentTimeString());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [amountError, setAmountError] = useState('');

  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setAmount(transactionToEdit.amount.toString());
      setDate(transactionToEdit.date);
      setTime(transactionToEdit.time);
      setPaymentMethod(transactionToEdit.paymentMethod);
      setNotes(transactionToEdit.notes || '');
    } else {
      setType(initialType);
      setAmount('');
      setDate(getTodayDateString());
      setTime(getCurrentTimeString());
      setPaymentMethod('Cash');
      setNotes('');
    }
    setAmountError('');
  }, [transactionToEdit, initialType, isOpen]);

  if (!customer) return null;

  const currentPending = customer.pendingAmount || 0;
  const numAmount = parseFloat(amount) || 0;

  // Real-time Negative Balance Protection check
  let validationWarning = '';
  let isBlocked = false;

  if (type === 'GOT' && !transactionToEdit) {
    if (currentPending <= 0) {
      validationWarning = "This customer has no outstanding balance. You cannot record a 'YOU GOT' payment.";
      isBlocked = true;
    } else if (numAmount > currentPending) {
      validationWarning = `This payment exceeds the customer's pending amount. Maximum amount that can be received: ${formatINR(currentPending)}.`;
      isBlocked = true;
    }
  }

  if (numAmount > 100000000) {
    validationWarning = 'Transaction amount exceeds maximum allowed limit (₹10,00,00,000).';
    isBlocked = true;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAmountError('');

    if (!amount.trim() || isNaN(numAmount) || numAmount <= 0) {
      setAmountError('Please enter a valid amount greater than ₹0.');
      return;
    }

    if (!date) {
      error('Transaction date is required.');
      return;
    }

    if (!time) {
      error('Transaction time is required.');
      return;
    }

    if (isBlocked) {
      error(validationWarning || 'Invalid transaction amount.');
      return;
    }

    setIsLoading(true);

    try {
      const isEditing = !!transactionToEdit;
      const url = isEditing ? `/api/transactions/${transactionToEdit.id}` : '/api/transactions';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          type,
          amount: Math.round(numAmount * 100) / 100,
          date,
          time,
          paymentMethod,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || 'Failed to record transaction.');
        setIsLoading(false);
        return;
      }

      success(
        isEditing
          ? 'Transaction updated successfully.'
          : type === 'GAVE'
          ? `Recorded ${formatINR(numAmount)} given to ${customer.name}.`
          : `Recorded ${formatINR(numAmount)} received from ${customer.name}.`
      );

      onSuccess(data.transaction);
      onClose();
    } catch {
      error('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={transactionToEdit ? 'Edit Transaction' : customer.name}
      subtitle={
        transactionToEdit
          ? `Updating transaction for ${customer.name}`
          : `Current Pending Balance: ${formatINR(currentPending)}`
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Big Switch: YOU GAVE vs YOU GOT */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setType('GAVE');
              setAmountError('');
            }}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              type === 'GAVE'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>YOU GAVE ₹</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setType('GOT');
              setAmountError('');
            }}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              type === 'GOT'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>YOU GOT ₹</span>
          </button>
        </div>

        {/* Large Amount Field with ₹ symbol */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Amount (₹) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400 pointer-events-none">
              ₹
            </span>
            <input
              type="number"
              step="any"
              min="0.01"
              max="100000000"
              inputMode="decimal"
              autoFocus
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (amountError) setAmountError('');
              }}
              className={`w-full pl-10 pr-4 py-3 text-2xl font-black rounded-2xl border transition focus:outline-none focus:ring-4 ${
                amountError || isBlocked
                  ? 'border-rose-300 text-rose-600 focus:border-rose-400 focus:ring-rose-100 bg-rose-50/20'
                  : type === 'GAVE'
                  ? 'border-rose-200 text-rose-600 focus:border-rose-400 focus:ring-rose-100 bg-rose-50/20'
                  : 'border-emerald-200 text-emerald-600 focus:border-emerald-400 focus:ring-emerald-100 bg-emerald-50/20'
              }`}
            />
          </div>

          {amountError && (
            <p className="text-[11px] text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {amountError}
            </p>
          )}

          {/* Negative Balance Warning Alert */}
          {validationWarning && (
            <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{validationWarning}</span>
            </div>
          )}
        </div>

        {/* Date & Time Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-[#EB5E28]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Time <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="e.g. 08:30 PM"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-[#EB5E28]"
              />
            </div>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Payment Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('Cash')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition ${
                paymentMethod === 'Cash'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span>Cash</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('UPI')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition ${
                paymentMethod === 'UPI'
                  ? 'bg-[#EB5E28] text-white border-[#EB5E28] shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>UPI / Online</span>
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Note <span className="text-slate-400 font-normal">(Optional, max 300 chars)</span>
          </label>
          <input
            type="text"
            maxLength={300}
            placeholder="e.g. Stock advance, partial settlement via PhonePe..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-[#EB5E28] transition font-medium"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || isBlocked}
            className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-md transition disabled:opacity-50 ${
              type === 'GAVE'
                ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/25'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
            }`}
          >
            {isLoading ? 'Saving...' : 'SAVE TRANSACTION'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
