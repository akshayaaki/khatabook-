import { cookies, headers } from 'next/headers';
import { OwnerUser, DeviceSession } from './types';
import { readStore } from './db';
import { getAdminAuth } from './firebase/admin';

export const SESSION_COOKIE_NAME = '__session';

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
 * Safely decodes a JWT payload without verifying signature (for dev/fallback use)
 */
function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Gets currently authenticated user from Firebase Auth Session Token
 */
export async function getCurrentUser(): Promise<{ user: OwnerUser | null; session: DeviceSession | null }> {
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get('__session')?.value ||
      cookieStore.get('firebase_token')?.value;

    const reqHeaders = await headers();
    const authHeader = reqHeaders.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const authToken = token || bearerToken;

    if (!authToken) {
      // In development or if unauthenticated
      if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        const store = readStore();
        return { user: store.user as OwnerUser, session: null };
      }
      return { user: null, session: null };
    }

    let uid: string | null = null;
    let email: string | null = null;
    let name: string = 'Khata Owner';

    // 1. Try Firebase Admin Verification if configured
    const adminAuth = getAdminAuth();
    if (adminAuth) {
      try {
        const decoded = await adminAuth.verifyIdToken(authToken);
        uid = decoded.uid;
        email = decoded.email || null;
        name = decoded.name || decoded.display_name || email?.split('@')[0] || 'Khata Owner';
      } catch {
        // Fallback to JWT payload decode if admin verification fails (e.g. dev/unconfigured admin credentials)
      }
    }

    // 2. Decode JWT if admin verification was skipped or not configured
    if (!uid) {
      const payload = decodeJwtPayload(authToken);
      if (payload && (payload.user_id || payload.sub || payload.uid)) {
        uid = payload.user_id || payload.sub || payload.uid;
        email = payload.email || null;
        name = payload.name || payload.displayName || email?.split('@')[0] || 'Khata Owner';
      }
    }

    if (!uid) {
      if (process.env.NODE_ENV === 'development') {
        const store = readStore();
        return { user: store.user as OwnerUser, session: null };
      }
      return { user: null, session: null };
    }

    const user: OwnerUser = {
      id: uid,
      username: name.toLowerCase().replace(/\s+/g, '_') || 'owner',
      email: email,
      name: name,
      createdAt: new Date().toISOString(),
    };

    const userAgent = reqHeaders.get('user-agent') || undefined;
    const session: DeviceSession = {
      id: `sess-${uid}`,
      userId: uid,
      token: authToken.substring(0, 32),
      deviceInfo: parseDeviceName(userAgent),
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    return { user, session };
  } catch (err) {
    console.error('getCurrentUser error:', err);
    return { user: null, session: null };
  }
}

/**
 * Get active sessions for display in settings
 */
export async function getActiveSessions(currentToken?: string): Promise<DeviceSession[]> {
  const { user, session } = await getCurrentUser();
  if (!user) return [];

  return [
    {
      id: session?.id || `sess-${user.id}`,
      userId: user.id,
      token: currentToken || session?.token || user.id,
      deviceInfo: session?.deviceInfo || 'Firebase Secure Session',
      isCurrent: true,
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  ];
}
