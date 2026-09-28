import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { readStore, writeStore } from '@/lib/db';
import { getTodayDateString } from '@/lib/formatters';

export async function GET(req: NextRequest) {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const store = readStore();
    const today = getTodayDateString();

    // Auto-check for newly overdue customers and generate overdue notifications if not already present
    const activeCustomers = store.customers.filter((c) => !c.isDeleted && !c.isArchived);
    for (const customer of activeCustomers) {
      const deadline = store.deadlines.find((d) => d.customerId === customer.id && !d.isCompleted);
      if (deadline && deadline.dueDate < today) {
        // Calculate pending
        const txs = store.transactions.filter((t) => t.customerId === customer.id);
        const given = txs.filter((t) => t.type === 'GAVE').reduce((a, b) => a + b.amount, 0);
        const got = txs.filter((t) => t.type === 'GOT').reduce((a, b) => a + b.amount, 0);
        const pending = Math.round((given - got) * 100) / 100;

        if (pending > 0) {
          const alreadyNotified = store.notifications.some(
            (n) => n.customerId === customer.id && n.type === 'PAYMENT_OVERDUE' && String(n.createdAt).startsWith(today)
          );
          if (!alreadyNotified) {
            store.notifications.unshift({
              id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              type: 'PAYMENT_OVERDUE',
              title: 'Payment Overdue Alert',
              message: `${customer.name}: ₹${pending} payment is overdue. Deadline was ${deadline.dueDate}.`,
              customerId: customer.id,
              customerName: customer.name,
              isRead: false,
              createdAt: new Date().toISOString(),
            });
            writeStore(store);
          }
        }
      }
    }

    const unreadCount = store.notifications.filter((n) => !n.isRead).length;

    return NextResponse.json({
      notifications: store.notifications,
      unreadCount,
    });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, markAllRead } = body;

    const store = readStore();

    if (markAllRead) {
      store.notifications.forEach((n) => (n.isRead = true));
    } else if (id) {
      const notif = store.notifications.find((n) => n.id === id);
      if (notif) notif.isRead = true;
    }

    writeStore(store);

    return NextResponse.json({ success: true, message: 'Notifications updated' });
  } catch (err) {
    console.error('Update notifications error:', err);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clearAll = searchParams.get('all') === 'true';

    const store = readStore();
    if (clearAll) {
      store.notifications = [];
    } else {
      store.notifications = store.notifications.filter((n) => !n.isRead);
    }
    writeStore(store);

    return NextResponse.json({ success: true, message: 'Notifications cleared' });
  } catch (err) {
    console.error('Delete notifications error:', err);
    return NextResponse.json({ error: 'Failed to clear notifications' }, { status: 500 });
  }
}
