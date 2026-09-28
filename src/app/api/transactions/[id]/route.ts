import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { readStore, writeStore } from '@/lib/db';
import { calculateCustomerFinancials } from '@/lib/calculations';
import { PaymentMethod, TransactionType } from '@/lib/types';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { amount, date, time, paymentMethod, notes, type } = body;

    const store = readStore();
    const txIndex = store.transactions.findIndex((t) => t.id === id);
    if (txIndex === -1) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const existingTx = store.transactions[txIndex];
    const customerId = existingTx.customerId;

    // Build simulated updated transactions list to verify validity
    const updatedTx = { ...existingTx };
    if (amount !== undefined) {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json({ error: 'Please enter a valid amount greater than ₹0.' }, { status: 400 });
      }
      updatedTx.amount = Math.round(numAmount * 100) / 100;
    }
    if (type !== undefined) {
      if (type !== 'GAVE' && type !== 'GOT') {
        return NextResponse.json({ error: "Invalid type. Must be 'GAVE' or 'GOT'." }, { status: 400 });
      }
      updatedTx.type = type as TransactionType;
    }
    if (date !== undefined) updatedTx.date = date;
    if (time !== undefined) updatedTx.time = time;
    if (paymentMethod !== undefined) updatedTx.paymentMethod = paymentMethod as PaymentMethod;
    if (notes !== undefined) updatedTx.notes = notes ? notes.trim() : null;
    updatedTx.updatedAt = new Date().toISOString();

    // Verify simulated financials don't violate negative pending balance
    const simulatedTxs = store.transactions.map((t) => (t.id === id ? updatedTx : t)).filter((t) => t.customerId === customerId);
    let totalGiven = 0;
    let totalReceived = 0;
    for (const t of simulatedTxs) {
      if (t.type === 'GAVE') totalGiven += t.amount;
      if (t.type === 'GOT') totalReceived += t.amount;
    }
    if (Math.round((totalGiven - totalReceived) * 100) / 100 < 0) {
      return NextResponse.json(
        { error: 'Editing this transaction would cause customer pending amount to become negative. Operation rejected.' },
        { status: 400 }
      );
    }

    store.transactions[txIndex] = updatedTx;
    writeStore(store);

    return NextResponse.json({
      success: true,
      message: 'Transaction updated successfully.',
      transaction: updatedTx,
    });
  } catch (err) {
    console.error('Update transaction error:', err);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const store = readStore();
    const txIndex = store.transactions.findIndex((t) => t.id === id);
    if (txIndex === -1) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const txToDelete = store.transactions[txIndex];
    const customerId = txToDelete.customerId;

    // Verify deletion doesn't cause customer pending balance to become negative
    const simulatedTxs = store.transactions.filter((t) => t.id !== id && t.customerId === customerId);
    let totalGiven = 0;
    let totalReceived = 0;
    for (const t of simulatedTxs) {
      if (t.type === 'GAVE') totalGiven += t.amount;
      if (t.type === 'GOT') totalReceived += t.amount;
    }
    if (Math.round((totalGiven - totalReceived) * 100) / 100 < 0) {
      return NextResponse.json(
        { error: 'Deleting this transaction would make customer pending amount negative. Please adjust repayments first.' },
        { status: 400 }
      );
    }

    store.transactions.splice(txIndex, 1);
    writeStore(store);

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully.',
    });
  } catch (err) {
    console.error('Delete transaction error:', err);
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}
