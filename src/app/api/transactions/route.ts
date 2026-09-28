import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { readStore, writeStore } from '@/lib/db';
import { calculateCustomerFinancials, validateTransaction } from '@/lib/calculations';
import { formatINR, getTodayDateString, getCurrentTimeString } from '@/lib/formatters';
import { Transaction, NotificationItem, PaymentMethod, TransactionType } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const customerId = searchParams.get('customerId');

    const store = readStore();
    let txs = [...store.transactions];

    if (customerId) {
      txs = txs.filter((t) => t.customerId === customerId);
    }

    // Enrich with customer details
    const enriched = txs.map((t) => {
      const customer = store.customers.find((c) => c.id === t.customerId);
      return {
        ...t,
        customerName: customer ? customer.name : 'Unknown Customer',
        customerPhone: customer ? customer.phone : '',
      };
    });

    // Sort newest first
    enriched.sort((a, b) => {
      const dateComp = (b.date || '').localeCompare(a.date || '');
      if (dateComp !== 0) return dateComp;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({
      transactions: enriched.slice(0, limit),
      totalCount: enriched.length,
    });
  } catch (err) {
    console.error('Fetch transactions error:', err);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { customerId, type, amount, date, time, paymentMethod, notes } = body;

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required.' }, { status: 400 });
    }

    if (type !== 'GAVE' && type !== 'GOT') {
      return NextResponse.json({ error: "Invalid transaction type. Must be 'GAVE' or 'GOT'." }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Please enter a valid amount greater than ₹0.' }, { status: 400 });
    }

    const validPaymentMethod: PaymentMethod = paymentMethod === 'UPI' ? 'UPI' : 'Cash';
    const store = readStore();

    const customer = store.customers.find((c) => c.id === customerId && !c.isDeleted);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
    }

    // Current financials before this transaction
    const existingTxs = store.transactions.filter((t) => t.customerId === customerId);
    const activeDeadline = store.deadlines.find((d) => d.customerId === customerId && !d.isCompleted);
    const currentFinancials = calculateCustomerFinancials(existingTxs, activeDeadline?.dueDate);

    // Negative Balance Protection validation
    const validation = validateTransaction(type as TransactionType, numAmount, currentFinancials.pendingAmount);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const newTransaction: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      customerId,
      type: type as TransactionType,
      amount: Math.round(numAmount * 100) / 100,
      date: date || getTodayDateString(),
      time: time || getCurrentTimeString(),
      paymentMethod: validPaymentMethod,
      notes: notes ? notes.trim() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.transactions.push(newTransaction);

    // Calculate updated financials
    const updatedTxs = [...existingTxs, newTransaction];
    const newFinancials = calculateCustomerFinancials(updatedTxs, activeDeadline?.dueDate);

    // Create In-App Notification
    let notifTitle = '';
    let notifMessage = '';
    let notifType = 'PAYMENT_RECEIVED';

    if (type === 'GAVE') {
      notifType = 'NEW_GIVEN';
      notifTitle = 'Money Given';
      notifMessage = `Recorded ${formatINR(newTransaction.amount)} given to ${customer.name}. New pending: ${formatINR(newFinancials.pendingAmount)}.`;
    } else {
      if (newFinancials.pendingAmount === 0 && newFinancials.totalGiven > 0) {
        notifType = 'SETTLED';
        notifTitle = 'Account Settled';
        notifMessage = `${customer.name} has settled their account in full (${formatINR(newTransaction.amount)} received via ${validPaymentMethod}).`;
      } else {
        notifType = 'PAYMENT_RECEIVED';
        notifTitle = 'Payment Received';
        notifMessage = `Received ${formatINR(newTransaction.amount)} from ${customer.name} via ${validPaymentMethod}. Remaining pending: ${formatINR(newFinancials.pendingAmount)}.`;
      }
    }

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      type: notifType as any,
      title: notifTitle,
      message: notifMessage,
      customerId: customer.id,
      customerName: customer.name,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    store.notifications.unshift(newNotif);
    customer.updatedAt = new Date().toISOString();
    writeStore(store);

    return NextResponse.json({
      success: true,
      message: 'Transaction saved successfully.',
      transaction: newTransaction,
      customerFinancials: newFinancials,
    });
  } catch (err) {
    console.error('Create transaction error:', err);
    return NextResponse.json({ error: 'Failed to record transaction' }, { status: 500 });
  }
}
