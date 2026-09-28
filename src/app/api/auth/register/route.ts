import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSignedToken, SESSION_COOKIE_NAME, parseDeviceName } from '@/lib/auth';
import { readStore, writeStore } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, email, password, name, deviceInfo } = body;

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters long.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.trim().length < 5) {
      return NextResponse.json(
        { error: 'Password must be at least 5 characters long.' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email && typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;
    const cleanName = name && typeof name === 'string' && name.trim() ? name.trim() : 'Owner';

    // Check if user exists in Supabase
    try {
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: { equals: cleanUsername, mode: 'insensitive' as const } },
            ...(cleanEmail ? [{ email: { equals: cleanEmail, mode: 'insensitive' as const } }] : []),
          ],
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'An account with this username or email already exists. Please sign in.' },
          { status: 400 }
        );
      }
    } catch (dbErr) {
      console.warn('DB check notice:', dbErr);
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password.trim(), salt);

    let createdUser = {
      id: `user-${Date.now()}`,
      username: cleanUsername,
      email: cleanEmail,
      name: cleanName,
      passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to Supabase
    try {
      const dbCreated = await prisma.user.create({
        data: {
          username: cleanUsername,
          email: cleanEmail,
          passwordHash,
          name: cleanName,
        },
      });
      createdUser = {
        id: dbCreated.id,
        username: dbCreated.username,
        email: dbCreated.email,
        name: dbCreated.name || 'Owner',
        passwordHash: dbCreated.passwordHash,
        createdAt: dbCreated.createdAt.toISOString(),
        updatedAt: dbCreated.updatedAt.toISOString(),
      };
    } catch (dbCreateErr) {
      console.warn('Prisma create notice:', dbCreateErr);
    }

    // Sync to store
    const store = readStore();
    store.user = createdUser;
    writeStore(store);

    const userAgent = req.headers.get('user-agent') || '';
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const computedDeviceInfo = deviceInfo || parseDeviceName(userAgent);

    const tokenPayload = {
      userId: createdUser.id,
      username: createdUser.username,
      email: createdUser.email,
      name: createdUser.name,
      deviceInfo: computedDeviceInfo,
      createdAt: new Date().toISOString(),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    };

    const token = createSignedToken(tokenPayload);

    // Save session
    try {
      await prisma.session.create({
        data: {
          userId: createdUser.id,
          token,
          deviceInfo: computedDeviceInfo,
          ipAddress: ip,
          userAgent,
        },
      });
    } catch {}

    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully.',
      user: {
        id: createdUser.id,
        username: createdUser.username,
        email: createdUser.email,
        name: createdUser.name,
      },
    });

    const isHttps = req.nextUrl?.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    console.error('Registration error:', err);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
