import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getActiveSessions, SESSION_COOKIE_NAME } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const { user, session } = await getCurrentUser();
    if (!user || !session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const cookieStore = await cookies();
    const currentToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const allSessions = await getActiveSessions(currentToken);

    return NextResponse.json({
      authenticated: true,
      user,
      currentSession: session,
      activeSessions: allSessions,
    });
  } catch (err) {
    console.error('Auth check error:', err);
    return NextResponse.json({ error: 'Auth check failed' }, { status: 500 });
  }
}
