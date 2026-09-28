import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { readStore, writeStore } from '@/lib/db';
import { calculateCustomerFinancials } from '@/lib/calculations';
import { Customer, CustomerStatus } from '@/lib/types';

// Email validation helper
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Phone normalizer & validator for Indian numbers
function normalizeAndValidatePhone(phone: string): { valid: boolean; normalized: string; error?: string } {
  const digits = phone.replace(/\D/g, '');
  
  // Accept 10 digits, or 11 digits starting with 0, or 12 digits starting with 91
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
      error: 'Please enter a valid 10-digit mobile number (e.g. 9876543210).',
    };
  }

  // Must start with 6, 7, 8, or 9 for Indian mobile numbers
  if (!/^[6-9]/.test(tenDigitPhone)) {
    return {
      valid: false,
      normalized: tenDigitPhone,
      error: 'Mobile number must start with 6, 7, 8, or 9.',
    };
  }

  return { valid: true, normalized: tenDigitPhone };
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase().trim() || '';
    const filter = (searchParams.get('filter') || 'all').toLowerCase();
    const sort = searchParams.get('sort') || 'name';
    const showArchived = searchParams.get('archived') === 'true' || filter === 'archived';

    const store = readStore();

    // Enrich customers with current calculated financials and deadlines
    const enrichedCustomers: Customer[] = store.customers
      .filter((c) => !c.isDeleted)
      .filter((c) => (showArchived ? c.isArchived : !c.isArchived))
      .map((customer) => {
        const customerTransactions = store.transactions.filter(
          (t) => t.customerId === customer.id
        );
        const activeDeadline = store.deadlines
          .filter((d) => d.customerId === customer.id && !d.isCompleted)
          .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))[0];

        const financials = calculateCustomerFinancials(
          customerTransactions,
          activeDeadline?.dueDate || null
        );

        return {
          ...customer,
          totalGiven: financials.totalGiven,
          totalReceived: financials.totalReceived,
          pendingAmount: financials.pendingAmount,
          status: financials.status,
          nextDueDate: financials.nextDueDate,
          transactionCount: financials.transactionCount,
        };
      });

    // Apply Search (name, phone, email, notes)
    let filtered = enrichedCustomers;
    if (search) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.phone.toLowerCase().includes(search) ||
          (c.email && c.email.toLowerCase().includes(search)) ||
          (c.notes && c.notes.toLowerCase().includes(search))
      );
    }

    // Apply Status Filters
    if (filter === 'pending') {
      filtered = filtered.filter((c) => c.status === 'PENDING');
    } else if (filter === 'settled') {
      filtered = filtered.filter((c) => c.status === 'SETTLED' || c.status === 'NO_OUTSTANDING');
    } else if (filter === 'overdue') {
      filtered = filtered.filter((c) => c.status === 'OVERDUE');
    }

    // Apply Sorting
    filtered.sort((a, b) => {
      if (sort === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sort === 'dueDate') {
        if (!a.nextDueDate && !b.nextDueDate) return 0;
        if (!a.nextDueDate) return 1;
        if (!b.nextDueDate) return -1;
        return a.nextDueDate.localeCompare(b.nextDueDate);
      }
      if (sort === 'pending') {
        return (b.pendingAmount || 0) - (a.pendingAmount || 0);
      }
      if (sort === 'recent') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return 0;
    });

    return NextResponse.json({
      customers: filtered,
      totalCount: filtered.length,
    });
  } catch (err) {
    console.error('Fetch customers error:', err);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, email, notes, customFields } = body;

    // 1. Name validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      return NextResponse.json({ error: 'Customer name must be at least 2 characters long.' }, { status: 400 });
    }
    if (trimmedName.length > 80) {
      return NextResponse.json({ error: 'Customer name cannot exceed 80 characters.' }, { status: 400 });
    }

    // 2. Phone validation
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 });
    }
    const phoneValidation = normalizeAndValidatePhone(phone);
    if (!phoneValidation.valid) {
      return NextResponse.json({ error: phoneValidation.error }, { status: 400 });
    }
    const cleanPhone = phoneValidation.normalized;

    // 3. Email validation (if provided)
    let cleanEmail: string | null = null;
    if (email && typeof email === 'string' && email.trim()) {
      const trimmedEmail = email.trim().toLowerCase();
      if (!isValidEmail(trimmedEmail)) {
        return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
      }
      cleanEmail = trimmedEmail;
    }

    // 4. Notes validation
    let cleanNotes: string | null = null;
    if (notes && typeof notes === 'string' && notes.trim()) {
      cleanNotes = notes.trim().substring(0, 500);
    }

    // 5. Custom fields validation
    const validCustomFields = Array.isArray(customFields)
      ? customFields
          .filter((f) => f && typeof f.label === 'string' && typeof f.value === 'string')
          .map((f) => ({ label: f.label.trim(), value: f.value.trim() }))
          .filter((f) => f.label.length > 0 && f.value.length > 0)
      : [];

    const store = readStore();

    // 6. Unique phone validation among active customers
    const existing = store.customers.find(
      (c) => !c.isDeleted && c.phone === cleanPhone
    );
    if (existing) {
      return NextResponse.json(
        { error: `A customer named "${existing.name}" already exists with phone number ${cleanPhone}.` },
        { status: 400 }
      );
    }

    const newCustomer: Customer = {
      id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: trimmedName,
      phone: cleanPhone,
      email: cleanEmail,
      notes: cleanNotes,
      customFields: validCustomFields,
      isArchived: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.customers.push(newCustomer);
    writeStore(store);

    return NextResponse.json({
      success: true,
      message: 'Customer added successfully.',
      customer: {
        ...newCustomer,
        totalGiven: 0,
        totalReceived: 0,
        pendingAmount: 0,
        status: 'NO_OUTSTANDING' as CustomerStatus,
        nextDueDate: null,
        transactionCount: 0,
      },
    });
  } catch (err) {
    console.error('Create customer error:', err);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
