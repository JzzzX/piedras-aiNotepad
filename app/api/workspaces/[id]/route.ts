import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as {
      name?: string;
      description?: string;
      icon?: string;
      color?: string;
      workflowMode?: 'general' | 'interview';
    };

    const workspace = await prisma.workspace.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.description !== undefined && { description: body.description.trim() }),
        ...(body.icon !== undefined && { icon: body.icon.trim() }),
        ...(body.color !== undefined && { color: body.color.trim() }),
        ...(body.workflowMode !== undefined && {
          workflowMode: body.workflowMode === 'interview' ? 'interview' : 'general',
        }),
      },
    });

    return NextResponse.json(workspace);
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新工作区失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const count = await prisma.workspace.count();
    if (count <= 1) {
      return NextResponse.json({ error: '不能删除最后一个工作区' }, { status: 400 });
    }

    await prisma.workspace.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '删除工作区失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
