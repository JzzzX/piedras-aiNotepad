import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const workspaces = await prisma.workspace.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json(workspaces);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { name?: string; description?: string; color?: string };
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: '工作区名称不能为空' }, { status: 400 });
    }

    const lastWorkspace = await prisma.workspace.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const workspace = await prisma.workspace.create({
      data: {
        name,
        description: body.description?.trim() || '',
        color: body.color?.trim() || '#94a3b8',
        sortOrder: (lastWorkspace?.sortOrder || 0) + 1,
      },
    });

    return NextResponse.json(workspace);
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建工作区失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
