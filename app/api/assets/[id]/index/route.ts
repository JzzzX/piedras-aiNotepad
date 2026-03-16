import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const asset = await prisma.workspaceAsset.findUnique({
    where: { id },
    select: {
      id: true,
    },
  });

  if (!asset) {
    return NextResponse.json({ error: '资料不存在' }, { status: 404 });
  }

  return NextResponse.json(
    {
      ok: false,
      status: 'preview',
      error: '资料库当前为预览模式，暂未启用资料识别',
    },
    { status: 409 }
  );
}
