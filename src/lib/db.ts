import fs from 'fs';
import path from 'path';
import os from 'os';
import bcrypt from 'bcryptjs';
import { Customer, Transaction, Deadline, NotificationItem, DeviceSession } from './types';

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
const globalStore = globalThis as unknown as { __khata_store?: DBStore };

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
  const defaultUser = process.env.ADMIN_USERNAME || process.env.OWNER_USERNAME || 'adminqwerty';
  const defaultPass = process.env.ADMIN_PASSWORD || process.env.OWNER_PASSWORD || 'qwerty';

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(defaultPass, salt);

  const initialUser = {
    id: 'owner-main-1',
    username: defaultUser,
    email: 'owner@personalkhata.local',
    passwordHash,
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
    // In-memory fallback holds the data safely
    console.warn('Storage persistence to disk was skipped, retaining in-memory state.');
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
