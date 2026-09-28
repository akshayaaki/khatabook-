import fs from 'fs';
import path from 'path';
import os from 'os';
import { Customer, Transaction, Deadline, NotificationItem, DeviceSession } from './types';
import { prisma } from './prisma';

export interface DBStore {
  user: {
    id: string;
    username: string;
    email: string | null;
    passwordHash: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  };
  sessions: DeviceSession[];
  customers: Customer[];
  transactions: Transaction[];
  deadlines: Deadline[];
  notifications: NotificationItem[];
}

// Global in-memory cache to survive across serverless function invocations
const globalStore = globalThis as unknown as { __khata_store?: DBStore; __db_synced?: boolean };

// Determine safe storage directory
function getStoragePaths(): { dir: string; file: string }[] {
  const localDir = path.join(process.cwd(), '.data');
  const tmpDir = path.join(os.tmpdir(), 'khata_store_data');

  return [
    { dir: localDir, file: path.join(localDir, 'khata_store.json') },
    { dir: tmpDir, file: path.join(tmpDir, 'khata_store.json') },
  ];
}

function getInitialStore(): DBStore {
  const initialUser = {
    id: 'owner-main-1',
    username: 'owner',
    email: null,
    passwordHash: '',
    name: 'Khata Owner',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    user: initialUser,
    sessions: [],
    customers: [],
    transactions: [],
    deadlines: [],
    notifications: [],
  };
}

export function readStore(): DBStore {
  // If already in memory and valid, use it as fast path
  if (globalStore.__khata_store) {
    return globalStore.__khata_store;
  }

  const paths = getStoragePaths();

  for (const { file } of paths) {
    try {
      if (fs.existsSync(/*turbopackIgnore: true*/ file)) {
        const raw = fs.readFileSync(/*turbopackIgnore: true*/ file, 'utf-8');
        const parsed = JSON.parse(raw) as DBStore;
        if (parsed && parsed.user) {
          globalStore.__khata_store = parsed;
          return parsed;
        }
      }
    } catch {
      // Continue to next path or memory fallback
    }
  }

  // Create initial store
  const initial = getInitialStore();
  globalStore.__khata_store = initial;

  // Try saving to first writable path
  for (const { dir, file } of paths) {
    try {
      if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
        fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
      }
      fs.writeFileSync(/*turbopackIgnore: true*/ file, JSON.stringify(initial, null, 2), 'utf-8');
      break;
    } catch {
      // If read-only filesystem, try next path
    }
  }

  return initial;
}

export function writeStore(store: DBStore): void {
  globalStore.__khata_store = store;

  const paths = getStoragePaths();
  let written = false;

  for (const { dir, file } of paths) {
    try {
      if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
        fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
      }
      fs.writeFileSync(/*turbopackIgnore: true*/ file, JSON.stringify(store, null, 2), 'utf-8');
      written = true;
      break;
    } catch {
      // If error (e.g. read-only filesystem on Vercel), try next path (e.g. /tmp)
    }
  }

  if (!written) {
    console.warn('Storage persistence to disk was skipped, retaining in-memory state.');
  }

  // Asynchronously mirror customer and user changes to Supabase PostgreSQL
  persistToSupabase(store).catch((err) => {
    console.warn('Supabase sync notice:', err?.message || err);
  });
}

/**
 * Sync in-memory store state with Supabase PostgreSQL
 */
async function persistToSupabase(store: DBStore): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  try {
    // 1. Sync User if has password hash
    if (store.user && store.user.passwordHash) {
      const existingUser = await prisma.user.findFirst();
      if (!existingUser) {
        await prisma.user.create({
          data: {
            id: store.user.id,
            username: store.user.username,
            email: store.user.email,
            passwordHash: store.user.passwordHash,
            name: store.user.name,
          },
        });
      }
    }

    // 2. Sync Customers
    for (const c of store.customers) {
      await prisma.customer.upsert({
        where: { id: c.id },
        update: {
          name: c.name,
          phone: c.phone,
          email: c.email,
          notes: c.notes,
          customFields: c.customFields ? JSON.stringify(c.customFields) : undefined,
          isArchived: c.isArchived,
          isDeleted: c.isDeleted,
        },
        create: {
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          notes: c.notes,
          customFields: c.customFields ? JSON.stringify(c.customFields) : undefined,
          isArchived: c.isArchived,
          isDeleted: c.isDeleted,
        },
      });
    }

    // 3. Sync Transactions
    for (const t of store.transactions) {
      await prisma.transaction.upsert({
        where: { id: t.id },
        update: {
          type: t.type,
          amount: t.amount,
          date: t.date,
          time: t.time,
          paymentMethod: t.paymentMethod,
          notes: t.notes,
        },
        create: {
          id: t.id,
          customerId: t.customerId,
          type: t.type,
          amount: t.amount,
          date: t.date,
          time: t.time,
          paymentMethod: t.paymentMethod,
          notes: t.notes,
        },
      });
    }
  } catch (err) {
    console.warn('Background Supabase mirror notice:', err);
  }
}

/**
 * Reset store to clean initial state
 */
export function resetStore(): DBStore {
  const initial = getInitialStore();
  writeStore(initial);
  return initial;
}
