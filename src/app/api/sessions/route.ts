import { NextResponse } from 'next/server';
import { getCurrentUser, getActiveSessions } from '@/lib/auth';

export async function GET() {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessions = await getActiveSessions();
    return NextResponse.json({ sessions });
  } catch (err) {
    console.error('Fetch sessions error:', err);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json({ success: true, message: 'Sessions are managed via Clerk account settings' });
}
