import { readFile } from 'node:fs/promises';
import { prisma } from './db';
import { extractWorkspaceAssetText, getWorkspaceAssetPath } from './workspace-assets';

const PROCESSING_STALE_MS = 15 * 60 * 1000;
const MAX_CONCURRENCY = 1;

type QueueState = {
  queue: string[];
  queued: Set<string>;
  running: Set<string>;
  activeCount: number;
  isRecovering: boolean;
};

const globalForAssetIndexer = globalThis as unknown as {
  workspaceAssetIndexer?: QueueState;
};

const state =
  globalForAssetIndexer.workspaceAssetIndexer ??
  (globalForAssetIndexer.workspaceAssetIndexer = {
    queue: [],
    queued: new Set<string>(),
    running: new Set<string>(),
    activeCount: 0,
    isRecovering: false,
  });

async function safeUpdateFailed(assetId: string, message: string) {
  try {
    await prisma.workspaceAsset.update({
      where: { id: assetId },
      data: {
        extractionStatus: 'failed',
        extractionError: message,
      },
    });
  } catch {
    // 资料可能已被删除，此时无需再写回错误状态。
  }
}

async function processAsset(assetId: string) {
  const asset = await prisma.workspaceAsset.findUnique({
    where: { id: assetId },
    select: {
      id: true,
      assetType: true,
      storageKey: true,
      extractionStatus: true,
    },
  });

  if (!asset || asset.extractionStatus === 'ready') {
    return;
  }

  await prisma.workspaceAsset.update({
    where: { id: assetId },
    data: {
      extractionStatus: 'processing',
      extractionError: '',
    },
  });

  try {
    const buffer = await readFile(getWorkspaceAssetPath(asset.storageKey));
    const extractedText = await extractWorkspaceAssetText(buffer, asset.assetType as 'pdf' | 'image');

    if (!extractedText.trim()) {
      await prisma.workspaceAsset.update({
        where: { id: assetId },
        data: {
          extractedText: '',
          extractionStatus: 'failed',
          extractionError:
            asset.assetType === 'pdf' ? '未能从 PDF 中提取文本' : '未能从图片中识别文本',
        },
      });
      return;
    }

    await prisma.workspaceAsset.update({
      where: { id: assetId },
      data: {
        extractedText,
        extractionStatus: 'ready',
        extractionError: '',
      },
    });
  } catch (error) {
    await safeUpdateFailed(assetId, error instanceof Error ? error.message : '资料文本抽取失败');
  }
}

async function pumpQueue() {
  while (state.activeCount < MAX_CONCURRENCY && state.queue.length > 0) {
    const assetId = state.queue.shift();
    if (!assetId) continue;

    state.queued.delete(assetId);
    if (state.running.has(assetId)) continue;

    state.running.add(assetId);
    state.activeCount += 1;

    void processAsset(assetId)
      .finally(() => {
        state.running.delete(assetId);
        state.activeCount = Math.max(0, state.activeCount - 1);
        void pumpQueue();
      });
  }
}

export async function enqueueWorkspaceAssetIndex(assetId: string) {
  if (state.queued.has(assetId) || state.running.has(assetId)) return;
  state.queued.add(assetId);
  state.queue.push(assetId);
  void pumpQueue();
}

export async function retryWorkspaceAssetIndex(assetId: string) {
  await prisma.workspaceAsset.update({
    where: { id: assetId },
    data: {
      extractionStatus: 'queued',
      extractionError: '',
    },
  });

  await enqueueWorkspaceAssetIndex(assetId);
}

export async function recoverWorkspaceAssetIndexQueue() {
  if (state.isRecovering) return;
  state.isRecovering = true;

  try {
    const staleThreshold = new Date(Date.now() - PROCESSING_STALE_MS);
    const pendingAssets = await prisma.workspaceAsset.findMany({
      where: {
        OR: [
          { extractionStatus: 'queued' },
          { extractionStatus: 'processing', updatedAt: { lt: staleThreshold } },
        ],
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    for (const asset of pendingAssets) {
      await enqueueWorkspaceAssetIndex(asset.id);
    }
  } finally {
    state.isRecovering = false;
  }
}
