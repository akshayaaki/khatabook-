import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { readStore, writeStore } from '@/lib/db';
import { Deadline, NotificationItem } from '@/lib/types';
import { formatIndianDate } from '@/lib/formatters';

export async function POST(req: NextRequest) {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { customerId, dueDate, notes } = body;

    if (!customerId || !dueDate) {
      return NextResponse.json({ error: 'Customer ID and Due Date are required.' }, { status: 400 });
    }

    const store = readStore();
    const customer = store.customers.find((c) => c.id === customerId && !c.isDeleted);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
    }

    // Check if customer already has a deadline, update it or create new
    const existingIndex = store.deadlines.findIndex((d) => d.customerId === customerId && !d.isCompleted);
    let deadline: Deadline;

    if (existingIndex !== -1) {
      store.deadlines[existingIndex].dueDate = dueDate;
      if (notes !== undefined) store.deadlines[existingIndex].notes = notes ? notes.trim() : null;
      store.deadlines[existingIndex].updatedAt = new Date().toISOString();
      deadline = store.deadlines[existingIndex];
    } else {
      deadline = {
        id: `dl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        customerId,
        dueDate,
        notes: notes ? notes.trim() : null,
        isCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.deadlines.push(deadline);
    }

    // Create Notification
    const notif: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      type: 'PAYMENT_DUE',
      title: 'Due Date Scheduled',
      message: `Repayment deadline for ${customer.name} set to ${formatIndianDate(dueDate)}.`,
      customerId: customer.id,
      customerName: customer.name,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    store.notifications.unshift(notif);

    writeStore(store);

    return NextResponse.json({
      success: true,
      message: 'Due date saved successfully.',
      deadline,
    });
  } catch (err) {
    console.error('Save deadline error:', err);
    return NextResponse.json({ error: 'Failed to save due date' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const deadlineId = searchParams.get('deadlineId');

    if (!customerId && !deadlineId) {
      return NextResponse.json({ error: 'CustomerId or deadlineId required' }, { status: 400 });
    }

    const store = readStore();
    if (deadlineId) {
      store.deadlines = store.deadlines.filter((d) => d.id !== deadlineId);
    } else if (customerId) {
      store.deadlines = store.deadlines.filter((d) => d.customerId !== customerId);
    }
    writeStore(store);

    return NextResponse.json({ success: true, message: 'Deadline removed successfully.' });
  } catch (err) {
    console.error('Delete deadline error:', err);
    return NextResponse.json({ error: 'Failed to remove deadline' }, { status: 500 });
  }
}
