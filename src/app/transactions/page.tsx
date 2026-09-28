'use client';

import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AllTransactionsView } from '@/components/transactions/AllTransactionsView';

export default function TransactionsPage() {
  return (
    <AppLayout>
      <AllTransactionsView />
    </AppLayout>
  );
}
