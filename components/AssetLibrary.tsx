'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ExternalLink,
  FileImage,
  FileText,
  Loader2,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useMeetingStore } from '@/lib/store';
import type { WorkspaceAsset } from '@/lib/types';

interface AssetLibraryProps {
  workspaceId: string;
  fixedCollectionId?: string | null;
  uploadSignal?: number;
  emptyTitle?: string;
  emptyDescription?: string;
}

const ASSET_ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp';

type CollectionFilterValue = 'all' | '__workspace_shared' | string;

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AssetLibrary({
  workspaceId,
  fixedCollectionId,
  uploadSignal = 0,
  emptyTitle = '还没有资料',
  emptyDescription = '上传 PDF 或图片后，它们会在这里用于预览和归档管理。',
}: AssetLibraryProps) {
  const { collections, loadCollections } = useMeetingStore();
  const [assets, setAssets] = useState<WorkspaceAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilterValue>('all');
  const [uploadCollectionId, setUploadCollectionId] = useState<CollectionFilterValue>(
    fixedCollectionId === undefined ? '__workspace_shared' : fixedCollectionId || '__workspace_shared'
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const handledUploadSignalRef = useRef(0);

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ workspaceId });
      if (fixedCollectionId !== undefined) {
        params.set('collectionId', fixedCollectionId === null ? '__workspace_shared' : fixedCollectionId);
      }

      const res = await fetch(`/api/assets?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('加载资料失败');
      }
      setAssets((await res.json()) as WorkspaceAsset[]);
    } catch (error) {
      console.error(error);
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  }, [fixedCollectionId, workspaceId]);

  useEffect(() => {
    void loadCollections();
    void loadAssets();
  }, [loadAssets, loadCollections]);

  useEffect(() => {
    if (!uploadSignal || handledUploadSignalRef.current === uploadSignal) return;
    handledUploadSignalRef.current = uploadSignal;
    fileInputRef.current?.click();
  }, [uploadSignal]);

  const effectiveFilter =
    fixedCollectionId !== undefined
      ? fixedCollectionId === null
        ? '__workspace_shared'
        : fixedCollectionId
      : collectionFilter;

  const filteredAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return assets.filter((asset) => {
      const matchesCollection =
        effectiveFilter === 'all'
          ? true
          : effectiveFilter === '__workspace_shared'
            ? !asset.collectionId
            : asset.collectionId === effectiveFilter;

      if (!matchesCollection) return false;
      if (!normalizedQuery) return true;

      return [asset.name, asset.originalName]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [assets, effectiveFilter, query]);

  const handleUploadFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('workspaceId', workspaceId);
        const targetCollectionId =
          fixedCollectionId !== undefined
            ? fixedCollectionId
            : uploadCollectionId === '__workspace_shared'
              ? null
              : uploadCollectionId;

        if (targetCollectionId) {
          formData.append('collectionId', targetCollectionId);
        } else {
          formData.append('collectionId', '__workspace_shared');
        }

        const res = await fetch('/api/assets', { method: 'POST', body: formData });
        if (!res.ok) {
          throw new Error((await res.json().catch(() => null))?.error || '上传资料失败');
        }
        await res.json();
        await loadAssets();
      } catch (error) {
        console.error(error);
        alert(error instanceof Error ? error.message : '上传资料失败');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [fixedCollectionId, loadAssets, uploadCollectionId, workspaceId]
  );

  const handleMoveAsset = useCallback(
    async (assetId: string, nextCollectionId: string) => {
      const res = await fetch(`/api/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: nextCollectionId === '__workspace_shared' ? null : nextCollectionId,
        }),
      });

      if (!res.ok) {
        alert('移动资料失败');
        return;
      }

      await loadAssets();
    },
    [loadAssets]
  );

  const handleDeleteAsset = useCallback(
    async (assetId: string) => {
      if (!window.confirm('确定删除这份资料吗？')) return;

      const res = await fetch(`/api/assets/${assetId}`, { method: 'DELETE' });
      if (!res.ok) {
        alert('删除资料失败');
        return;
      }

      await loadAssets();
    },
    [loadAssets]
  );

  const moveOptions = useMemo(
    () => [
      { value: '__workspace_shared', label: '工作区共享' },
      ...collections.map((collection) => ({ value: collection.id, label: collection.name })),
    ],
    [collections]
  );

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm leading-6 text-amber-800">
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <p>
            资料库当前为预览模式。你可以上传 PDF 和图片并在工作区内预览、整理和归档；当前尚未接入外部 OCR 或 PDF 解析能力，因此资料内容不会被识别，也不会进入 AI 对话或知识搜索。
          </p>
        </div>
      </div>

      <div className="grid gap-3 rounded-[24px] border border-[#E8DED3] bg-[#FCFAF7] p-4 md:grid-cols-[minmax(0,1.2fr)_repeat(2,minmax(180px,0.5fr))]">
        <label className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#B4A79A]"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索资料名称"
            className="w-full rounded-2xl border border-[#E3D9CE] bg-white px-10 py-3 text-sm text-[#3A2E25] placeholder:text-[#AE9D8E] focus:border-[#C2B3A4] focus:outline-none"
          />
        </label>

        {fixedCollectionId === undefined ? (
          <label className="text-[12px] text-[#8C7A6B]">
            资料范围
            <select
              value={collectionFilter}
              onChange={(event) => setCollectionFilter(event.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-[#E3D9CE] bg-white px-3 py-3 text-sm text-[#3A2E25] focus:border-[#C2B3A4] focus:outline-none"
            >
              <option value="all">全部资料</option>
              <option value="__workspace_shared">工作区共享</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="rounded-2xl border border-[#E3D9CE] bg-white px-4 py-3 text-sm text-[#6C5D50]">
            {fixedCollectionId === null ? '当前显示：工作区共享资料' : '当前显示：这个 Collection 下的资料'}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {fixedCollectionId === undefined ? (
            <label className="text-[12px] text-[#8C7A6B]">
              上传目标
              <select
                value={uploadCollectionId}
                onChange={(event) => setUploadCollectionId(event.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-[#E3D9CE] bg-white px-3 py-3 text-sm text-[#3A2E25] focus:border-[#C2B3A4] focus:outline-none"
              >
                <option value="__workspace_shared">工作区共享</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#D8CEC4] bg-white px-4 py-3 text-xs leading-6 text-[#8C7A6B]">
              新资料会直接归入当前 {fixedCollectionId ? 'Collection' : '工作区共享'}。
            </div>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#3A2E25] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#2B2420] disabled:opacity-60"
          >
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            导入 PDF / 图片
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ASSET_ACCEPT}
        className="hidden"
        onChange={(event) => {
          void handleUploadFiles(event.target.files);
        }}
      />

      {isLoading ? (
        <div className="rounded-[24px] border border-[#E8DED3] bg-[#FCFAF7] px-6 py-12 text-center text-sm text-[#9A8877]">
          正在加载资料...
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[#DDD2C7] bg-[#FCFAF7] px-6 py-12 text-center">
          <p className="text-base font-medium text-[#5C4D42]">{emptyTitle}</p>
          <p className="mt-2 text-sm text-[#8B796A]">{emptyDescription}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="flex items-start gap-4 rounded-[24px] border border-[#ECE4DA] bg-[#FCFAF7] px-4 py-4"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#E3D9CE] bg-white text-[#7C6B5C]">
                {asset.assetType === 'pdf' ? <FileText size={20} /> : <FileImage size={20} />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate text-[15px] font-semibold text-[#3A2E25]">
                    {asset.name}
                  </div>
                  <span className="rounded-full bg-[#F1EBE3] px-2 py-0.5 text-[10px] text-[#8C7A6B]">
                    {asset.assetType === 'pdf' ? 'PDF' : '图片'}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-[#8C7A6B]">
                    {asset.collection?.name || '工作区共享'}
                  </span>
                  <span className="rounded-full bg-[#F4EFE7] px-2 py-0.5 text-[10px] text-[#8C7A6B]">
                    仅预览
                  </span>
                </div>

                <div className="mt-1 text-[12px] text-[#9A8877]">
                  {formatDate(asset.updatedAt)} · {formatFileSize(asset.fileSize)}
                </div>

                <p className="mt-2 line-clamp-3 text-[13px] leading-6 text-[#746556]">
                  当前仅支持文件预览与归档管理。后续接入外部识别工具后，这些资料才会参与内容检索与 AI 使用。
                </p>
              </div>

              <div className="flex w-[188px] shrink-0 flex-col items-end gap-2">
                <a
                  href={`/api/assets/${asset.id}/file`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-[#8C7A6B] transition-colors hover:bg-[#F1EBE3] hover:text-[#5C4D42]"
                >
                  <ExternalLink size={12} />
                  预览
                </a>

                <label className="w-full">
                  <span className="sr-only">移动到位置</span>
                  <select
                    value={asset.collectionId || '__workspace_shared'}
                    onChange={(event) => void handleMoveAsset(asset.id, event.target.value)}
                    className="w-full rounded-xl border border-[#E3D9CE] bg-white px-3 py-2 text-sm text-[#5C4D42] focus:border-[#C2B3A4] focus:outline-none"
                  >
                    {moveOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => void handleDeleteAsset(asset.id)}
                  className="rounded-lg px-2 py-1.5 text-xs text-[#A09082] transition-colors hover:bg-rose-50 hover:text-rose-600"
                >
                  <span className="inline-flex items-center gap-1">
                    <Trash2 size={12} />
                    删除
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
