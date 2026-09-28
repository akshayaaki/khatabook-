import { Customer, CustomerStatus, Transaction } from './types';
import { getTodayDateString, formatINR } from './formatters';

export interface CustomerFinancials {
  totalGiven: number;
  totalReceived: number;
  pendingAmount: number;
  status: CustomerStatus;
  nextDueDate: string | null;
  transactionCount: number;
}

/**
 * Calculates accurate customer financials with precision
 */
export function calculateCustomerFinancials(
  transactions: Array<{ type: string; amount: number; date?: string }>,
  deadlineDueDate?: string | null
): CustomerFinancials {
  let totalGiven = 0;
  let totalReceived = 0;

  for (const t of transactions) {
    const amt = Math.round((Number(t.amount) || 0) * 100) / 100;
    if (t.type === 'GAVE') {
      totalGiven += amt;
    } else if (t.type === 'GOT') {
      totalReceived += amt;
    }
  }

  // Exact rounded 2 decimals
  totalGiven = Math.round(totalGiven * 100) / 100;
  totalReceived = Math.round(totalReceived * 100) / 100;
  let pendingAmount = Math.round((totalGiven - totalReceived) * 100) / 100;
  if (Math.abs(pendingAmount) < 0.0001) {
    pendingAmount = 0;
  }

  const today = getTodayDateString();
  let status: CustomerStatus = 'NO_OUTSTANDING';

  if (pendingAmount > 0) {
    if (deadlineDueDate && deadlineDueDate < today) {
      status = 'OVERDUE';
    } else {
      status = 'PENDING';
    }
  } else if (totalGiven > 0 && pendingAmount === 0) {
    status = 'SETTLED';
  } else {
    status = 'NO_OUTSTANDING';
  }

  return {
    totalGiven,
    totalReceived,
    pendingAmount,
    status,
    nextDueDate: deadlineDueDate || null,
    transactionCount: transactions.length,
  };
}

/**
 * Validates whether a transaction is allowed under Negative Balance Protection rules
 */
export function validateTransaction(
  type: 'GAVE' | 'GOT',
  amount: number,
  currentPendingAmount: number
): { valid: boolean; error?: string; maxAllowed?: number } {
  if (isNaN(amount) || amount <= 0) {
    return {
      valid: false,
      error: 'Please enter a valid positive amount greater than ₹0.',
    };
  }

  if (type === 'GOT') {
    if (currentPendingAmount <= 0) {
      return {
        valid: false,
        error: "This customer has no outstanding balance. You cannot record a 'YOU GOT' payment.",
        maxAllowed: 0,
      };
    }

    // Check if amount exceeds pending
    const roundedAmount = Math.round(amount * 100) / 100;
    const roundedPending = Math.round(currentPendingAmount * 100) / 100;

    if (roundedAmount > roundedPending) {
      return {
        valid: false,
        error: `This payment exceeds the customer's pending amount. Maximum amount that can be received: ${formatINR(roundedPending)}.`,
        maxAllowed: roundedPending,
      };
    }
  }

  return { valid: true };
}

/**
 * Calculates running balances for a list of transactions chronologically
 */
export function calculateRunningBalances(transactions: Transaction[]): Transaction[] {
  // Sort transactions chronologically (oldest first)
  const sorted = [...transactions].sort((a, b) => {
    const dateComp = (a.date || '').localeCompare(b.date || '');
    if (dateComp !== 0) return dateComp;
    const timeComp = (a.time || '').localeCompare(b.time || '');
    if (timeComp !== 0) return timeComp;
    const createdA = new Date(a.createdAt).getTime();
    const createdB = new Date(b.createdAt).getTime();
    return createdA - createdB;
  });

  let currentBalance = 0;
  const withRunningBalances = sorted.map((tx) => {
    const amt = Math.round((Number(tx.amount) || 0) * 100) / 100;
    if (tx.type === 'GAVE') {
      currentBalance += amt;
    } else if (tx.type === 'GOT') {
      currentBalance -= amt;
    }
    currentBalance = Math.round(currentBalance * 100) / 100;
    if (Math.abs(currentBalance) < 0.0001) currentBalance = 0;

    return {
      ...tx,
      runningBalance: currentBalance,
    };
  });

  // Return in reverse chronological order (newest first) for UI timeline
  return withRunningBalances.reverse();
}
