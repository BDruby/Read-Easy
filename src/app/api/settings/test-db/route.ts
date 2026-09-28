import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const start = Date.now();
  try {
    const projectCount = await prisma.project.count();
    const chapterCount = await prisma.chapter.count();
    const annotationCount = await prisma.annotation.count();
    const latency = Date.now() - start;

    return NextResponse.json({
      success: true,
      data: {
        status: 'online',
        host: '101.200.156.170:3306',
        database: 'shengao',
        latency: `${latency}ms`,
        counts: {
          projects: projectCount,
          chapters: chapterCount,
          annotations: annotationCount,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: `数据库连接异常: ${error.message || '未知错误'}`,
    }, { status: 500 });
  }
}
