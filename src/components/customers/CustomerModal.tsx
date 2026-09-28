'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Customer, CustomField } from '@/lib/types';
import { Plus, Trash2, User, Phone, Mail, FileText, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
  customerToEdit?: Customer | null;
}

export function CustomerModal({
  isOpen,
  onClose,
  onSuccess,
  customerToEdit,
}: CustomerModalProps) {
  const { error } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Field validation errors
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name || '');
      setPhone(customerToEdit.phone || '');
      setEmail(customerToEdit.email || '');
      setNotes(customerToEdit.notes || '');
      setCustomFields(
        Array.isArray(customerToEdit.customFields) ? customerToEdit.customFields : []
      );
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setNotes('');
      setCustomFields([]);
    }
    setNameError('');
    setPhoneError('');
    setEmailError('');
  }, [customerToEdit, isOpen]);

  const handleAddField = () => {
    setCustomFields([...customFields, { label: '', value: '' }]);
  };

  const handleUpdateField = (index: number, key: 'label' | 'value', text: string) => {
    const updated = [...customFields];
    updated[index][key] = text;
    setCustomFields(updated);
  };

  const handleRemoveField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    let isValid = true;
    setNameError('');
    setPhoneError('');
    setEmailError('');

    // Name check
    if (!name.trim()) {
      setNameError('Full name is required.');
      isValid = false;
    } else if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters.');
      isValid = false;
    }

    // Phone check
    const digits = phone.replace(/\D/g, '');
    let normalizedPhone = digits;
    if (digits.length === 11 && digits.startsWith('0')) {
      normalizedPhone = digits.substring(1);
    } else if (digits.length === 12 && digits.startsWith('91')) {
      normalizedPhone = digits.substring(2);
    }

    if (!digits) {
      setPhoneError('Phone number is required.');
      isValid = false;
    } else if (normalizedPhone.length !== 10) {
      setPhoneError('Please enter a valid 10-digit phone number (e.g. 9876543210).');
      isValid = false;
    } else if (!/^[6-9]/.test(normalizedPhone)) {
      setPhoneError('Mobile number must start with 6, 7, 8, or 9.');
      isValid = false;
    }

    // Email check (optional)
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setEmailError('Please enter a valid email address.');
        isValid = false;
      }
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Filter non-empty custom fields
    const validCustomFields = customFields.filter((f) => f.label.trim() && f.value.trim());

    setIsLoading(true);

    try {
      const isEditing = !!customerToEdit;
      const url = isEditing ? `/api/customers/${customerToEdit.id}` : '/api/customers';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          notes: notes.trim() || null,
          customFields: validCustomFields,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || 'Failed to save customer.');
        if (data.error?.toLowerCase().includes('phone')) {
          setPhoneError(data.error);
        }
        setIsLoading(false);
        return;
      }

      onSuccess(data.customer);
      onClose();
    } catch {
      error('Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customerToEdit ? 'Edit Customer' : 'Add New Customer'}
      subtitle="Keep customer contact and khata records organized"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Full Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              required
              placeholder="Enter customer full name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError('');
              }}
              className={`w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm focus:bg-white focus:outline-none transition font-medium ${
                nameError
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                  : 'border-slate-200 focus:border-[#EB5E28] focus:ring-2 focus:ring-[#EB5E28]/15'
              }`}
            />
          </div>
          {nameError && (
            <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {nameError}
            </p>
          )}
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Phone Number <span className="text-rose-500">* (10 Digits)</span>
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="tel"
              required
              maxLength={14}
              placeholder="e.g. 98XXXXXXXX"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (phoneError) setPhoneError('');
              }}
              className={`w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm focus:bg-white focus:outline-none transition font-medium ${
                phoneError
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                  : 'border-slate-200 focus:border-[#EB5E28] focus:ring-2 focus:ring-[#EB5E28]/15'
              }`}
            />
          </div>
          {phoneError && (
            <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {phoneError}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Email Address <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              placeholder="e.g. customer@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              className={`w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm focus:bg-white focus:outline-none transition font-medium ${
                emailError
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                  : 'border-slate-200 focus:border-[#EB5E28] focus:ring-2 focus:ring-[#EB5E28]/15'
              }`}
            />
          </div>
          {emailError && (
            <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {emailError}
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Notes <span className="text-slate-400 font-normal">(Optional, max 500 chars)</span>
          </label>
          <div className="relative">
            <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <textarea
              rows={2}
              maxLength={500}
              placeholder="e.g. Prefers UPI, wholesale customer, shop address..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-[#EB5E28] focus:ring-2 focus:ring-[#EB5E28]/15 transition resize-none font-medium"
            />
          </div>
        </div>

        {/* Custom Fields */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Custom Fields</span>
            <button
              type="button"
              onClick={handleAddField}
              className="text-xs font-bold text-[#EB5E28] hover:text-[#d64f1d] inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Field
            </button>
          </div>

          <div className="space-y-2">
            {customFields.map((field, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Label (e.g. GST/City)"
                  value={field.label}
                  onChange={(e) => handleUpdateField(index, 'label', e.target.value)}
                  className="w-1/3 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#EB5E28]"
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={field.value}
                  onChange={(e) => handleUpdateField(index, 'value', e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#EB5E28]"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveField(index)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-md transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
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
            disabled={isLoading}
            className="px-5 py-2.5 text-sm font-bold text-white bg-[#EB5E28] hover:bg-[#d64f1d] rounded-xl shadow-md shadow-[#EB5E28]/20 transition disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : customerToEdit ? 'Save Changes' : 'Add Customer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
