import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMathCaptcha } from '@/lib/captcha';
import { getAuthFromRequest, getAdminCredentials } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/chapters/[id]/comments - Get all comments & suggestions for a chapter
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chapterId = params.id;
    if (!chapterId) {
      return NextResponse.json(
        { success: false, message: '缺少章节ID' },
        { status: 400 }
      );
    }

    const comments = await prisma.chapterComment.findMany({
      where: { chapterId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: comments,
    });
  } catch (error: any) {
    console.error('Fetch comments error:', error);
    return NextResponse.json(
      { success: false, message: error.message || '获取留言失败' },
      { status: 500 }
    );
  }
}

// POST /api/chapters/[id]/comments - Add a comment or paragraph suggestion
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chapterId = params.id;
    const body = await req.json();
    const { content, nickname, paragraphIdx, type, captcha, captchaKey } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, message: '留言内容不能为空' },
        { status: 400 }
      );
    }

    // Check Captcha for all submissions (both guest and author)
    if (!captchaKey || captcha === undefined || captcha === null) {
      return NextResponse.json(
        { success: false, message: '请输入验证码' },
        { status: 400 }
      );
    }

    const isCaptchaValid = verifyMathCaptcha(captchaKey, captcha);
    if (!isCaptchaValid) {
      return NextResponse.json(
        { success: false, message: '验证码计算错误或已失效，请重新计算' },
        { status: 400 }
      );
    }

    // Check if user is logged-in author
    const auth = getAuthFromRequest(req);
    let isAuthor = false;
    let authorName = (nickname || '').trim() || '热心书友';

    if (auth.isLoggedIn) {
      isAuthor = true;
      const admin = await getAdminCredentials();
      authorName = admin.displayName || '作者本人';
    }

    const comment = await prisma.chapterComment.create({
      data: {
        chapterId,
        paragraphIdx: typeof paragraphIdx === 'number' ? paragraphIdx : null,
        nickname: authorName,
        content: content.trim(),
        type: type || 'general',
        isAuthor,
      },
    });

    return NextResponse.json({
      success: true,
      data: comment,
    });
  } catch (error: any) {
    console.error('Create comment error:', error);
    return NextResponse.json(
      { success: false, message: error.message || '提交留言失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/chapters/[id]/comments?commentId=... - Delete comment (requires author login)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth.isLoggedIn) {
      return NextResponse.json(
        { success: false, message: '只有已登录的作者才能删除留言' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json(
        { success: false, message: '缺少留言ID' },
        { status: 400 }
      );
    }

    await prisma.chapterComment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({
      success: true,
      message: '留言已删除',
    });
  } catch (error: any) {
    console.error('Delete comment error:', error);
    return NextResponse.json(
      { success: false, message: error.message || '删除留言失败' },
      { status: 500 }
    );
  }
}
