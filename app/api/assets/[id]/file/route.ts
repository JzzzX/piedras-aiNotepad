import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createWorkspaceAssetFileStreamResponse } from '@/lib/workspace-assets';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const asset = await prisma.workspaceAsset.findUnique({
    where: { id },
    select: {
      storageKey: true,
      mimeType: true,
      originalName: true,
    },
  });

  if (!asset) {
    return NextResponse.json({ error: '资料不存在' }, { status: 404 });
  }

  return createWorkspaceAssetFileStreamResponse({
    storageKey: asset.storageKey,
    mimeType: asset.mimeType,
    filename: asset.originalName,
  });
}
