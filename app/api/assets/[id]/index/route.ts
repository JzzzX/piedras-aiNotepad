import { readFile } from 'node:fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { extractWorkspaceAssetText, getWorkspaceAssetPath } from '@/lib/workspace-assets';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const asset = await prisma.workspaceAsset.findUnique({
    where: { id },
    select: {
      id: true,
      assetType: true,
      storageKey: true,
      extractionStatus: true,
    },
  });

  if (!asset) {
    return NextResponse.json({ error: '资料不存在' }, { status: 404 });
  }

  if (asset.extractionStatus === 'ready') {
    return NextResponse.json({ ok: true, status: 'ready' });
  }

  try {
    const buffer = await readFile(getWorkspaceAssetPath(asset.storageKey));
    const extractedText = await extractWorkspaceAssetText(buffer, asset.assetType as 'pdf' | 'image');

    if (!extractedText.trim()) {
      await prisma.workspaceAsset.update({
        where: { id: asset.id },
        data: {
          extractedText: '',
          extractionStatus: 'failed',
          extractionError:
            asset.assetType === 'pdf' ? '未能从 PDF 中提取文本' : '未能从图片中识别文本',
        },
      });
      return NextResponse.json({ ok: true, status: 'failed' });
    }

    await prisma.workspaceAsset.update({
      where: { id: asset.id },
      data: {
        extractedText,
        extractionStatus: 'ready',
        extractionError: '',
      },
    });

    return NextResponse.json({ ok: true, status: 'ready' });
  } catch (error) {
    await prisma.workspaceAsset.update({
      where: { id: asset.id },
      data: {
        extractionStatus: 'failed',
        extractionError: error instanceof Error ? error.message : '资料文本抽取失败',
      },
    });

    return NextResponse.json({ ok: false, status: 'failed' }, { status: 500 });
  }
}
