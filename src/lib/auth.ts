import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { readStore, writeStore } from './db';
import { prisma } from './prisma';
import { DeviceSession, OwnerUser } from './types';

export const SESSION_COOKIE_NAME = 'pk_session_token';
const MAX_SESSIONS = 3;
const AUTH_SECRET = process.env.AUTH_SECRET || 'pk_owner_auth_jwt_secret_key_2026_super_secure';

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString();
}

/**
 * Creates cryptographically signed stateless JWT token
 */
export function createSignedToken(payload: Record<string, unknown>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verifies and decodes cryptographically signed JWT token
 */
export function verifySignedToken(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', AUTH_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (signature !== expectedSig) return null;

    const decoded = JSON.parse(base64UrlDecode(payload));
    if (decoded.exp && Math.floor(Date.now() / 1000) > decoded.exp) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Parses user agent string to identify device name/browser
 */
export function parseDeviceName(userAgent?: string): string {
  if (!userAgent) return 'Unknown Device';
  
  let browser = 'Browser';
  if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
  else if (userAgent.includes('Edg')) browser = 'Edge';

  let os = 'Device';
  if (userAgent.includes('Windows')) os = 'Windows PC';
  else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) os = 'MacBook / Mac';
  else if (userAgent.includes('iPhone')) os = 'iPhone';
  else if (userAgent.includes('iPad')) os = 'iPad';
  else if (userAgent.includes('Android')) os = 'Android Phone';
  else if (userAgent.includes('Linux')) os = 'Linux PC';

  return `${os} (${browser})`;
}

/**
 * Authenticates credentials against Supabase PostgreSQL
 */
export async function authenticateOwner(
  usernameOrEmail: string,
  passwordPlain: string,
  deviceInfo: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; session?: DeviceSession; error?: string }> {
  const store = readStore();
  const normalizedInput = usernameOrEmail.trim().toLowerCase();

  let targetUser: {
    id: string;
    username: string;
    email: string | null;
    passwordHash: string;
    name?: string | null;
    createdAt?: string | Date;
  } | null = null;

  // 1. Query Supabase PostgreSQL
  try {
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: normalizedInput, mode: 'insensitive' as const } },
          { email: { equals: normalizedInput, mode: 'insensitive' as const } },
        ],
      },
    });

    if (dbUser) {
      targetUser = {
        id: dbUser.id,
        username: dbUser.username,
        email: dbUser.email,
        passwordHash: dbUser.passwordHash,
        name: dbUser.name,
        createdAt: dbUser.createdAt.toISOString(),
      };
    }
  } catch (err) {
    console.warn('Supabase DB query error:', err);
  }

  // 2. Check local store fallback if DB is not reachable
  if (!targetUser && store.user && store.user.username) {
    const matchesUser = store.user.username.toLowerCase() === normalizedInput;
    const matchesEmail = store.user.email ? store.user.email.toLowerCase() === normalizedInput : false;
    if (matchesUser || matchesEmail) {
      targetUser = store.user;
    }
  }

  if (!targetUser) {
    return { success: false, error: 'Invalid username/email or password' };
  }

  let passwordValid = false;
  try {
    passwordValid = bcrypt.compareSync(passwordPlain, targetUser.passwordHash);
  } catch {
    passwordValid = false;
  }

  if (!passwordValid) {
    return { success: false, error: 'Invalid username/email or password' };
  }

  // Update local cached store user
  store.user = {
    id: targetUser.id,
    username: targetUser.username,
    email: targetUser.email,
    passwordHash: targetUser.passwordHash,
    name: targetUser.name || 'Owner',
    createdAt: typeof targetUser.createdAt === 'string' ? targetUser.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const tokenPayload = {
    userId: targetUser.id,
    username: targetUser.username,
    email: targetUser.email,
    name: targetUser.name || 'Owner',
    deviceInfo: deviceInfo || parseDeviceName(userAgent),
    createdAt: new Date().toISOString(),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
  };

  const token = createSignedToken(tokenPayload);

  const newSession: DeviceSession = {
    id: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId: targetUser.id,
    token,
    deviceInfo: deviceInfo || parseDeviceName(userAgent),
    ipAddress: ipAddress || '127.0.0.1',
    userAgent: userAgent || '',
    lastActive: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  // Maintain active sessions list
  let activeSessions = [...store.sessions];
  if (activeSessions.length >= MAX_SESSIONS) {
    activeSessions.sort((a, b) => new Date(a.lastActive).getTime() - new Date(b.lastActive).getTime());
    activeSessions = activeSessions.slice(activeSessions.length - (MAX_SESSIONS - 1));
  }

  activeSessions.push(newSession);
  store.sessions = activeSessions;
  writeStore(store);

  // Record session in Supabase if reachable
  try {
    await prisma.session.create({
      data: {
        userId: targetUser.id,
        token,
        deviceInfo: newSession.deviceInfo,
        ipAddress: newSession.ipAddress,
        userAgent: newSession.userAgent,
      },
    });
  } catch {}

  return { success: true, session: newSession };
}

/**
 * Validates session token statelessly & statefully
 */
export async function validateSession(token: string): Promise<{ valid: boolean; user?: OwnerUser; session?: DeviceSession }> {
  if (!token) return { valid: false };

  // 1. Stateless cryptographic JWT verification
  const decoded = verifySignedToken(token);
  if (decoded && decoded.userId) {
    const store = readStore();
    const user: OwnerUser = {
      id: (decoded.userId as string) || store.user?.id || 'owner-id',
      username: store.user?.username || (decoded.username as string) || 'owner',
      email: store.user?.email ?? (decoded.email as string | null) ?? null,
      name: store.user?.name || (decoded.name as string) || 'Owner',
      createdAt: store.user?.createdAt || (decoded.createdAt as string) || new Date().toISOString(),
    };

    const session: DeviceSession = {
      id: `sess-${user.id}`,
      userId: user.id,
      token,
      deviceInfo: (decoded.deviceInfo as string) || 'Active Device',
      lastActive: new Date().toISOString(),
      createdAt: (decoded.createdAt as string) || new Date().toISOString(),
    };

    return { valid: true, user, session };
  }

  // 2. Fallback to store lookup
  const store = readStore();
  const session = store.sessions.find((s) => s.token === token);
  if (session && store.user) {
    session.lastActive = new Date().toISOString();
    writeStore(store);

    const user: OwnerUser = {
      id: store.user.id,
      username: store.user.username,
      email: store.user.email,
      name: store.user.name,
      createdAt: store.user.createdAt,
    };

    return { valid: true, user, session };
  }

  return { valid: false };
}

/**
 * Helper to get current session from Next.js cookies
 */
export async function getCurrentUser(): Promise<{ user: OwnerUser | null; session: DeviceSession | null }> {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!tokenCookie || !tokenCookie.value) {
      return { user: null, session: null };
    }

    const { valid, user, session } = await validateSession(tokenCookie.value);
    if (!valid || !user || !session) {
      return { user: null, session: null };
    }

    return { user, session };
  } catch {
    return { user: null, session: null };
  }
}

/**
 * Log out current session
 */
export async function logoutSession(token: string): Promise<void> {
  const store = readStore();
  store.sessions = store.sessions.filter((s) => s.token !== token);
  writeStore(store);

  try {
    await prisma.session.deleteMany({ where: { token } });
  } catch {}
}

/**
 * Log out all other devices/sessions except current
 */
export async function logoutAllOtherSessions(currentToken: string): Promise<void> {
  const store = readStore();
  store.sessions = store.sessions.filter((s) => s.token === currentToken);
  writeStore(store);

  try {
    await prisma.session.deleteMany({ where: { token: { not: currentToken } } });
  } catch {}
}

/**
 * Get all active sessions for settings management
 */
export async function getActiveSessions(currentToken?: string): Promise<DeviceSession[]> {
  const store = readStore();
  const currentTokenValid = currentToken ? verifySignedToken(currentToken) : null;
  
  const sessions = [...store.sessions];
  if (currentToken && !sessions.some(s => s.token === currentToken) && currentTokenValid) {
    sessions.unshift({
      id: `sess-${Date.now()}`,
      userId: (currentTokenValid.userId as string) || store.user?.id || 'owner',
      token: currentToken,
      deviceInfo: (currentTokenValid.deviceInfo as string) || 'Current Device',
      lastActive: new Date().toISOString(),
      createdAt: (currentTokenValid.createdAt as string) || new Date().toISOString(),
    });
  }

  return sessions.map((s) => ({
    ...s,
    isCurrent: s.token === currentToken,
  }));
}

/**
 * Update owner credentials in Supabase PostgreSQL
 */
export async function updateOwnerCredentials(
  currentPassword: string,
  newUsername?: string,
  newPassword?: string,
  newEmail?: string
): Promise<{ success: boolean; error?: string; newToken?: string; user?: OwnerUser }> {
  const store = readStore();
  
  // Find current user in DB or local store
  let dbUser = null;
  try {
    dbUser = await prisma.user.findFirst();
  } catch (err) {
    console.warn('Supabase findFirst error:', err);
  }

  const currentUser = dbUser || store.user;
  if (!currentUser || !currentUser.passwordHash) {
    return { success: false, error: 'No owner account found. Please register first.' };
  }

  // Verify current password with bcrypt
  let isMatch = false;
  try {
    isMatch = bcrypt.compareSync(currentPassword, currentUser.passwordHash);
  } catch {
    isMatch = false;
  }

  if (!isMatch) {
    return { success: false, error: 'Current password is incorrect.' };
  }

  let finalUsername = currentUser.username;
  let finalEmail = currentUser.email;
  let finalPasswordHash = currentUser.passwordHash;

  if (newUsername && newUsername.trim()) {
    if (newUsername.trim().length < 3) {
      return { success: false, error: 'Username must be at least 3 characters long.' };
    }
    finalUsername = newUsername.trim();
  }

  if (newEmail !== undefined) {
    finalEmail = newEmail ? newEmail.trim() : null;
  }

  if (newPassword && newPassword.trim()) {
    if (newPassword.trim().length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long.' };
    }
    const salt = bcrypt.genSaltSync(10);
    finalPasswordHash = bcrypt.hashSync(newPassword.trim(), salt);
  }

  // Persist directly to Supabase PostgreSQL User table
  try {
    if (dbUser) {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          username: finalUsername,
          email: finalEmail,
          passwordHash: finalPasswordHash,
        },
      });
    } else {
      await prisma.user.create({
        data: {
          username: finalUsername,
          email: finalEmail,
          passwordHash: finalPasswordHash,
          name: currentUser.name || 'Owner',
        },
      });
    }
  } catch (err) {
    console.warn('Supabase credential sync notice:', err);
  }

  // Update store cache
  store.user = {
    id: currentUser.id,
    username: finalUsername,
    email: finalEmail,
    passwordHash: finalPasswordHash,
    name: currentUser.name || 'Owner',
    createdAt: typeof currentUser.createdAt === 'string' ? currentUser.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);

  // Issue a fresh signed token with updated username/email
  const newToken = createSignedToken({
    userId: currentUser.id,
    username: finalUsername,
    email: finalEmail,
    name: currentUser.name || 'Owner',
    deviceInfo: 'Owner Device',
    createdAt: new Date().toISOString(),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  });

  const updatedOwnerUser: OwnerUser = {
    id: currentUser.id,
    username: finalUsername,
    email: finalEmail,
    name: currentUser.name || 'Owner',
    createdAt: typeof currentUser.createdAt === 'string' ? currentUser.createdAt : new Date().toISOString(),
  };

  return { success: true, newToken, user: updatedOwnerUser };
}
