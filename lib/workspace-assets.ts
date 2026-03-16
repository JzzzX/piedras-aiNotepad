import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { WorkspaceAssetType } from './types';

const ASSET_STORAGE_DIR = path.join(process.cwd(), 'storage', 'assets');
const MAX_EXTRACTED_TEXT_LENGTH = 120_000;
const OCR_WORKER_IDLE_MS = 2 * 60 * 1000;
const MAX_OCR_IMAGE_EDGE = 2200;

type OcrWorker = {
  recognize: (image: Buffer) => Promise<{ data?: { text?: string } }>;
  terminate: () => Promise<void>;
};

const globalForWorkspaceAssets = globalThis as unknown as {
  workspaceAssetOcrWorker?: Promise<OcrWorker> | null;
  workspaceAssetOcrWorkerIdleTimer?: ReturnType<typeof setTimeout> | null;
};

function normalizeExtension(originalName: string, assetType: WorkspaceAssetType) {
  const rawExt = path.extname(originalName).trim().toLowerCase();
  if (rawExt) return rawExt;
  return assetType === 'pdf' ? '.pdf' : '.png';
}

export function inferWorkspaceAssetType(
  mimeType: string,
  originalName: string
): WorkspaceAssetType | null {
  const normalizedMime = mimeType.toLowerCase();
  const ext = path.extname(originalName).toLowerCase();

  if (normalizedMime === 'application/pdf' || ext === '.pdf') return 'pdf';
  if (
    normalizedMime.startsWith('image/') ||
    ['.png', '.jpg', '.jpeg', '.webp'].includes(ext)
  ) {
    return 'image';
  }

  return null;
}

export function createWorkspaceAssetStorageKey(
  assetId: string,
  originalName: string,
  assetType: WorkspaceAssetType
) {
  return `${assetId}${normalizeExtension(originalName, assetType)}`;
}

export function getWorkspaceAssetPath(storageKey: string) {
  return path.join(ASSET_STORAGE_DIR, storageKey);
}

export async function saveWorkspaceAssetFile(storageKey: string, buffer: Buffer) {
  await mkdir(ASSET_STORAGE_DIR, { recursive: true });
  const filePath = getWorkspaceAssetPath(storageKey);
  await writeFile(filePath, buffer);
  return filePath;
}

export async function deleteWorkspaceAssetFile(storageKey: string) {
  await rm(getWorkspaceAssetPath(storageKey), { force: true });
}

export async function createWorkspaceAssetFileStreamResponse(input: {
  storageKey: string;
  mimeType: string;
  filename?: string;
}) {
  const filePath = getWorkspaceAssetPath(input.storageKey);
  const fileStat = await stat(filePath);
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>;
  const headers = new Headers({
    'Content-Type': input.mimeType,
    'Content-Length': String(fileStat.size),
    'Cache-Control': 'private, max-age=60',
  });

  if (input.filename) {
    headers.set(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(input.filename)}`
    );
  }

  return new Response(stream, { status: 200, headers });
}

function compactExtractedText(text: string) {
  const normalized = text.replace(/\u0000/g, '').replace(/\s+\n/g, '\n').trim();
  return normalized.length <= MAX_EXTRACTED_TEXT_LENGTH
    ? normalized
    : normalized.slice(0, MAX_EXTRACTED_TEXT_LENGTH);
}

async function extractPdfText(buffer: Buffer) {
  const pdfParseModule = (await import('pdf-parse')) as unknown as {
    default?: (
      dataBuffer: Buffer
    ) => Promise<{ text?: string }>;
  } & ((
    dataBuffer: Buffer
  ) => Promise<{ text?: string }>);
  const pdfParse = (pdfParseModule.default || pdfParseModule) as (
    dataBuffer: Buffer
  ) => Promise<{ text?: string }>;
  const result = await pdfParse(buffer);
  return compactExtractedText(result.text || '');
}

async function prepareImageForOcr(buffer: Buffer) {
  try {
    const sharpModule = await import('sharp');
    const sharp = sharpModule.default;
    return await sharp(buffer)
      .rotate()
      .resize({
        width: MAX_OCR_IMAGE_EDGE,
        height: MAX_OCR_IMAGE_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .grayscale()
      .normalize()
      .png()
      .toBuffer();
  } catch {
    return buffer;
  }
}

async function extractImageText(buffer: Buffer) {
  const tesseractModule = (await import('tesseract.js')) as unknown as {
    createWorker?: (language?: string) => Promise<OcrWorker>;
    default?: {
      createWorker?: (language?: string) => Promise<OcrWorker>;
    };
  };

  const createWorker = (tesseractModule.createWorker ||
    tesseractModule.default?.createWorker) as (language?: string) => Promise<OcrWorker>;

  if (globalForWorkspaceAssets.workspaceAssetOcrWorkerIdleTimer) {
    clearTimeout(globalForWorkspaceAssets.workspaceAssetOcrWorkerIdleTimer);
    globalForWorkspaceAssets.workspaceAssetOcrWorkerIdleTimer = null;
  }

  if (!globalForWorkspaceAssets.workspaceAssetOcrWorker) {
    globalForWorkspaceAssets.workspaceAssetOcrWorker = createWorker('eng+chi_sim');
  }

  const worker = await globalForWorkspaceAssets.workspaceAssetOcrWorker;
  try {
    const preparedBuffer = await prepareImageForOcr(buffer);
    const result = await worker.recognize(preparedBuffer);
    return compactExtractedText(result.data?.text || '');
  } finally {
    globalForWorkspaceAssets.workspaceAssetOcrWorkerIdleTimer = setTimeout(() => {
      const workerPromise = globalForWorkspaceAssets.workspaceAssetOcrWorker;
      globalForWorkspaceAssets.workspaceAssetOcrWorker = null;
      globalForWorkspaceAssets.workspaceAssetOcrWorkerIdleTimer = null;
      if (!workerPromise) return;
      void workerPromise.then((currentWorker) => currentWorker.terminate()).catch(() => {});
    }, OCR_WORKER_IDLE_MS);
  }
}

export async function extractWorkspaceAssetText(
  buffer: Buffer,
  assetType: WorkspaceAssetType
) {
  if (assetType === 'pdf') {
    return extractPdfText(buffer);
  }
  return extractImageText(buffer);
}
