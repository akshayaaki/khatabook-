'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Search, Bell, Plus, ChevronRight, User, Settings, LogOut, Shield } from 'lucide-react';
import { NotificationItem } from '@/lib/types';
import { formatIndianDate } from '@/lib/formatters';

interface NavbarProps {
  onAddCustomerClick?: () => void;
  onQuickSearchSelect?: (customerId: string) => void;
}

export function Navbar({ onAddCustomerClick }: NavbarProps) {
  const router = useRouter();
  const { user, ownerUser, loading, signOutUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifsDropdown, setShowNotifsDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Load notifications
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = () => {
    fetch('/api/notifications')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.notifications) {
          setNotifications(data.notifications.slice(0, 5));
          setUnreadCount(data.unreadCount || 0);
        }
      })
      .catch(() => {});
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifsDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global search debounced
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/customers?search=${encodeURIComponent(searchQuery)}`)
        .then((res) => res.json())
        .then((data) => {
          setSearchResults(data.customers || []);
          setShowSearchDropdown(true);
        })
        .finally(() => setIsSearching(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const markAllNotifsRead = async () => {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleSignOut = async () => {
    setLoggingOut(true);
    setShowUserDropdown(false);
    try {
      await signOutUser();
      router.push('/sign-in');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  const displayName = user?.displayName || ownerUser?.name || 'Khata Owner';
  const email = user?.email || ownerUser?.email || '';
  const initial = displayName ? displayName[0]?.toUpperCase() : 'O';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-[#EB5E28] flex items-center justify-center text-white font-black text-lg shadow-sm shadow-[#EB5E28]/30 group-hover:scale-105 transition">
            ₹
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900 block leading-tight">
              Personal Khata
            </span>
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider hidden sm:block">
              Digital Money Ledger
            </span>
          </div>
        </Link>
      </div>

      {/* Global Search Bar */}
      <div ref={searchRef} className="relative flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search customers by name, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim() && setShowSearchDropdown(true)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-[#EB5E28] focus:ring-2 focus:ring-[#EB5E28]/15 transition"
          />
        </div>

        {/* Search Results Dropdown */}
        {showSearchDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in-50 zoom-in-95">
            <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs text-slate-500 font-medium">
              <span>{isSearching ? 'Searching...' : `Found ${searchResults.length} results`}</span>
              <span className="text-[10px]">Press Esc to close</span>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500">No customers found</div>
              ) : (
                searchResults.map((cust) => (
                  <button
                    key={cust.id}
                    onClick={() => {
                      setShowSearchDropdown(false);
                      setSearchQuery('');
                      router.push(`/customers/${cust.id}`);
                    }}
                    className="w-full text-left p-3 hover:bg-slate-50 flex items-center justify-between gap-3 transition cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-sm text-slate-900">{cust.name}</div>
                      <div className="text-xs text-slate-500">{cust.phone}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-bold ${cust.pendingAmount > 0 ? 'text-[#EB5E28]' : 'text-emerald-600'}`}>
                        {cust.pendingAmount > 0 ? `₹${cust.pendingAmount}` : 'Settled'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">{cust.status}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Icons & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onAddCustomerClick && (
          <button
            onClick={onAddCustomerClick}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#EB5E28] hover:bg-[#d64f1d] text-white text-xs font-bold rounded-xl shadow-sm shadow-[#EB5E28]/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        )}

        {/* Notifications Bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifsDropdown(!showNotifsDropdown)}
            className="relative p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-[#EB5E28] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifsDropdown && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in-50 zoom-in-95">
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-xs px-2 py-0.5 bg-[#EB5E28]/10 text-[#EB5E28] font-bold rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotifsRead}
                    className="text-xs font-semibold text-[#EB5E28] hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-400">No notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3.5 text-xs transition ${
                        !n.isRead ? 'bg-orange-50/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900">{n.title}</span>
                        <span className="text-[10px] text-slate-400">
                          {formatIndianDate(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 border-t border-slate-100 bg-slate-50 text-center">
                <Link
                  href="/notifications"
                  onClick={() => setShowNotifsDropdown(false)}
                  className="text-xs font-bold text-[#EB5E28] hover:underline inline-flex items-center gap-1"
                >
                  View all notifications <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Firebase User Profile Menu */}
        <div ref={userMenuRef} className="relative">
          {!loading && (user || ownerUser) ? (
            <div>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-2xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition cursor-pointer"
                aria-label="User menu"
              >
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={displayName}
                    className="w-8 h-8 rounded-xl object-cover ring-2 ring-[#EB5E28]/30"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-[#EB5E28] text-white flex items-center justify-center font-black text-xs shadow-xs">
                    {initial}
                  </div>
                )}
                <span className="text-xs font-bold text-slate-800 hidden md:block max-w-[120px] truncate">
                  {displayName}
                </span>
              </button>

              {/* User Dropdown */}
              {showUserDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in-50 zoom-in-95 divide-y divide-slate-100">
                  <div className="p-4 bg-slate-50/70">
                    <div className="flex items-center gap-3">
                      {user?.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={displayName}
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#EB5E28] flex items-center justify-center font-black text-base">
                          {initial}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {displayName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {email || 'Owner Account'}
                        </div>
                        <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                          <Shield className="w-2.5 h-2.5" /> Firebase Auth
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-1.5 space-y-0.5">
                    <Link
                      href="/settings"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Account & Security</span>
                    </Link>
                  </div>

                  <div className="p-1.5">
                    <button
                      onClick={handleSignOut}
                      disabled={loggingOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer disabled:opacity-50"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/sign-in"
              className="px-3.5 py-1.5 bg-[#EB5E28] hover:bg-[#d64f1d] text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
