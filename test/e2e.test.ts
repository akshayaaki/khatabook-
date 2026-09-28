import { describe, it } from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

describe('Personal Khata End-to-End API and Business Logic Verification', () => {
  let sessionCookie = '';
  let testCustomerId = '';

  it('1. Owner Authentication (Login with adminqwerty / qwerty)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'adminqwerty',
        password: 'qwerty',
        deviceInfo: 'Windows PC (Chrome)',
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie, 'Session cookie should be set');
    sessionCookie = setCookie.split(';')[0];
  });

  it('2. Create Dynamic Test Customer (/api/customers)', async () => {
    const res = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        name: 'AutoTest Customer',
        phone: '9900112233',
        email: 'autotest@example.com',
        notes: 'Temporary customer for automated validation test',
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.customer?.id);
    testCustomerId = data.customer.id;
  });

  it('3. Record YOU GAVE Transaction (₹5,000)', async () => {
    const res = await fetch(`${BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        customerId: testCustomerId,
        type: 'GAVE',
        amount: 5000,
        paymentMethod: 'Cash',
        notes: 'Test loan entry',
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.customerFinancials.totalGiven, 5000);
    assert.strictEqual(data.customerFinancials.pendingAmount, 5000);
  });

  it('4. Negative Balance Protection Enforcement', async () => {
    // Attempt to record payment of 9000 when pending is only 5000
    const res = await fetch(`${BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        customerId: testCustomerId,
        type: 'GOT',
        amount: 9000,
        paymentMethod: 'UPI',
        notes: 'Excessive payment test',
      }),
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.includes('exceeds the customer\'s pending amount'));
  });

  it('5. Record Valid Repayment to Settle Account (₹5,000)', async () => {
    const res = await fetch(`${BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        customerId: testCustomerId,
        type: 'GOT',
        amount: 5000,
        paymentMethod: 'UPI',
        notes: 'Full settlement payment',
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.customerFinancials.pendingAmount, 0);
    assert.strictEqual(data.customerFinancials.status, 'SETTLED');
  });

  it('6. Reopen Account When Settled Customer Takes New Loan', async () => {
    const res = await fetch(`${BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        customerId: testCustomerId,
        type: 'GAVE',
        amount: 3000,
        paymentMethod: 'Cash',
        notes: 'New loan after previous settlement',
      }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.customerFinancials.pendingAmount, 3000);
    assert.strictEqual(data.customerFinancials.status, 'PENDING');
  });

  it('7. Cleanup Dynamic Test Customer & Transactions', async () => {
    // Delete test transactions
    const txRes = await fetch(`${BASE_URL}/api/transactions?customerId=${testCustomerId}`, {
      headers: { Cookie: sessionCookie },
    });
    if (txRes.ok) {
      const data = await txRes.json();
      for (const t of data.transactions || []) {
        await fetch(`${BASE_URL}/api/transactions/${t.id}`, {
          method: 'DELETE',
          headers: { Cookie: sessionCookie },
        });
      }
    }

    // Delete test customer
    const res = await fetch(`${BASE_URL}/api/customers/${testCustomerId}?action=delete`, {
      method: 'DELETE',
      headers: { Cookie: sessionCookie },
    });
    assert.strictEqual(res.status, 200);
  });
});
