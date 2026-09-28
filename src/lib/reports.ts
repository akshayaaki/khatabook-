import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Customer, Transaction, CustomerStatus, DashboardSummary } from './types';
import {
  formatINR,
  formatPDFCurrency,
  formatIndianDate,
  formatIndianTime,
  getTodayDateString,
  getCurrentTimeString,
} from './formatters';

interface CustomerStatementOptions {
  customer: Customer;
  transactions: Transaction[];
  dateRangeLabel?: string;
}

interface OverallReportOptions {
  summary: DashboardSummary;
  customers: Customer[];
  title?: string;
  dateRangeLabel?: string;
}

interface SettlementReceiptOptions {
  customer: Customer;
  settlementDate?: string;
}

/**
 * Generates an Individual Customer Statement PDF with clean alignment and compatible font encoding
 */
export function generateCustomerStatementPDF(options: CustomerStatementOptions): jsPDF {
  const { customer, transactions, dateRangeLabel = 'All Time Statement' } = options;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Colors
  const primaryColor: [number, number, number] = [235, 94, 40]; // #EB5E28
  const darkTextColor: [number, number, number] = [30, 41, 59]; // #1E293B
  const grayTextColor: [number, number, number] = [100, 116, 139]; // #64748B
  const lightBg: [number, number, number] = [248, 250, 252];

  // Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PERSONAL KHATA', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Customer Account Statement', 210 - 14, 15, { align: 'right' });

  // Metadata Row
  let currentY = 32;
  doc.setTextColor(grayTextColor[0], grayTextColor[1], grayTextColor[2]);
  doc.setFontSize(9);
  doc.text(
    `Generated on: ${formatIndianDate(getTodayDateString())} at ${getCurrentTimeString()}`,
    14,
    currentY
  );
  doc.text(`Period: ${dateRangeLabel}`, 210 - 14, currentY, { align: 'right' });

  currentY += 6;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, currentY, 210 - 14, currentY);

  // Customer Information Card
  currentY += 6;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(14, currentY, 182, 34, 3, 3, 'F');

  // Customer Details (Left side)
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(customer.name, 20, currentY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(grayTextColor[0], grayTextColor[1], grayTextColor[2]);
  doc.text(`Phone: ${customer.phone}`, 20, currentY + 16);
  if (customer.email) {
    doc.text(`Email: ${customer.email}`, 20, currentY + 23);
  }
  if (customer.notes) {
    const truncatedNote = customer.notes.length > 40 ? `${customer.notes.substring(0, 40)}...` : customer.notes;
    doc.text(`Note: ${truncatedNote}`, 20, currentY + 30);
  }

  // Financial Summary Block (Right side)
  const labelX = 110;
  const valueX = 190;

  doc.setFontSize(9.5);
  doc.setTextColor(grayTextColor[0], grayTextColor[1], grayTextColor[2]);
  doc.text('Total Given:', labelX, currentY + 8);
  doc.text('Total Received:', labelX, currentY + 16);
  doc.text('Pending Balance:', labelX, currentY + 24);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(formatPDFCurrency(customer.totalGiven || 0), valueX, currentY + 8, { align: 'right' });
  doc.text(formatPDFCurrency(customer.totalReceived || 0), valueX, currentY + 16, { align: 'right' });

  // Status & Pending Highlight
  const pending = customer.pendingAmount || 0;
  if (pending > 0) {
    if (customer.status === 'OVERDUE') {
      doc.setTextColor(220, 38, 38); // Crimson red
    } else {
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    }
  } else {
    doc.setTextColor(16, 185, 129); // Green for settled
  }
  const statusText = customer.status ? `(${customer.status})` : pending === 0 ? '(SETTLED)' : '(PENDING)';
  doc.text(`${formatPDFCurrency(pending)} ${statusText}`, valueX, currentY + 24, { align: 'right' });

  // Transaction Ledger Table
  currentY += 42;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('Transaction History', 14, currentY);

  const tableBody = transactions.map((t) => {
    const isGave = t.type === 'GAVE';
    return [
      formatIndianDate(t.date),
      formatIndianTime(t.time),
      isGave ? 'YOU GAVE' : 'YOU GOT',
      t.paymentMethod || 'Cash',
      t.notes || '—',
      isGave ? formatINR(t.amount, false) : '—',
      !isGave ? formatINR(t.amount, false) : '—',
      formatINR(t.runningBalance ?? 0, false),
    ];
  });

  autoTable(doc, {
    startY: currentY + 4,
    margin: { left: 14, right: 14 },
    tableWidth: 182,
    head: [['Date', 'Time', 'Type', 'Method', 'Notes', 'Given (Rs.)', 'Got (Rs.)', 'Balance (Rs.)']],
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 20 },
      2: { cellWidth: 22, fontStyle: 'bold' },
      3: { cellWidth: 16 },
      4: { cellWidth: 38 },
      5: { cellWidth: 20, halign: 'right', textColor: [224, 83, 60] },
      6: { cellWidth: 20, halign: 'right', textColor: [16, 185, 129] },
      7: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Personal Khata • Page ${i} of ${pageCount} • Computer-generated financial ledger statement.`,
      105,
      290,
      { align: 'center' }
    );
  }

  return doc;
}

/**
 * Generates an Overall / Filtered Customers Report PDF in Landscape
 */
export function generateOverallReportPDF(options: OverallReportOptions): jsPDF {
  const { summary, customers, title = 'Overall Khata Report', dateRangeLabel = 'All Time' } = options;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor: [number, number, number] = [235, 94, 40];
  const darkTextColor: [number, number, number] = [30, 41, 59];
  const grayTextColor: [number, number, number] = [100, 116, 139];

  // Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 297, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PERSONAL KHATA', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(title, 297 - 14, 14, { align: 'right' });

  // Metadata
  let currentY = 28;
  doc.setTextColor(grayTextColor[0], grayTextColor[1], grayTextColor[2]);
  doc.setFontSize(8.5);
  doc.text(
    `Generated: ${formatIndianDate(getTodayDateString())} at ${getCurrentTimeString()} | Filter: ${dateRangeLabel}`,
    14,
    currentY
  );

  // Summary Metrics Bar
  currentY += 5;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 269, 16, 2, 2, 'F');

  doc.setFontSize(8.5);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFont('helvetica', 'bold');

  const colW = 269 / 7;
  doc.text(`Total: ${summary.totalCustomers}`, 14 + 4, currentY + 10);
  doc.text(`Pending: ${summary.pendingCustomers}`, 14 + colW * 1.3, currentY + 10);
  doc.text(`Settled: ${summary.settledCustomers}`, 14 + colW * 2.4, currentY + 10);
  doc.text(`Overdue: ${summary.overdueCustomers}`, 14 + colW * 3.5, currentY + 10);
  doc.text(`Given: ${formatPDFCurrency(summary.totalGiven)}`, 14 + colW * 4.6, currentY + 10);
  doc.text(`Received: ${formatPDFCurrency(summary.totalReceived)}`, 14 + colW * 5.7, currentY + 10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`Pending: ${formatPDFCurrency(summary.totalPending)}`, 297 - 18, currentY + 10, { align: 'right' });

  // Customers Table
  currentY += 22;
  const tableBody = customers.map((c) => [
    c.name,
    c.phone,
    formatINR(c.totalGiven || 0, false),
    formatINR(c.totalReceived || 0, false),
    formatINR(c.pendingAmount || 0, false),
    c.nextDueDate ? formatIndianDate(c.nextDueDate) : '—',
    c.status || 'SETTLED',
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    tableWidth: 269,
    head: [
      [
        'Customer Name',
        'Phone Number',
        'Total Given (Rs.)',
        'Total Received (Rs.)',
        'Pending (Rs.)',
        'Due Date',
        'Status',
      ],
    ],
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 34 },
      2: { cellWidth: 36, halign: 'right' },
      3: { cellWidth: 36, halign: 'right' },
      4: { cellWidth: 36, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 38 },
      6: { cellWidth: 39, fontStyle: 'bold' },
    },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Personal Khata • Page ${i} of ${pageCount} • Confidential financial summary report.`,
      148.5,
      200,
      { align: 'center' }
    );
  }

  return doc;
}

/**
 * Generates a Formal Settlement Receipt PDF
 */
export function generateSettlementReceiptPDF(options: SettlementReceiptOptions): jsPDF {
  const { customer, settlementDate = getTodayDateString() } = options;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor: [number, number, number] = [235, 94, 40];
  const greenColor: [number, number, number] = [16, 185, 129];
  const darkTextColor: [number, number, number] = [30, 41, 59];

  // Certificate / Receipt Outer Border
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1.5);
  doc.rect(10, 10, 190, 277);

  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.8);
  doc.rect(12, 12, 186, 273);

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('PERSONAL KHATA', 105, 30, { align: 'center' });

  doc.setFontSize(13);
  doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
  doc.text('OFFICIAL SETTLEMENT RECEIPT', 105, 40, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Receipt No: REC-${customer.id}-${Date.now().toString().slice(-6)}`, 105, 48, { align: 'center' });
  doc.text(`Settlement Date: ${formatIndianDate(settlementDate)}`, 105, 54, { align: 'center' });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(30, 60, 180, 60);

  // Settlement Badge
  doc.setFillColor(236, 253, 245); // light green bg
  doc.roundedRect(30, 68, 150, 26, 3, 3, 'F');
  doc.setTextColor(6, 95, 70); // deep green
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('ACCOUNT FULLY SETTLED & CLEARED', 105, 82, { align: 'center' });
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Outstanding Balance: Rs. 0.00 (Zero)', 105, 89, { align: 'center' });

  // Customer Details Block
  let currentY = 108;
  doc.setFontSize(10.5);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer Details:', 30, currentY);

  currentY += 8;
  doc.setFont('helvetica', 'normal');
  doc.text('Full Name:', 30, currentY);
  doc.setFont('helvetica', 'bold');
  doc.text(customer.name, 75, currentY);

  currentY += 8;
  doc.setFont('helvetica', 'normal');
  doc.text('Phone Number:', 30, currentY);
  doc.setFont('helvetica', 'bold');
  doc.text(customer.phone, 75, currentY);

  if (customer.email) {
    currentY += 8;
    doc.setFont('helvetica', 'normal');
    doc.text('Email Address:', 30, currentY);
    doc.text(customer.email, 75, currentY);
  }

  // Summary Table of Amounts
  currentY += 16;
  doc.setFont('helvetica', 'bold');
  doc.text('Settlement Breakdown:', 30, currentY);

  currentY += 6;
  autoTable(doc, {
    startY: currentY,
    margin: { left: 30, right: 30 },
    tableWidth: 150,
    head: [['Description', 'Amount (INR)']],
    body: [
      ['Total Money Borrowed / Given', formatPDFCurrency(customer.totalGiven || 0)],
      ['Total Repayments Received', formatPDFCurrency(customer.totalReceived || customer.totalGiven || 0)],
      ['Remaining Balance Due', 'Rs. 0 (Fully Paid)'],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 60, halign: 'right', fontStyle: 'bold' },
    },
  });

  // Authorization and Signature
  currentY = 220;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('This receipt certifies that the customer named above has settled all dues in full.', 105, currentY, {
    align: 'center',
  });

  currentY += 30;
  doc.line(130, currentY, 180, currentY);
  doc.text('Authorized Signature / Personal Khata', 155, currentY + 6, { align: 'center' });

  return doc;
}
