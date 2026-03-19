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

function formatVocabularyError(error: unknown) {
  const message = error instanceof Error ? error.message : '加载自定义词汇失败';

  if (message.includes("Cannot read properties of undefined (reading 'findMany')")) {
    return '本地开发服务还没加载到最新数据库结构。重启 `npm run dev` 后再试即可。';
  }

  return message;
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
      setError(formatVocabularyError(loadError));
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
      setError(formatVocabularyError(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  const helperTone = syncStatus?.supported
    ? 'border-[#111] bg-[#D9423E]/10 text-[#D9423E]'
    : 'border-[#111] bg-amber-50 text-amber-700';

  return (
    <div className="space-y-5 rounded-none border-2 border-[#111] bg-[#F4F0E6] p-5 shadow-[4px_4px_0px_#111]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="flex items-center gap-2 text-[14px] font-semibold text-[#111]">
            <BookOpenText size={16} className="text-[#111]" />
            自定义词汇
          </h4>
          <p className="mt-1 text-[12px] leading-relaxed text-[#8A8578]">
            把常被识别错的行业术语写在这里，一行一个。
          </p>
        </div>
        <div className="rounded-none border-2 border-[#111] bg-[#F4F0E6] px-3 py-1 text-[11px] text-[#8A8578]">
          最多 {maxTerms} 个有效词条
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-none border-2 border-[#111] bg-[#F4F0E6] px-4 py-3 text-[12px] leading-relaxed text-[#111]">
          开始阿里云转写时，Piedras 会把这些词作为"热词"提交，识别时会优先参考这些写法。
        </div>
        <div className="rounded-none border-2 border-[#111] bg-[#F4F0E6] px-4 py-3 text-[12px] leading-relaxed text-[#111]">
          `全局通用` 对所有会议生效；`当前工作区` 只对这个工作区生效。实际转写时会合并两者。
        </div>
      </div>

      <div className="inline-flex rounded-none border-2 border-[#111] bg-[#F4F0E6] p-1 shadow-[2px_2px_0px_#111]">
        <button
          onClick={() => setScope('global')}
          className={`rounded-none px-4 py-2 text-sm font-medium transition-all ${
            scope === 'global'
              ? 'bg-[#111] text-[#F4F0E6] shadow-none'
              : 'text-[#8A8578] hover:bg-[#EAE3D2] hover:text-[#111]'
          }`}
        >
          全局通用
        </button>
        <button
          onClick={() => setScope('workspace')}
          disabled={!currentWorkspaceId}
          className={`rounded-none px-4 py-2 text-sm font-medium transition-all ${
            scope === 'workspace'
              ? 'bg-[#111] text-[#F4F0E6] shadow-none'
              : 'text-[#8A8578] hover:bg-[#EAE3D2] hover:text-[#111]'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          当前工作区
        </button>
      </div>

      {scope === 'workspace' && currentWorkspace ? (
        <div className="rounded-none border-2 border-[#111] bg-[#F4F0E6] px-4 py-3 text-[12px] text-[#8A8578]">
          当前工作区：<span className="font-medium text-[#111]">{currentWorkspace.name}</span>
        </div>
      ) : null}

      <div className={`rounded-none border-2 px-4 py-3 text-[12px] leading-relaxed ${helperTone}`}>
        {syncStatus?.message || '词汇会先保存在本地。阿里云 ASR 可用时，Piedras 会在开始转写时自动带上这些词。'}
        {syncStatus?.lastError ? (
          <div className="mt-2 rounded-none bg-[#F4F0E6]/60 px-3 py-2 text-[11px] text-[#111] border border-[#111]">
            最近一次同步失败：{syncStatus.lastError}
          </div>
        ) : null}
      </div>

      <label className="block">
        <span className="mb-2 block text-[12px] font-medium text-[#8A8578]">术语列表</span>
        <textarea
          value={termsText}
          onChange={(event) => {
            setTermsText(event.target.value);
            setSuccess('');
            setError('');
          }}
          rows={9}
          placeholder={'每行一个术语，例如：\nPiedras\nNLS\n专病库\n肿瘤标志物'}
          className="w-full resize-none rounded-none border-2 border-[#111] bg-[#F4F0E6] px-4 py-3 text-[13px] leading-6 text-[#111] placeholder:text-[#8A8578] focus:outline-none"
        />
      </label>

      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-none bg-[#EAE3D2] px-3 py-1 text-[11px] text-[#8A8578] border-2 border-[#111]">
          <Sparkles size={12} />
          当前工作区转写时共生效 {effectiveCount} 个词条
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={isSaving || isLoading || (scope === 'workspace' && !currentWorkspaceId)}
          className="inline-flex items-center gap-2 rounded-none bg-[#111] px-4 py-2.5 text-sm font-medium text-[#F4F0E6] transition-all hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-50 border-2 border-[#111] shadow-[4px_4px_0px_#555]"
        >
          {isSaving ? <Loader2 size={15} className="animate-spin" /> : null}
          保存词表
        </button>
      </div>

      {error ? (
        <div className="rounded-none border-2 border-[#D9423E] bg-[#D9423E]/10 px-4 py-3 text-[12px] text-[#D9423E]">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-none border-2 border-emerald-600 bg-emerald-50 px-4 py-3 text-[12px] text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="text-[12px] font-medium text-[#8A8578]">已保存词条</div>
        {isLoading ? (
          <div className="flex items-center gap-2 rounded-none border-2 border-[#111] bg-[#F4F0E6] px-4 py-3 text-[12px] text-[#8A8578]">
            <Loader2 size={14} className="animate-spin" />
            加载中...
          </div>
        ) : savedTerms.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {savedTerms.map((term) => (
              <span
                key={term}
                className="rounded-none border-2 border-[#111] bg-[#F4F0E6] px-3 py-1.5 text-[12px] text-[#111]"
              >
                {term}
              </span>
            ))}
          </div>
        ) : (
          <div className="rounded-none border-2 border-dashed border-[#111] bg-[#F4F0E6]/70 px-4 py-3 text-[12px] text-[#8A8578]">
            还没有词条，保存后下次阿里云转写会自动带上。
          </div>
        )}
      </div>
    </div>
  );
}
