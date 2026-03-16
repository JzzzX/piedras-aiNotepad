import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { WorkspaceAssetType } from './types';

const ASSET_STORAGE_DIR = path.join(process.cwd(), 'storage', 'assets');
const MAX_EXTRACTED_TEXT_LENGTH = 120_000;

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
  const pdfParseModule: any = await import('pdf-parse');
  const pdfParse = (pdfParseModule.default || pdfParseModule) as (
    dataBuffer: Buffer
  ) => Promise<{ text?: string }>;
  const result = await pdfParse(buffer);
  return compactExtractedText(result.text || '');
}

async function extractImageText(buffer: Buffer) {
  const tesseractModule: any = await import('tesseract.js');
  const createWorker = (tesseractModule.createWorker ||
    tesseractModule.default?.createWorker) as (language?: string) => Promise<{
      recognize: (image: Buffer) => Promise<{ data?: { text?: string } }>;
      terminate: () => Promise<void>;
    }>;

  const worker = await createWorker('eng+chi_sim');
  try {
    const result = await worker.recognize(buffer);
    return compactExtractedText(result.data?.text || '');
  } finally {
    await worker.terminate();
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
