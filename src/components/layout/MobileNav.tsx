'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Receipt, BarChart3, FileText, Settings } from 'lucide-react';

const MOBILE_NAV_ITEMS = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Khata', href: '/customers', icon: Users },
  { label: 'Txns', href: '/transactions', icon: Receipt },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Reports', href: '/reports', icon: FileText },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 py-1.5 flex items-center justify-around shadow-lg">
      {MOBILE_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname?.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
              isActive
                ? 'text-[#EB5E28] font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <div className={`p-1 rounded-lg ${isActive ? 'bg-[#EB5E28]/10' : ''}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-[9px] mt-0.5">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
