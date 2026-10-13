import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/auth/logout - Log out current session
export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: '已退出登录',
  });

  response.cookies.set('auth_token', '', {
    httpOnly: true,
    expires: new Date(0),
    maxAge: 0,
    path: '/',
  });

  return response;
}
