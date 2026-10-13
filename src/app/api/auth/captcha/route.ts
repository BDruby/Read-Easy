import { NextResponse } from 'next/server';
import { generateMathCaptcha } from '@/lib/captcha';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/auth/captcha - Generate dynamic math challenge
export async function GET() {
  try {
    const data = generateMathCaptcha();
    const res = NextResponse.json({
      success: true,
      data,
    });

    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: '生成验证码失败' },
      { status: 500 }
    );
  }
}
