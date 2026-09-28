import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/projects/[id]/export - Export full project novel text
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        chapters: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            orderIndex: true,
            title: true,
            content: true,
            wordCount: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ success: false, message: '项目不存在' }, { status: 404 });
    }

    const lines: string[] = [];
    lines.push(`《${project.title}》`);
    if (project.author) {
      lines.push(`作者：${project.author}`);
    }
    lines.push(`总字数：${project.wordCount ? project.wordCount.toLocaleString() : 0} 字`);
    lines.push(`总章节：共 ${project.chapters.length} 章`);
    lines.push(`导出时间：${new Date().toLocaleString('zh-CN', { hour12: false })}`);

    if (project.description && project.description.trim()) {
      lines.push('');
      lines.push('【作品简介】');
      lines.push(project.description.trim());
    }

    lines.push('\n' + '='.repeat(50) + '\n');

    project.chapters.forEach((chap, idx) => {
      // If title already has chapter prefix like "第X章", keep it as is; otherwise format nicely
      const title = chap.title.trim();
      lines.push(title);
      lines.push('');
      if (chap.content) {
        lines.push(chap.content.trim());
      }
      lines.push('\n' + '='.repeat(50) + '\n');
    });

    const fullBookText = lines.join('\n');
    const sanitizedTitle = project.title.replace(/[\\/:*?"<>|\r\n]/g, '_').trim() || '小说定稿';
    const filename = `${sanitizedTitle}_全本完整稿.txt`;
    const encodedFilename = encodeURIComponent(filename);

    return new NextResponse(fullBookText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('Failed to export full project:', error);
    return NextResponse.json(
      { success: false, message: error.message || '全书导出失败' },
      { status: 500 }
    );
  }
}
