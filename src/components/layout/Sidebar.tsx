'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Receipt,
  BarChart3,
  FileText,
  Bell,
  Settings,
  Shield,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Transactions', href: '/transactions', icon: Receipt },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Reports', href: '/reports', icon: FileText },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 shrink-0 hidden lg:flex flex-col justify-between p-4 min-h-[calc(100vh-61px)]">
      <div className="space-y-6">
        {/* Navigation Items */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[#EB5E28] text-white shadow-sm shadow-[#EB5E28]/30 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Card */}
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <Shield className="w-3.5 h-3.5 text-[#EB5E28]" />
          <span>Private Single Owner</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Secured & encrypted ledger synced across up to 3 authorized devices.
        </p>
      </div>
    </aside>
  );
}
