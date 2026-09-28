import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getActiveSessions, logoutSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const currentToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const sessions = await getActiveSessions(currentToken);

    return NextResponse.json({ sessions });
  } catch (err) {
    console.error('Fetch sessions error:', err);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Session token required' }, { status: 400 });
    }

    await logoutSession(token);
    return NextResponse.json({ success: true, message: 'Session revoked successfully' });
  } catch (err) {
    console.error('Revoke session error:', err);
    return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 });
  }
}
