import { NextRequest, NextResponse } from 'next/server';
import { enqueueWorkspaceAssetIndex, retryWorkspaceAssetIndex } from '@/lib/asset-index-queue';
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
      extractionStatus: true,
    },
  });

  if (!asset) {
    return NextResponse.json({ error: '资料不存在' }, { status: 404 });
  }

  if (asset.extractionStatus === 'ready') {
    return NextResponse.json({ ok: true, status: 'ready' });
  }

  if (asset.extractionStatus === 'failed') {
    await retryWorkspaceAssetIndex(asset.id);
    return NextResponse.json({ ok: true, status: 'queued' }, { status: 202 });
  }

  await enqueueWorkspaceAssetIndex(asset.id);
  return NextResponse.json(
    {
      ok: true,
      status: asset.extractionStatus === 'processing' ? 'processing' : 'queued',
    },
    { status: 202 }
  );
}
