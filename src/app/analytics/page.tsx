'use client';

import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AnalyticsView } from '@/components/analytics/AnalyticsView';

export default function AnalyticsPage() {
  return (
    <AppLayout>
      <AnalyticsView />
    </AppLayout>
  );
}
