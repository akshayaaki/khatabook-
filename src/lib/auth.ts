import { auth, currentUser } from '@clerk/nextjs/server';
import { OwnerUser, DeviceSession } from './types';
import { readStore } from './db';

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
 * Gets currently authenticated user from Clerk
 */
export async function getCurrentUser(): Promise<{ user: OwnerUser | null; session: DeviceSession | null }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      // In development or if unauthenticated
      if (process.env.NODE_ENV === 'development' && !process.env.CLERK_SECRET_KEY) {
        const store = readStore();
        return { user: store.user as OwnerUser, session: null };
      }
      return { user: null, session: null };
    }

    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress || null;
    const username = clerkUser?.username || clerkUser?.firstName || 'Owner';
    const name = clerkUser
      ? `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim()
      : 'Khata Owner';

    const user: OwnerUser = {
      id: userId,
      username,
      email,
      name: name || 'Khata Owner',
      createdAt: clerkUser?.createdAt ? new Date(clerkUser.createdAt).toISOString() : new Date().toISOString(),
    };

    const session: DeviceSession = {
      id: `sess-${userId}`,
      userId,
      token: userId,
      deviceInfo: 'Clerk Authenticated Device',
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    return { user, session };
  } catch {
    return { user: null, session: null };
  }
}

/**
 * Get active sessions for display in settings
 */
export async function getActiveSessions(currentToken?: string): Promise<DeviceSession[]> {
  const { user } = await getCurrentUser();
  if (!user) return [];

  return [
    {
      id: `sess-${user.id}`,
      userId: user.id,
      token: currentToken || user.id,
      deviceInfo: 'Clerk Secure Session',
      isCurrent: true,
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  ];
}
