import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { prisma } from './prisma';

const AUTH_SECRET = process.env.AUTH_SECRET || 'writercraft-reviewer-auth-secret-key-2026';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AuthSession {
  isLoggedIn: boolean;
  username: string | null;
  displayName: string | null;
}

/**
 * Generate a signed auth token for a user
 */
export function createAuthToken(username: string): string {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `${username}:${expiresAt}`;
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ u: username, exp: expiresAt, s: sig })).toString('base64');
}

/**
 * Verify an auth token
 */
export function verifyAuthToken(token: string): { valid: boolean; username?: string } {
  if (!token) return { valid: false };

  try {
    const raw = Buffer.from(token, 'base64').toString('utf-8');
    const { u, exp, s } = JSON.parse(raw);

    if (Date.now() > exp) {
      return { valid: false };
    }

    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(`${u}:${exp}`).digest('hex');
    if (s !== expectedSig) {
      return { valid: false };
    }

    return { valid: true, username: u };
  } catch {
    return { valid: false };
  }
}

/**
 * Get current system admin credentials from SystemSetting (with default fallbacks)
 */
export async function getAdminCredentials(): Promise<{
  username: string;
  password: string;
  displayName: string;
}> {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: { in: ['admin_username', 'admin_password', 'admin_display_name'] },
      },
    });

    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    return {
      username: map['admin_username'] || 'admin',
      password: map['admin_password'] || '123456',
      displayName: map['admin_display_name'] || '作者本人',
    };
  } catch (e) {
    console.error('Failed to read admin credentials from DB:', e);
    return {
      username: 'admin',
      password: '123456',
      displayName: '作者本人',
    };
  }
}

/**
 * Check if the request is sent by an authenticated author/admin
 */
export function getAuthFromRequest(req: NextRequest): {
  isLoggedIn: boolean;
  username?: string;
} {
  // 1. Check Authorization header (Bearer <token>)
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.substring(7).trim();
    const res = verifyAuthToken(bearerToken);
    if (res.valid) return { isLoggedIn: true, username: res.username };
  }

  // 2. Check req.cookies
  let cookieToken = req.cookies.get('auth_token')?.value;

  // 3. Fallback: Parse raw Cookie header string if req.cookies missed
  if (!cookieToken) {
    const rawCookies = req.headers.get('cookie') || '';
    const match = rawCookies.match(/(?:^|;\s*)auth_token=([^;]+)/);
    if (match) {
      cookieToken = decodeURIComponent(match[1]);
    }
  }

  if (cookieToken) {
    const res = verifyAuthToken(cookieToken);
    if (res.valid) return { isLoggedIn: true, username: res.username };
  }

  return { isLoggedIn: false };
}
