'use client';

import React, { ReactNode, useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { CustomerModal } from '@/components/customers/CustomerModal';
import { useToast } from '@/components/ui/Toast';

export function AppLayout({ children }: { children: ReactNode }) {
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const { success } = useToast();

  const handleCustomerCreated = () => {
    setIsAddCustomerOpen(false);
    success('Customer created successfully.');
    // Trigger window custom event so pages can re-fetch
    window.dispatchEvent(new CustomEvent('khata-data-updated'));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar onAddCustomerClick={() => setIsAddCustomerOpen(true)} />
      
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-20 lg:pb-8">
          {children}
        </main>
      </div>

      <MobileNav />

      {/* Quick Add Customer Modal accessible from header */}
      <CustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onSuccess={handleCustomerCreated}
      />
    </div>
  );
}
