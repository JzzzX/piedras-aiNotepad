'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpenText, Loader2, Sparkles } from 'lucide-react';
import { useMeetingStore } from '@/lib/store';
import type { AsrVocabularySyncStatus, CustomVocabularyScope } from '@/lib/types';

interface VocabularyResponse {
  terms: string[];
  effectiveCount: number;
  syncStatus: AsrVocabularySyncStatus;
  limits: {
    maxTerms: number;
  };
}

export default function AsrVocabularySettings() {
  const { currentWorkspaceId, workspaces, loadWorkspaces } = useMeetingStore();
  const [scope, setScope] = useState<CustomVocabularyScope>('global');
  const [termsText, setTermsText] = useState('');
  const [savedTerms, setSavedTerms] = useState<string[]>([]);
  const [effectiveCount, setEffectiveCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<AsrVocabularySyncStatus | null>(null);
  const [maxTerms, setMaxTerms] = useState(500);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const currentWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === currentWorkspaceId) || null,
    [currentWorkspaceId, workspaces]
  );

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  const loadVocabulary = useCallback(async () => {
    if (scope === 'workspace' && !currentWorkspaceId) {
      setSavedTerms([]);
      setTermsText('');
      setEffectiveCount(0);
      setSyncStatus(null);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({ scope });
      if (currentWorkspaceId) {
        params.set('workspaceId', currentWorkspaceId);
      }

      const res = await fetch(`/api/asr/vocabulary?${params.toString()}`);
      const data = (await res.json()) as VocabularyResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || '加载自定义词汇失败');
      }

      setSavedTerms(data.terms);
      setTermsText(data.terms.join('\n'));
      setEffectiveCount(data.effectiveCount);
      setSyncStatus(data.syncStatus);
      setMaxTerms(data.limits.maxTerms);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载自定义词汇失败');
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspaceId, scope]);

  useEffect(() => {
    void loadVocabulary();
  }, [loadVocabulary]);

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/asr/vocabulary', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          workspaceId: scope === 'workspace' ? currentWorkspaceId : undefined,
          terms: termsText.split('\n'),
        }),
      });

      const data = (await res.json()) as VocabularyResponse & { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(data.error || '保存自定义词汇失败');
      }

      setSavedTerms(data.terms);
      setTermsText(data.terms.join('\n'));
      setEffectiveCount(data.effectiveCount);
      setSyncStatus(data.syncStatus);
      setSuccess(data.message || '已保存');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存自定义词汇失败');
    } finally {
      setIsSaving(false);
    }
  };

  const helperTone = syncStatus?.supported
    ? 'border-sky-200 bg-sky-50 text-sky-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';

  return (
    <div className="space-y-5 rounded-2xl border border-[#E3D9CE] bg-[#FCFAF8] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="flex items-center gap-2 text-[14px] font-semibold text-[#5C4D42]">
            <BookOpenText size={16} className="text-[#4A3C31]" />
            自定义词汇
          </h4>
          <p className="mt-1 text-[12px] leading-relaxed text-[#8C7A6B]">
            一行一个术语。实际识别时会合并全局词表与当前工作区词表。
          </p>
        </div>
        <div className="rounded-full border border-[#E3D9CE] bg-white px-3 py-1 text-[11px] text-[#8C7A6B]">
          最多 {maxTerms} 个有效词条
        </div>
      </div>

      <div className="inline-flex rounded-2xl border border-[#E3D9CE] bg-white p-1 shadow-sm">
        <button
          onClick={() => setScope('global')}
          className={`rounded-[14px] px-4 py-2 text-sm font-medium transition-all ${
            scope === 'global'
              ? 'bg-[#4A3C31] text-white shadow-sm'
              : 'text-[#8C7A6B] hover:bg-[#F7F3EE] hover:text-[#4A3C31]'
          }`}
        >
          全局通用
        </button>
        <button
          onClick={() => setScope('workspace')}
          disabled={!currentWorkspaceId}
          className={`rounded-[14px] px-4 py-2 text-sm font-medium transition-all ${
            scope === 'workspace'
              ? 'bg-[#4A3C31] text-white shadow-sm'
              : 'text-[#8C7A6B] hover:bg-[#F7F3EE] hover:text-[#4A3C31]'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          当前工作区
        </button>
      </div>

      {scope === 'workspace' && currentWorkspace ? (
        <div className="rounded-xl border border-[#E3D9CE] bg-white px-4 py-3 text-[12px] text-[#8C7A6B]">
          当前工作区：<span className="font-medium text-[#4A3C31]">{currentWorkspace.name}</span>
        </div>
      ) : null}

      <div className={`rounded-xl border px-4 py-3 text-[12px] leading-relaxed ${helperTone}`}>
        {syncStatus?.message || '词汇会保存在本地，阿里云 ASR 可用时自动参与识别。'}
        {syncStatus?.lastError ? (
          <div className="mt-2 rounded-lg bg-white/60 px-3 py-2 text-[11px] text-[#7B5B3B]">
            最近一次同步失败：{syncStatus.lastError}
          </div>
        ) : null}
      </div>

      <label className="block">
        <span className="mb-2 block text-[12px] font-medium text-[#8C7A6B]">词条列表</span>
        <textarea
          value={termsText}
          onChange={(event) => {
            setTermsText(event.target.value);
            setSuccess('');
            setError('');
          }}
          rows={9}
          placeholder="例如：Piedras\nNLS\n专病库\n肿瘤标志物"
          className="w-full resize-none rounded-2xl border border-[#E3D9CE] bg-white px-4 py-3 text-[13px] leading-6 text-[#4A3C31] placeholder:text-[#B4A79A] focus:border-[#BFAE9E] focus:outline-none"
        />
      </label>

      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#F7F3EE] px-3 py-1 text-[11px] text-[#8C7A6B]">
          <Sparkles size={12} />
          当前工作区转写时共生效 {effectiveCount} 个词条
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={isSaving || isLoading || (scope === 'workspace' && !currentWorkspaceId)}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#4A3C31] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#3A2E25] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={15} className="animate-spin" /> : null}
          保存词表
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-600">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="text-[12px] font-medium text-[#8C7A6B]">已保存词条</div>
        {isLoading ? (
          <div className="flex items-center gap-2 rounded-xl border border-[#E3D9CE] bg-white px-4 py-3 text-[12px] text-[#8C7A6B]">
            <Loader2 size={14} className="animate-spin" />
            加载中...
          </div>
        ) : savedTerms.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {savedTerms.map((term) => (
              <span
                key={term}
                className="rounded-full border border-[#E3D9CE] bg-white px-3 py-1.5 text-[12px] text-[#5C4D42]"
              >
                {term}
              </span>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#E3D9CE] bg-white/70 px-4 py-3 text-[12px] text-[#A69B8F]">
            还没有词条，保存后下次阿里云转写会自动带上。
          </div>
        )}
      </div>
    </div>
  );
}
