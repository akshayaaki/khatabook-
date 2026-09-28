import { NextRequest, NextResponse } from 'next/server';
import { authenticateOwner, SESSION_COOKIE_NAME, parseDeviceName } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, deviceInfo } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Please provide both username/email and password' },
        { status: 400 }
      );
    }

    const userAgent = req.headers.get('user-agent') || '';
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const computedDeviceInfo = deviceInfo || parseDeviceName(userAgent);

    const result = await authenticateOwner(username, password, computedDeviceInfo, ip, userAgent);

    if (!result.success || !result.session) {
      return NextResponse.json({ error: result.error || 'Invalid credentials' }, { status: 401 });
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully',
      session: {
        id: result.session.id,
        deviceInfo: result.session.deviceInfo,
        lastActive: result.session.lastActive,
      },
    });

    // Set secure HTTP-only session cookie (30 days expiry)
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: result.session.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err: unknown) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Authentication failed. Please try again.' }, { status: 500 });
  }
}
