import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateCustomerFinancials,
  validateTransaction,
  calculateRunningBalances,
} from './calculations';
import { formatINR, formatIndianDate, formatIndianTime } from './formatters';
import { Transaction } from './types';

describe('Personal Khata Master Financial Calculation Rules', () => {
  it('Rule 1: Given ₹5,000 -> Pending ₹5,000', () => {
    const financials = calculateCustomerFinancials([{ type: 'GAVE', amount: 5000 }]);
    assert.strictEqual(financials.totalGiven, 5000);
    assert.strictEqual(financials.totalReceived, 0);
    assert.strictEqual(financials.pendingAmount, 5000);
    assert.strictEqual(financials.status, 'PENDING');
  });

  it('Rule 2: Given ₹5,000 + Got ₹2,000 -> Pending ₹3,000', () => {
    const financials = calculateCustomerFinancials([
      { type: 'GAVE', amount: 5000 },
      { type: 'GOT', amount: 2000 },
    ]);
    assert.strictEqual(financials.totalGiven, 5000);
    assert.strictEqual(financials.totalReceived, 2000);
    assert.strictEqual(financials.pendingAmount, 3000);
    assert.strictEqual(financials.status, 'PENDING');
  });

  it('Rule 3: Given ₹5,000 + Got ₹5,000 -> Settled (₹0 pending)', () => {
    const financials = calculateCustomerFinancials([
      { type: 'GAVE', amount: 5000 },
      { type: 'GOT', amount: 5000 },
    ]);
    assert.strictEqual(financials.totalGiven, 5000);
    assert.strictEqual(financials.totalReceived, 5000);
    assert.strictEqual(financials.pendingAmount, 0);
    assert.strictEqual(financials.status, 'SETTLED');
  });

  it('Rule 4 (Negative Balance Protection): Given ₹5,000 + Got ₹6,000 -> Reject', () => {
    const validation = validateTransaction('GOT', 6000, 5000);
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.error?.includes('exceeds the customer\'s pending amount'));
  });

  it('Rule 5 (Negative Balance Protection): Cannot record GOT on ₹0 pending', () => {
    const validation = validateTransaction('GOT', 500, 0);
    assert.strictEqual(validation.valid, false);
    assert.ok(validation.error?.includes('no outstanding balance'));
  });

  it('Rule 6: Multiple loans aggregate correctly', () => {
    const financials = calculateCustomerFinancials([
      { type: 'GAVE', amount: 5000 },
      { type: 'GAVE', amount: 3000 },
      { type: 'GOT', amount: 2000 },
      { type: 'GOT', amount: 1000 },
    ]);
    assert.strictEqual(financials.totalGiven, 8000);
    assert.strictEqual(financials.totalReceived, 3000);
    assert.strictEqual(financials.pendingAmount, 5000);
    assert.strictEqual(financials.status, 'PENDING');
  });

  it('Rule 7: Multiple partial payments aggregate correctly', () => {
    const financials = calculateCustomerFinancials([
      { type: 'GAVE', amount: 10000 },
      { type: 'GOT', amount: 2000 },
      { type: 'GOT', amount: 3000 },
      { type: 'GOT', amount: 1000 },
    ]);
    assert.strictEqual(financials.totalGiven, 10000);
    assert.strictEqual(financials.totalReceived, 6000);
    assert.strictEqual(financials.pendingAmount, 4000);
  });

  it('Rule 8: Settled customer receives new loan -> Customer becomes pending again', () => {
    const previous = calculateCustomerFinancials([
      { type: 'GAVE', amount: 5000 },
      { type: 'GOT', amount: 5000 },
    ]);
    assert.strictEqual(previous.status, 'SETTLED');

    const reopened = calculateCustomerFinancials([
      { type: 'GAVE', amount: 5000 },
      { type: 'GOT', amount: 5000 },
      { type: 'GAVE', amount: 3000 },
    ]);
    assert.strictEqual(reopened.totalGiven, 8000);
    assert.strictEqual(reopened.totalReceived, 5000);
    assert.strictEqual(reopened.pendingAmount, 3000);
    assert.strictEqual(reopened.status, 'PENDING');
  });

  it('Rule 9: Customer with past due date and pending balance is marked OVERDUE', () => {
    const financials = calculateCustomerFinancials(
      [{ type: 'GAVE', amount: 5000 }],
      '2020-01-01'
    );
    assert.strictEqual(financials.status, 'OVERDUE');
  });

  it('Rule 10: Running balance is maintained accurately in reverse chronological order', () => {
    const mockTxs: Transaction[] = [
      {
        id: '1',
        customerId: 'c1',
        type: 'GAVE',
        amount: 5000,
        date: '2026-09-01',
        time: '10:00 AM',
        paymentMethod: 'Cash',
        createdAt: new Date('2026-09-01T10:00:00Z'),
        updatedAt: new Date('2026-09-01T10:00:00Z'),
      },
      {
        id: '2',
        customerId: 'c1',
        type: 'GOT',
        amount: 2000,
        date: '2026-09-05',
        time: '12:00 PM',
        paymentMethod: 'UPI',
        createdAt: new Date('2026-09-05T12:00:00Z'),
        updatedAt: new Date('2026-09-05T12:00:00Z'),
      },
      {
        id: '3',
        customerId: 'c1',
        type: 'GAVE',
        amount: 3000,
        date: '2026-09-10',
        time: '04:00 PM',
        paymentMethod: 'Cash',
        createdAt: new Date('2026-09-10T16:00:00Z'),
        updatedAt: new Date('2026-09-10T16:00:00Z'),
      },
    ];

    const results = calculateRunningBalances(mockTxs);
    assert.strictEqual(results[0].id, '3');
    assert.strictEqual(results[0].runningBalance, 6000);

    assert.strictEqual(results[1].id, '2');
    assert.strictEqual(results[1].runningBalance, 3000);

    assert.strictEqual(results[2].id, '1');
    assert.strictEqual(results[2].runningBalance, 5000);
  });

  it('Rule 11: Indian Number Formatting matches specifications', () => {
    assert.strictEqual(formatINR(5000), '₹5,000');
    assert.strictEqual(formatINR(50000), '₹50,000');
    assert.strictEqual(formatINR(100000), '₹1,00,000');
    assert.strictEqual(formatINR(1000000), '₹10,00,000');
    assert.strictEqual(formatINR(0), '₹0');
  });
});
