'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { NotificationItem } from '@/lib/types';
import { formatIndianDate, formatIndianTime } from '@/lib/formatters';
import { Bell, CheckCheck, Trash2, Clock, AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export function NotificationsView() {
  const { success, error } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      error('Failed to load notifications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        success('All notifications marked as read.');
      }
    } catch {
      error('Failed to update notifications.');
    }
  };

  const handleClearAll = async () => {
    try {
      const res = await fetch('/api/notifications?all=true', { method: 'DELETE' });
      if (res.ok) {
        setNotifications([]);
        setUnreadCount(0);
        success('Notification center cleared.');
      }
    } catch {
      error('Failed to clear notifications.');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT_OVERDUE':
        return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'SETTLED':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'PAYMENT_RECEIVED':
        return <ArrowDownLeft className="w-5 h-5 text-emerald-600" />;
      case 'NEW_GIVEN':
        return <ArrowUpRight className="w-5 h-5 text-rose-600" />;
      case 'PAYMENT_DUE':
      default:
        return <Clock className="w-5 h-5 text-[#EB5E28]" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notification Center</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EB5E28] text-white">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time alerts for payment due dates, overdue loans, collections, and settlements
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All Read</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 rounded-2xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No notifications</h3>
          <p className="text-xs text-slate-500">You are all caught up! No active alerts.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition flex items-start gap-3.5 ${
                !n.isRead
                  ? 'bg-white border-[#EB5E28]/30 shadow-xs shadow-[#EB5E28]/5'
                  : 'bg-white/80 border-slate-200/70 hover:bg-white'
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  n.type === 'PAYMENT_OVERDUE'
                    ? 'bg-rose-50'
                    : n.type === 'SETTLED'
                    ? 'bg-emerald-50'
                    : n.type === 'PAYMENT_RECEIVED'
                    ? 'bg-emerald-50'
                    : 'bg-orange-50'
                }`}
              >
                {getIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-slate-900">{n.title}</span>
                  <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                    {formatIndianDate(n.createdAt)} • {formatIndianTime(n.createdAt)}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>

                {n.customerId && (
                  <div className="mt-2">
                    <Link
                      href={`/customers/${n.customerId}`}
                      className="text-xs font-bold text-[#EB5E28] hover:underline inline-flex items-center gap-1"
                    >
                      <span>Open Customer Khata →</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
