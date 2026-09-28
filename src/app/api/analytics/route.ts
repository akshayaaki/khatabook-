import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { readStore } from '@/lib/db';
import { calculateCustomerFinancials } from '@/lib/calculations';
import { getTodayDateString } from '@/lib/formatters';
import { startOfWeek, startOfMonth, subMonths, startOfYear, parseISO, isWithinInterval } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || 'all'; // 'today', 'this_week', 'this_month', 'last_month', 'this_year', 'all', 'custom'
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const store = readStore();
    const todayStr = getTodayDateString();
    const now = new Date();

    // Determine Date filter boundaries
    let filterStart: Date | null = null;
    let filterEnd: Date | null = null;

    if (range === 'today') {
      filterStart = new Date(todayStr + 'T00:00:00');
      filterEnd = new Date(todayStr + 'T23:59:59');
    } else if (range === 'this_week') {
      filterStart = startOfWeek(now, { weekStartsOn: 1 });
      filterEnd = now;
    } else if (range === 'this_month') {
      filterStart = startOfMonth(now);
      filterEnd = now;
    } else if (range === 'last_month') {
      const lastMonthDate = subMonths(now, 1);
      filterStart = startOfMonth(lastMonthDate);
      filterEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (range === 'this_year') {
      filterStart = startOfYear(now);
      filterEnd = now;
    } else if (range === 'custom' && startDateParam && endDateParam) {
      filterStart = new Date(startDateParam + 'T00:00:00');
      filterEnd = new Date(endDateParam + 'T23:59:59');
    }

    // Active (non-deleted, non-archived) customers
    const activeCustomers = store.customers.filter((c) => !c.isDeleted && !c.isArchived);
    const totalCustomersCount = store.customers.filter((c) => !c.isDeleted).length;

    let pendingCustomers = 0;
    let settledCustomers = 0;
    let overdueCustomers = 0;
    let totalGivenAll = 0;
    let totalReceivedAll = 0;

    const customerDetails = activeCustomers.map((customer) => {
      const allCustomerTxs = store.transactions.filter((t) => t.customerId === customer.id);
      const activeDeadline = store.deadlines.find((d) => d.customerId === customer.id && !d.isCompleted);
      const financials = calculateCustomerFinancials(allCustomerTxs, activeDeadline?.dueDate);

      totalGivenAll += financials.totalGiven;
      totalReceivedAll += financials.totalReceived;

      if (financials.status === 'PENDING') pendingCustomers++;
      else if (financials.status === 'SETTLED') settledCustomers++;
      else if (financials.status === 'OVERDUE') overdueCustomers++;

      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        ...financials,
      };
    });

    const totalPendingAll = Math.max(0, Math.round((totalGivenAll - totalReceivedAll) * 100) / 100);

    // Filter transactions for charts by selected date range
    let filteredTransactions = store.transactions;
    if (filterStart && filterEnd) {
      filteredTransactions = store.transactions.filter((t) => {
        const txDate = new Date(t.date + 'T12:00:00');
        return isWithinInterval(txDate, { start: filterStart!, end: filterEnd! });
      });
    }

    // 1. Time Series: Given vs Received over time
    const dateMap = new Map<string, { date: string; given: number; received: number; net: number }>();
    for (const t of filteredTransactions) {
      const existing = dateMap.get(t.date) || { date: t.date, given: 0, received: 0, net: 0 };
      if (t.type === 'GAVE') {
        existing.given += t.amount;
        existing.net += t.amount;
      } else {
        existing.received += t.amount;
        existing.net -= t.amount;
      }
      dateMap.set(t.date, existing);
    }
    const timelineData = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // 2. Monthly Lending & Collections (Group by YYYY-MM)
    const monthMap = new Map<string, { month: string; monthLabel: string; given: number; received: number }>();
    for (const t of store.transactions) {
      const ym = t.date.substring(0, 7); // YYYY-MM
      const [year, m] = ym.split('-');
      const monthDate = new Date(Number(year), Number(m) - 1, 1);
      const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' }).format(monthDate);

      const existing = monthMap.get(ym) || { month: ym, monthLabel, given: 0, received: 0 };
      if (t.type === 'GAVE') existing.given += t.amount;
      else existing.received += t.amount;
      monthMap.set(ym, existing);
    }
    const monthlyData = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));

    // 3. Status Breakdown
    const statusDistribution = [
      { name: 'Pending', value: pendingCustomers, color: '#EB5E28' },
      { name: 'Settled', value: settledCustomers, color: '#10B981' },
      { name: 'Overdue', value: overdueCustomers, color: '#EF4444' },
    ];

    // 4. Overdue Customers list with amounts
    const overdueList = customerDetails
      .filter((c) => c.status === 'OVERDUE')
      .sort((a, b) => b.pendingAmount - a.pendingAmount);

    return NextResponse.json({
      summary: {
        totalCustomers: totalCustomersCount,
        activeCustomers: activeCustomers.length,
        pendingCustomers,
        settledCustomers,
        overdueCustomers,
        totalGiven: totalGivenAll,
        totalReceived: totalReceivedAll,
        totalPending: totalPendingAll,
      },
      timelineData,
      monthlyData,
      statusDistribution,
      overdueList,
      topBorrowers: customerDetails.sort((a, b) => b.pendingAmount - a.pendingAmount).slice(0, 5),
    });
  } catch (err) {
    console.error('Analytics error:', err);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
