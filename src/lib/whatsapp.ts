import { Customer } from './types';
import { formatINR, formatIndianDate } from './formatters';

/**
 * Creates WhatsApp share URL for full customer ledger summary
 */
export function getWhatsAppSummaryUrl(customer: Customer): string {
  const phoneClean = (customer.phone || '').replace(/\D/g, '');
  // Format international number if 10 digits
  const phoneFormatted = phoneClean.length === 10 ? `91${phoneClean}` : phoneClean;

  const lines = [
    `*Personal Khata*`,
    `Customer Statement`,
    ``,
    `*Customer:* ${customer.name}`,
    `*Phone:* ${customer.phone}`,
    ``,
    `*Total Given:* ${formatINR(customer.totalGiven || 0)}`,
    `*Total Received:* ${formatINR(customer.totalReceived || 0)}`,
    `*Pending Amount:* ${formatINR(customer.pendingAmount || 0)}`,
    ``,
    `*Due Date:* ${customer.nextDueDate ? formatIndianDate(customer.nextDueDate) : 'Not specified'}`,
    `*Status:* ${customer.status || 'SETTLED'}`,
    ``,
    `Generated via Personal Khata`,
  ];

  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${phoneFormatted}?text=${text}`;
}

/**
 * Creates WhatsApp payment reminder URL
 */
export function getWhatsAppReminderUrl(customer: Customer): string {
  const phoneClean = (customer.phone || '').replace(/\D/g, '');
  const phoneFormatted = phoneClean.length === 10 ? `91${phoneClean}` : phoneClean;

  const lines = [
    `Hello ${customer.name},`,
    ``,
    `This is a gentle reminder regarding your outstanding balance with *Personal Khata*.`,
    ``,
    `*Pending Amount:* ${formatINR(customer.pendingAmount || 0)}`,
    customer.nextDueDate ? `*Due Date:* ${formatIndianDate(customer.nextDueDate)}` : '',
    ``,
    `Please arrange the payment via Cash or UPI at your convenience.`,
    `Thank you!`,
  ].filter(Boolean);

  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${phoneFormatted}?text=${text}`;
}
