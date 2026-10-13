import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getAdminCredentials } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/auth/me - Get current login state
export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    const admin = await getAdminCredentials();

    const res = NextResponse.json({
      success: true,
      data: {
        isLoggedIn: auth.isLoggedIn,
        user: auth.isLoggedIn
          ? {
              username: auth.username || admin.username,
              displayName: admin.displayName,
            }
          : null,
      },
    });

    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || '获取登录状态失败' },
      { status: 500 }
    );
  }
}
