import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  createWorkspaceAssetStorageKey,
  inferWorkspaceAssetType,
  saveWorkspaceAssetFile,
} from '@/lib/workspace-assets';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspaceId');
  const collectionId = searchParams.get('collectionId');

  if (!workspaceId) {
    return NextResponse.json({ error: '缺少 workspaceId' }, { status: 400 });
  }

  const assets = await prisma.workspaceAsset.findMany({
    where: {
      workspaceId,
      ...(collectionId
        ? { collectionId: collectionId === '__workspace_shared' ? null : collectionId }
        : {}),
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      collection: {
        select: { id: true, name: true, icon: true, color: true },
      },
    },
  });

  return NextResponse.json(assets);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file');
  const workspaceId = String(formData.get('workspaceId') || '').trim();
  const rawCollectionId = String(formData.get('collectionId') || '').trim();
  const requestedName = String(formData.get('name') || '').trim();

  if (!workspaceId) {
    return NextResponse.json({ error: '缺少 workspaceId' }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: '缺少上传文件' }, { status: 400 });
  }

  const assetType = inferWorkspaceAssetType(file.type || '', file.name);
  if (!assetType) {
    return NextResponse.json({ error: '当前仅支持 PDF 和图片文件' }, { status: 400 });
  }

  const collectionId =
    rawCollectionId && rawCollectionId !== '__workspace_shared' ? rawCollectionId : null;

  const assetId = randomUUID();
  const storageKey = createWorkspaceAssetStorageKey(assetId, file.name, assetType);
  const buffer = Buffer.from(await file.arrayBuffer());
  await saveWorkspaceAssetFile(storageKey, buffer);

  const asset = await prisma.workspaceAsset.create({
    data: {
      id: assetId,
      name: requestedName || file.name.replace(/\.[^.]+$/, ''),
      originalName: file.name,
      assetType,
      mimeType: file.type || (assetType === 'pdf' ? 'application/pdf' : 'image/png'),
      fileSize: file.size,
      storageKey,
      extractedText: '',
      extractionStatus: 'processing',
      extractionError: '',
      workspaceId,
      collectionId,
    },
    include: {
      collection: {
        select: { id: true, name: true, icon: true, color: true },
      },
    },
  });

  return NextResponse.json(asset);
}
