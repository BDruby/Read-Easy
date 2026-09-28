import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { countWords } from '@/lib/parser';

// GET /api/projects/[id]/chapters - List chapters
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chapters = await prisma.chapter.findMany({
      where: { projectId: params.id },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        projectId: true,
        orderIndex: true,
        title: true,
        wordCount: true,
        audioUrl: true,
        notesCount: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: chapters });
  } catch (error: any) {
    console.error('Failed to list chapters:', error);
    return NextResponse.json(
      { success: false, message: error.message || '获取章节列表失败' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/chapters - Create a new chapter or batch import chapters
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { chapters: inputChapters, title, content } = body;

    // Get current chapter count for ordering
    const maxOrder = await prisma.chapter.aggregate({
      where: { projectId: params.id },
      _max: { orderIndex: true },
    });
    const startOrder = (maxOrder._max.orderIndex ?? -1) + 1;

    if (inputChapters && Array.isArray(inputChapters) && inputChapters.length > 0) {
      // Batch insert chapters
      const created = [];
      let totalNewWords = 0;

      for (let i = 0; i < inputChapters.length; i++) {
        const item = inputChapters[i];
        const wCount = countWords(item.content || '');
        totalNewWords += wCount;

        const ch = await prisma.chapter.create({
          data: {
            projectId: params.id,
            title: item.title || `第${startOrder + i + 1}章`,
            content: item.content || '',
            wordCount: wCount,
            orderIndex: startOrder + i,
          },
        });
        created.push(ch);
      }

      // Update project counters
      await prisma.project.update({
        where: { id: params.id },
        data: {
          chapterCount: { increment: inputChapters.length },
          wordCount: { increment: totalNewWords },
        },
      });

      return NextResponse.json({ success: true, data: created });
    } else {
      // Single chapter create
      const wCount = countWords(content || '');
      const chapter = await prisma.chapter.create({
        data: {
          projectId: params.id,
          title: title || `第${startOrder + 1}章`,
          content: content || '',
          wordCount: wCount,
          orderIndex: startOrder,
        },
      });

      await prisma.project.update({
        where: { id: params.id },
        data: {
          chapterCount: { increment: 1 },
          wordCount: { increment: wCount },
        },
      });

      return NextResponse.json({ success: true, data: chapter });
    }
  } catch (error: any) {
    console.error('Failed to create chapter:', error);
    return NextResponse.json(
      { success: false, message: error.message || '创建章节失败' },
      { status: 500 }
    );
  }
}
