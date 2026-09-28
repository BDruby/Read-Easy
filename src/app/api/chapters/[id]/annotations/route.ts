import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/chapters/[id]/annotations
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const annotations = await prisma.annotation.findMany({
      where: { chapterId: params.id },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ success: true, data: annotations });
  } catch (error: any) {
    console.error('Failed to get annotations:', error);
    return NextResponse.json(
      { success: false, message: error.message || '获取批注失败' },
      { status: 500 }
    );
  }
}

// POST /api/chapters/[id]/annotations - Create annotation
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { paragraphIdx, startIndex, endIndex, selectedText, noteText, type, color } = body;

    const annotation = await prisma.annotation.create({
      data: {
        chapterId: params.id,
        paragraphIdx: paragraphIdx || 0,
        startIndex: startIndex || 0,
        endIndex: endIndex || 0,
        selectedText: selectedText || '',
        noteText: noteText || '',
        type: type || 'typo',
        color: color || 'amber',
      },
    });

    await prisma.chapter.update({
      where: { id: params.id },
      data: { notesCount: { increment: 1 } },
    });

    return NextResponse.json({ success: true, data: annotation });
  } catch (error: any) {
    console.error('Failed to create annotation:', error);
    return NextResponse.json(
      { success: false, message: error.message || '创建批注失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/chapters/[id]/annotations?annotationId=xxx
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const annotationId = searchParams.get('annotationId');

    if (!annotationId) {
      return NextResponse.json({ success: false, message: '缺少批注ID' }, { status: 400 });
    }

    await prisma.annotation.delete({
      where: { id: annotationId },
    });

    await prisma.chapter.update({
      where: { id: params.id },
      data: { notesCount: { decrement: 1 } },
    });

    return NextResponse.json({ success: true, message: '批注已删除' });
  } catch (error: any) {
    console.error('Failed to delete annotation:', error);
    return NextResponse.json(
      { success: false, message: error.message || '删除批注失败' },
      { status: 500 }
    );
  }
}
