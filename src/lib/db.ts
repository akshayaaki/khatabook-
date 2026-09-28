import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { Customer, Transaction, Deadline, NotificationItem, DeviceSession } from './types';

// Store directory for standalone mode
const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'khata_store.json');

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

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getInitialStore(): DBStore {
  // Hash for initial default owner password "qwerty"
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('qwerty', salt);

  const initialUser = {
    id: 'owner-main-1',
    username: 'adminqwerty',
    email: 'owner@personalkhata.local',
    passwordHash,
    name: 'Khata Owner',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Clean empty state - no mock or demo data
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
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    const initial = getInitialStore();
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const store = JSON.parse(raw);
    return store;
  } catch {
    const initial = getInitialStore();
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

export function writeStore(store: DBStore): void {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

/**
 * Reset store to clean initial state
 */
export function resetStore(): DBStore {
  const initial = getInitialStore();
  writeStore(initial);
  return initial;
}
