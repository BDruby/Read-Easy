import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/projects/[id]
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
            title: true,
            orderIndex: true,
            wordCount: true,
            status: true,
            notesCount: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ success: false, message: '项目不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: project });
  } catch (error: any) {
    console.error('Failed to get project:', error);
    return NextResponse.json(
      { success: false, message: error.message || '获取项目详情失败' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id] - Update project info
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { title, description, author, tags, status } = body;

    const updated = await prisma.project.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(author && { author }),
        ...(tags && { tags }),
        ...(status && { status }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Failed to update project:', error);
    return NextResponse.json(
      { success: false, message: error.message || '更新项目失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.project.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true, message: '项目已删除' });
  } catch (error: any) {
    console.error('Failed to delete project:', error);
    return NextResponse.json(
      { success: false, message: error.message || '删除项目失败' },
      { status: 500 }
    );
  }
}
