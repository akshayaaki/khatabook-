import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { readStore, writeStore } from '@/lib/db';
import { calculateCustomerFinancials, calculateRunningBalances } from '@/lib/calculations';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeAndValidatePhone(phone: string): { valid: boolean; normalized: string; error?: string } {
  const digits = phone.replace(/\D/g, '');
  let tenDigitPhone = '';
  if (digits.length === 10) {
    tenDigitPhone = digits;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    tenDigitPhone = digits.substring(1);
  } else if (digits.length === 12 && digits.startsWith('91')) {
    tenDigitPhone = digits.substring(2);
  } else {
    return {
      valid: false,
      normalized: '',
      error: 'Please enter a valid 10-digit mobile number.',
    };
  }

  if (!/^[6-9]/.test(tenDigitPhone)) {
    return {
      valid: false,
      normalized: tenDigitPhone,
      error: 'Mobile number must start with 6, 7, 8, or 9.',
    };
  }

  return { valid: true, normalized: tenDigitPhone };
}

export async function GET(
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

    const customer = store.customers.find((c) => c.id === id && !c.isDeleted);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customerTransactions = store.transactions.filter((t) => t.customerId === id);
    const activeDeadline = store.deadlines
      .filter((d) => d.customerId === id && !d.isCompleted)
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))[0];

    const financials = calculateCustomerFinancials(
      customerTransactions,
      activeDeadline?.dueDate || null
    );

    // Calculate running balance timeline
    const timelineTransactions = calculateRunningBalances(customerTransactions);

    return NextResponse.json({
      customer: {
        ...customer,
        totalGiven: financials.totalGiven,
        totalReceived: financials.totalReceived,
        pendingAmount: financials.pendingAmount,
        status: financials.status,
        nextDueDate: financials.nextDueDate,
        transactionCount: financials.transactionCount,
      },
      transactions: timelineTransactions,
      deadline: activeDeadline || null,
    });
  } catch (err) {
    console.error('Fetch customer detail error:', err);
    return NextResponse.json({ error: 'Failed to fetch customer details' }, { status: 500 });
  }
}

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
    const { name, phone, email, notes, customFields, isArchived } = body;

    const store = readStore();
    const index = store.customers.findIndex((c) => c.id === id && !c.isDeleted);
    if (index === -1) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Name validation
    if (name !== undefined) {
      const trimmed = name.trim();
      if (!trimmed || trimmed.length < 2) {
        return NextResponse.json({ error: 'Customer name must be at least 2 characters long.' }, { status: 400 });
      }
      store.customers[index].name = trimmed;
    }

    // Phone validation & uniqueness
    if (phone !== undefined) {
      const phoneValidation = normalizeAndValidatePhone(phone);
      if (!phoneValidation.valid) {
        return NextResponse.json({ error: phoneValidation.error }, { status: 400 });
      }
      const cleanPhone = phoneValidation.normalized;
      const existing = store.customers.find(
        (c) => c.id !== id && !c.isDeleted && c.phone === cleanPhone
      );
      if (existing) {
        return NextResponse.json(
          { error: `Another customer named "${existing.name}" already uses phone ${cleanPhone}.` },
          { status: 400 }
        );
      }
      store.customers[index].phone = cleanPhone;
    }

    // Email validation
    if (email !== undefined) {
      if (email && email.trim()) {
        const trimmedEmail = email.trim().toLowerCase();
        if (!isValidEmail(trimmedEmail)) {
          return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
        }
        store.customers[index].email = trimmedEmail;
      } else {
        store.customers[index].email = null;
      }
    }

    if (notes !== undefined) {
      store.customers[index].notes = notes ? notes.trim().substring(0, 500) : null;
    }

    if (customFields !== undefined && Array.isArray(customFields)) {
      store.customers[index].customFields = customFields
        .filter((f) => f && f.label && f.value)
        .map((f) => ({ label: f.label.trim(), value: f.value.trim() }))
        .filter((f) => f.label.length > 0 && f.value.length > 0);
    }

    if (typeof isArchived === 'boolean') {
      store.customers[index].isArchived = isArchived;
    }

    store.customers[index].updatedAt = new Date().toISOString();
    writeStore(store);

    return NextResponse.json({
      success: true,
      message: 'Customer updated successfully.',
      customer: store.customers[index],
    });
  } catch (err) {
    console.error('Update customer error:', err);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
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
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'delete'; // 'archive' | 'restore' | 'delete'

    const store = readStore();
    const index = store.customers.findIndex((c) => c.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (action === 'archive') {
      store.customers[index].isArchived = true;
      store.customers[index].updatedAt = new Date().toISOString();
      writeStore(store);
      return NextResponse.json({ success: true, message: 'Customer archived successfully.' });
    }

    if (action === 'restore') {
      store.customers[index].isArchived = false;
      store.customers[index].updatedAt = new Date().toISOString();
      writeStore(store);
      return NextResponse.json({ success: true, message: 'Customer restored successfully.' });
    }

    // Soft delete: marks as deleted while preserving historical transaction records
    store.customers[index].isDeleted = true;
    store.customers[index].updatedAt = new Date().toISOString();
    writeStore(store);

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully. Historical transactions preserved.',
    });
  } catch (err) {
    console.error('Delete customer error:', err);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}
