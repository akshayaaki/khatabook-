'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { CustomerDetail } from '@/components/customers/CustomerDetail';

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  return (
    <AppLayout>
      <CustomerDetail customerId={customerId} />
    </AppLayout>
  );
}
