import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { deleteWorkspaceAssetFile } from '@/lib/workspace-assets';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json()) as {
    name?: string;
    collectionId?: string | null;
  };

  const updated = await prisma.workspaceAsset.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() || '未命名资料' } : {}),
      ...(body.collectionId !== undefined
        ? {
            collectionId:
              body.collectionId && body.collectionId !== '__workspace_shared'
                ? body.collectionId
                : null,
          }
        : {}),
    },
    include: {
      collection: {
        select: { id: true, name: true, icon: true, color: true },
      },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const asset = await prisma.workspaceAsset.findUnique({
    where: { id },
    select: { storageKey: true },
  });

  if (!asset) {
    return NextResponse.json({ error: '资料不存在' }, { status: 404 });
  }

  await prisma.workspaceAsset.delete({ where: { id } });
  await deleteWorkspaceAssetFile(asset.storageKey);

  return NextResponse.json({ ok: true });
}
