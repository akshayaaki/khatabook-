import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logoutAllOtherSessions, SESSION_COOKIE_NAME, getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { user, session } = await getCurrentUser();
    if (!user || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      await logoutAllOtherSessions(token);
    }

    return NextResponse.json({
      success: true,
      message: 'All other device sessions have been logged out.',
    });
  } catch (err) {
    console.error('Logout others error:', err);
    return NextResponse.json({ error: 'Failed to logout other devices' }, { status: 500 });
  }
}
