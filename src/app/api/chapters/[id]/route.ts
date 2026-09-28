import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { countWords } from '@/lib/parser';

// GET /api/chapters/[id] - Get chapter with full content and annotations
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chapter = await prisma.chapter.findUnique({
      where: { id: params.id },
      include: {
        annotations: {
          orderBy: { createdAt: 'asc' },
        },
        project: {
          select: {
            id: true,
            title: true,
            author: true,
            chapterCount: true,
            wordCount: true,
          },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ success: false, message: '章节不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: chapter });
  } catch (error: any) {
    console.error('Failed to get chapter:', error);
    return NextResponse.json(
      { success: false, message: error.message || '获取章节详情失败' },
      { status: 500 }
    );
  }
}

// PUT /api/chapters/[id] - Update chapter content, title, status, or audioUrl
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { title, content, status, audioUrl, orderIndex } = body;

    const existing = await prisma.chapter.findUnique({
      where: { id: params.id },
      select: { wordCount: true, projectId: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: '章节不存在' }, { status: 404 });
    }

    const newWordCount = content !== undefined ? countWords(content) : undefined;
    const wordDiff = newWordCount !== undefined ? newWordCount - existing.wordCount : 0;

    const updated = await prisma.chapter.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content, wordCount: newWordCount }),
        ...(status !== undefined && { status }),
        ...(audioUrl !== undefined && { audioUrl }),
        ...(orderIndex !== undefined && { orderIndex }),
      },
      include: {
        annotations: true,
      },
    });

    // Update project word count if changed
    if (wordDiff !== 0) {
      await prisma.project.update({
        where: { id: existing.projectId },
        data: { wordCount: { increment: wordDiff } },
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Failed to update chapter:', error);
    return NextResponse.json(
      { success: false, message: error.message || '更新章节失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/chapters/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.chapter.findUnique({
      where: { id: params.id },
      select: { wordCount: true, projectId: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: '章节不存在' }, { status: 404 });
    }

    await prisma.chapter.delete({
      where: { id: params.id },
    });

    await prisma.project.update({
      where: { id: existing.projectId },
      data: {
        chapterCount: { decrement: 1 },
        wordCount: { decrement: existing.wordCount },
      },
    });

    return NextResponse.json({ success: true, message: '章节已删除' });
  } catch (error: any) {
    console.error('Failed to delete chapter:', error);
    return NextResponse.json(
      { success: false, message: error.message || '删除章节失败' },
      { status: 500 }
    );
  }
}
