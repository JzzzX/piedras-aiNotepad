'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Tags, Trash2 } from 'lucide-react';
import type { GlossaryTerm } from '@/lib/types';
import { useMeetingStore } from '@/lib/store';

const STORAGE_KEY = 'ai-notepad-asr-settings-v1';

export default function GlossaryManager() {
  const { asrSettings, setAsrSettings } = useMeetingStore();
  const [items, setItems] = useState<GlossaryTerm[]>([]);
  const [term, setTerm] = useState('');
  const [pronunciation, setPronunciation] = useState('');
  const [category, setCategory] = useState('通用');
  const [bulkInput, setBulkInput] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settingsHydrated, setSettingsHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<typeof asrSettings>;
        if (typeof parsed.vocabularyId === 'string') {
          setAsrSettings({ vocabularyId: parsed.vocabularyId });
        }
      }
    } catch {
      // ignore invalid local storage
    } finally {
      setSettingsHydrated(true);
    }
  }, [setAsrSettings]);

  useEffect(() => {
    if (!settingsHydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(asrSettings));
  }, [asrSettings, settingsHydrated]);

  const loadGlossary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/glossary');
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        throw new Error(data.error || '加载术语失败');
      }
      setItems(data as GlossaryTerm[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载术语失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGlossary();
  }, [loadGlossary]);

  const groupedCount = useMemo(() => {
    return items.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});
  }, [items]);

  const handleAdd = async () => {
    if (!term.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/glossary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term,
          pronunciation,
          category,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || '保存术语失败');
      }
      setTerm('');
      setPronunciation('');
      setCategory('通用');
      await loadGlossary();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存术语失败');
      setLoading(false);
    }
  };

  const handleBulkImport = async () => {
    const lines = bulkInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    const items = lines
      .map((line) => {
        const [termValue, pronunciationValue, categoryValue] = line.split('|');
        if (!termValue?.trim()) return null;
        return {
          term: termValue.trim(),
          pronunciation: pronunciationValue?.trim() || undefined,
          category: categoryValue?.trim() || '通用',
        };
      })
      .filter(Boolean);

    if (items.length === 0) {
      setError('批量导入格式无效，请使用：术语|读音|分类');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/glossary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || '批量导入失败');
      }
      setBulkInput('');
      setShowBulkInput(false);
      await loadGlossary();
    } catch (e) {
      setError(e instanceof Error ? e.message : '批量导入失败');
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/glossary/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '删除术语失败');
      }
      await loadGlossary();
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除术语失败');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-[#D8CEC4] bg-[#FCFAF8] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#5C4D42]">
          <Tags size={13} className="text-amber-500" />
          术语热词增强
        </div>
        <button
          type="button"
          onClick={() => setShowBulkInput((value) => !value)}
          className="rounded-lg px-2 py-1 text-[11px] font-medium text-[#8C7A6B] transition-colors hover:bg-[#F7F3EE] hover:text-[#4A3C31]"
        >
          {showBulkInput ? '收起导入' : '批量导入'}
        </button>
      </div>

      <p className="text-[11px] leading-relaxed text-[#8C7A6B]">
        当前术语会注入 AI 总结、会议问答和自动标题生成，提升术语一致性。
      </p>

      <label className="block space-y-1">
        <span className="text-xs text-[#8C7A6B]">阿里云热词表 ID（可选）</span>
        <input
          value={asrSettings.vocabularyId}
          onChange={(event) => setAsrSettings({ vocabularyId: event.target.value })}
          placeholder="如果已在阿里云配置热词表，可填写 vocabulary_id"
          className="w-full rounded-xl border border-[#D8CEC4] bg-white px-3 py-2 text-sm text-[#4A3C31] placeholder:text-[#C4B6A9] focus:border-[#BFAE9E] focus:outline-none"
        />
        <p className="text-[11px] leading-relaxed text-[#A69B8F]">
          这里填写的是阿里云实时转写使用的 `vocabulary_id`。术语列表本身仍会继续用于 LLM
          总结和问答。
        </p>
      </label>

      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto]">
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="术语，例如：OneID"
          className="rounded-xl border border-[#D8CEC4] bg-white px-3 py-2 text-sm text-[#4A3C31] placeholder:text-[#C4B6A9] focus:border-[#BFAE9E] focus:outline-none"
        />
        <input
          value={pronunciation}
          onChange={(event) => setPronunciation(event.target.value)}
          placeholder="读音（可选）"
          className="rounded-xl border border-[#D8CEC4] bg-white px-3 py-2 text-sm text-[#4A3C31] placeholder:text-[#C4B6A9] focus:border-[#BFAE9E] focus:outline-none"
        />
        <input
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="分类"
          className="rounded-xl border border-[#D8CEC4] bg-white px-3 py-2 text-sm text-[#4A3C31] placeholder:text-[#C4B6A9] focus:border-[#BFAE9E] focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1 rounded-xl bg-sky-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-400 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          添加
        </button>
      </div>

      {showBulkInput && (
        <div className="space-y-2 rounded-xl border border-dashed border-[#D8CEC4] bg-[#F7F3EE]/70 p-3">
          <textarea
            value={bulkInput}
            onChange={(event) => setBulkInput(event.target.value)}
            placeholder={"每行一条，格式：术语|读音|分类\n例如：OneID|万艾迪|账号体系"}
            rows={4}
            className="w-full rounded-xl border border-[#D8CEC4] bg-white px-3 py-2 text-sm text-[#4A3C31] placeholder:text-[#C4B6A9] focus:border-[#BFAE9E] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void handleBulkImport()}
            disabled={loading}
            className="rounded-xl border border-[#D8CEC4] bg-white px-3 py-2 text-sm font-medium text-[#5C4D42] transition-colors hover:bg-[#EFE9E2] disabled:opacity-50"
          >
            批量导入
          </button>
        </div>
      )}

      {error ? <p className="text-xs text-red-500">{error}</p> : null}

      <div className="flex flex-wrap gap-2 text-[11px] text-[#8C7A6B]">
        {Object.entries(groupedCount).map(([group, count]) => (
          <span key={group} className="rounded-full bg-[#F7F3EE] px-2.5 py-1">
            {group} · {count}
          </span>
        ))}
      </div>

      <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
        {items.length === 0 && !loading ? (
          <p className="rounded-xl border border-dashed border-[#D8CEC4] px-3 py-4 text-center text-xs text-[#A69B8F]">
            暂无术语热词，添加后会用于 AI 理解和标题生成。
          </p>
        ) : null}

        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-[#E3D9CE] bg-white px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-[#4A3C31]">{item.term}</span>
                <span className="rounded-full bg-[#F7F3EE] px-2 py-0.5 text-[10px] text-[#8C7A6B]">
                  {item.category}
                </span>
                {item.pronunciation ? (
                  <span className="text-[11px] text-[#A69B8F]">{item.pronunciation}</span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleDelete(item.id)}
              className="rounded-lg p-1.5 text-[#A69B8F] transition-colors hover:bg-red-50 hover:text-red-500"
              title="删除术语"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
