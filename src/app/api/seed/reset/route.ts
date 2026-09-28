import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { resetStore } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    resetStore();
    return NextResponse.json({ success: true, message: 'Demo data has been reset to initial state.' });
  } catch (err) {
    console.error('Reset store error:', err);
    return NextResponse.json({ error: 'Failed to reset store' }, { status: 500 });
  }
}
