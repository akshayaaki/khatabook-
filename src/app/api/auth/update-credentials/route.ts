import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, updateOwnerCredentials } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { user } = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newUsername, newPassword, newEmail } = body;

    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required to make changes.' }, { status: 400 });
    }

    const result = await updateOwnerCredentials(currentPassword, newUsername, newPassword, newEmail);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to update credentials' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Account credentials updated successfully.',
    });
  } catch (err) {
    console.error('Update credentials error:', err);
    return NextResponse.json({ error: 'Failed to update credentials' }, { status: 500 });
  }
}
