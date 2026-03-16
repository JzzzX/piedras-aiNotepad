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
      handoffSummary?: string;
      candidateStatus?: string;
      nextInterviewer?: string;
      nextFocus?: string;
    };

    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json({ error: 'Collection 名称不能为空' }, { status: 400 });
    }

    const collection = await prisma.collection.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description.trim() } : {}),
        ...(body.icon !== undefined ? { icon: body.icon.trim() || 'folder' } : {}),
        ...(body.color !== undefined ? { color: body.color.trim() || '#94a3b8' } : {}),
        ...(body.handoffSummary !== undefined
          ? { handoffSummary: body.handoffSummary.trim() }
          : {}),
        ...(body.candidateStatus !== undefined
          ? { candidateStatus: body.candidateStatus.trim() || 'new' }
          : {}),
        ...(body.nextInterviewer !== undefined
          ? { nextInterviewer: body.nextInterviewer.trim() }
          : {}),
        ...(body.nextFocus !== undefined ? { nextFocus: body.nextFocus.trim() } : {}),
      },
    });

    return NextResponse.json(collection);
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新 Collection 失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.$transaction([
      prisma.meeting.updateMany({
        where: { collectionId: id },
        data: { collectionId: null },
      }),
      prisma.collection.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '删除 Collection 失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
