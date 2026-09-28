export type TransactionType = 'GAVE' | 'GOT';
export type PaymentMethod = 'Cash' | 'UPI';

export type CustomerStatus = 'PENDING' | 'SETTLED' | 'OVERDUE' | 'NO_OUTSTANDING';

export interface CustomField {
  label: string;
  value: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  customFields?: CustomField[] | null;
  isArchived: boolean;
  isDeleted: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  
  // Computed fields
  totalGiven?: number;
  totalReceived?: number;
  pendingAmount?: number;
  status?: CustomerStatus;
  nextDueDate?: string | null;
  transactionCount?: number;
}

export interface Transaction {
  id: string;
  customerId: string;
  type: TransactionType;
  amount: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm or HH:mm A
  paymentMethod: PaymentMethod;
  notes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  
  // Computed / contextual
  runningBalance?: number;
  customerName?: string;
  customerPhone?: string;
}

export interface Deadline {
  id: string;
  customerId: string;
  dueDate: string; // YYYY-MM-DD
  notes?: string | null;
  isCompleted: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type NotificationType = 
  | 'PAYMENT_DUE' 
  | 'PAYMENT_OVERDUE' 
  | 'PAYMENT_RECEIVED' 
  | 'NEW_GIVEN' 
  | 'SETTLED' 
  | 'DAILY_SUMMARY' 
  | 'WEEKLY_SUMMARY';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  customerId?: string | null;
  customerName?: string | null;
  isRead: boolean;
  createdAt: string | Date;
}

export interface DeviceSession {
  id: string;
  userId: string;
  token: string;
  deviceInfo: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  lastActive: string | Date;
  createdAt: string | Date;
  isCurrent?: boolean;
}

export interface OwnerUser {
  id: string;
  username: string;
  email?: string | null;
  name?: string | null;
  createdAt: string | Date;
}

export interface DashboardSummary {
  totalCustomers: number;
  activeCustomers: number;
  pendingCustomers: number;
  settledCustomers: number;
  overdueCustomers: number;
  totalGiven: number;
  totalReceived: number;
  totalPending: number;
}

export type DateRangePreset = 
  | 'today' 
  | 'this_week' 
  | 'this_month' 
  | 'last_month' 
  | 'this_year' 
  | 'custom'
  | 'all';
