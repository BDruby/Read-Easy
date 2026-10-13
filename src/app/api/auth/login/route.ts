import { NextRequest, NextResponse } from 'next/server';
import { verifyMathCaptcha } from '@/lib/captcha';
import { createAuthToken, getAdminCredentials } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/auth/login - Authenticate author/admin
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, captcha, captchaKey } = body;

    // 1. Verify Captcha
    if (!captchaKey || captcha === undefined || captcha === null) {
      return NextResponse.json(
        { success: false, message: '请输入验证码' },
        { status: 400 }
      );
    }

    const isCaptchaValid = verifyMathCaptcha(captchaKey, captcha);
    if (!isCaptchaValid) {
      return NextResponse.json(
        { success: false, message: '验证码计算错误或已失效，请重新输入' },
        { status: 400 }
      );
    }

    // 2. Validate username & password
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: '请输入用户名和密码' },
        { status: 400 }
      );
    }

    const admin = await getAdminCredentials();

    if (username.trim() !== admin.username || password !== admin.password) {
      let failMessage = '账号或密码不正确';
      if (admin.username !== 'admin' && (username.trim() === 'admin' || password === '123456')) {
        failMessage = `账号或密码不正确。您在系统设置中已自定义作者账号，请使用设置的作者账号登录`;
      }
      return NextResponse.json(
        { success: false, message: failMessage },
        { status: 401 }
      );
    }

    // 3. Issue Token
    const token = createAuthToken(admin.username);

    const response = NextResponse.json({
      success: true,
      message: '登录成功',
      data: {
        username: admin.username,
        displayName: admin.displayName,
        token,
      },
    });

    const isHttps = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';

    // Set HTTP cookie (7 days)
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: error.message || '登录异常' },
      { status: 500 }
    );
  }
}
