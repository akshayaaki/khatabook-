'use client';

import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ReportsView } from '@/components/reports/ReportsView';

export default function ReportsPage() {
  return (
    <AppLayout>
      <ReportsView />
    </AppLayout>
  );
}
