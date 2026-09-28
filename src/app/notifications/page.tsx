'use client';

import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { NotificationsView } from '@/components/notifications/NotificationsView';

export default function NotificationsPage() {
  return (
    <AppLayout>
      <NotificationsView />
    </AppLayout>
  );
}
