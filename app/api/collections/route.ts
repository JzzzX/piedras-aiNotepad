import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspaceId');

  const collections = await prisma.collection.findMany({
    where: workspaceId ? { workspaceId } : undefined,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json(collections);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      name?: string;
      description?: string;
      icon?: string;
      color?: string;
      workspaceId?: string;
      handoffSummary?: string;
      candidateStatus?: string;
      nextInterviewer?: string;
      nextFocus?: string;
    };
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: 'Collection 名称不能为空' }, { status: 400 });
    }

    if (!body.workspaceId) {
      return NextResponse.json({ error: '缺少工作区 ID' }, { status: 400 });
    }

    const lastCollection = await prisma.collection.findFirst({
      where: { workspaceId: body.workspaceId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const collection = await prisma.collection.create({
      data: {
        name,
        description: body.description?.trim() || '',
        icon: body.icon?.trim() || 'folder',
        color: body.color?.trim() || '#94a3b8',
        handoffSummary: body.handoffSummary?.trim() || '',
        candidateStatus: body.candidateStatus?.trim() || 'new',
        nextInterviewer: body.nextInterviewer?.trim() || '',
        nextFocus: body.nextFocus?.trim() || '',
        sortOrder: (lastCollection?.sortOrder || 0) + 1,
        workspaceId: body.workspaceId,
      },
    });

    return NextResponse.json(collection);
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建 Collection 失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
