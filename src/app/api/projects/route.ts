import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseNovelText } from '@/lib/parser';

// GET /api/projects - List all projects
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { chapters: true },
        },
      },
    });
    return NextResponse.json({ success: true, data: projects });
  } catch (error: any) {
    console.error('Failed to list projects:', error);
    return NextResponse.json(
      { success: false, message: error.message || '获取项目列表失败' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create new project (can include rawText to parse chapters automatically)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, author, tags, rawText, chapters: inputChapters } = body;

    let totalWordCount = 0;
    let chaptersToCreate: Array<{ title: string; content: string; wordCount: number; orderIndex: number }> = [];

    if (inputChapters && Array.isArray(inputChapters) && inputChapters.length > 0) {
      chaptersToCreate = inputChapters.map((ch: any, idx: number) => ({
        title: ch.title || `第${idx + 1}章`,
        content: ch.content || '',
        wordCount: ch.wordCount || (ch.content ? ch.content.length : 0),
        orderIndex: idx,
      }));
      totalWordCount = chaptersToCreate.reduce((sum, ch) => sum + ch.wordCount, 0);
    } else if (rawText && typeof rawText === 'string') {
      const parsed = parseNovelText(rawText, title || '新书手稿');
      chaptersToCreate = parsed.chapters;
      totalWordCount = parsed.totalWords;
    }

    const project = await prisma.project.create({
      data: {
        title: title || '新书项目',
        description: description || '',
        author: author || '作家本人',
        tags: tags || '长篇小说',
        wordCount: totalWordCount,
        chapterCount: chaptersToCreate.length,
        chapters: {
          create: chaptersToCreate.map((ch) => ({
            title: ch.title,
            content: ch.content,
            wordCount: ch.wordCount,
            orderIndex: ch.orderIndex,
          })),
        },
      },
      include: {
        chapters: {
          select: { id: true, title: true, orderIndex: true, wordCount: true, status: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return NextResponse.json({ success: true, data: project });
  } catch (error: any) {
    console.error('Failed to create project:', error);
    return NextResponse.json(
      { success: false, message: error.message || '创建项目失败' },
      { status: 500 }
    );
  }
}
