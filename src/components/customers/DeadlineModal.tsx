'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Customer, Deadline } from '@/lib/types';
import { getTodayDateString, formatIndianDate } from '@/lib/formatters';
import { Calendar, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface DeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  existingDeadline?: Deadline | null;
  onSuccess: () => void;
}

export function DeadlineModal({
  isOpen,
  onClose,
  customer,
  existingDeadline,
  onSuccess,
}: DeadlineModalProps) {
  const { error, success } = useToast();
  const [dueDate, setDueDate] = useState(getTodayDateString());
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (existingDeadline) {
      setDueDate(existingDeadline.dueDate);
      setNotes(existingDeadline.notes || '');
    } else {
      setDueDate(getTodayDateString());
      setNotes('');
    }
  }, [existingDeadline, isOpen]);

  if (!customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueDate) {
      error('Due Date is required.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          dueDate,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || 'Failed to save due date.');
        setIsLoading(false);
        return;
      }

      success(`Due date set to ${formatIndianDate(dueDate)}.`);
      onSuccess();
      onClose();
    } catch {
      error('Connection error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveDeadline = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/deadlines?customerId=${customer.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        success('Due date removed.');
        onSuccess();
        onClose();
      }
    } catch {
      error('Failed to remove due date.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Set Repayment Due Date"
      subtitle={`Customer: ${customer.name}`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Target Due Date <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:border-[#EB5E28]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Notes <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Promised next month end"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-[#EB5E28]"
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {existingDeadline ? (
            <button
              type="button"
              onClick={handleRemoveDeadline}
              disabled={isLoading}
              className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold flex items-center gap-1 transition"
            >
              <Trash2 className="w-4 h-4" /> Remove
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-xs font-bold text-white bg-[#EB5E28] hover:bg-[#d64f1d] rounded-xl shadow-sm transition"
            >
              {isLoading ? 'Saving...' : 'Save Due Date'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
