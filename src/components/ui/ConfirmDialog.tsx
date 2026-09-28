'use client';

import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = true,
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          {isDestructive && (
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          )}
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
        </div>

        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-semibold rounded-xl text-white shadow-sm transition disabled:opacity-50 ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                : 'bg-[#EB5E28] hover:bg-[#d64f1d] shadow-[#EB5E28]/20'
            }`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
