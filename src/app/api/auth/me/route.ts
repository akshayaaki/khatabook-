import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const { user, session } = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user,
      currentSession: session,
      activeSessions: session ? [session] : [],
    });
  } catch (err) {
    console.error('Auth check error:', err);
    return NextResponse.json({ error: 'Auth check failed' }, { status: 500 });
  }
}
