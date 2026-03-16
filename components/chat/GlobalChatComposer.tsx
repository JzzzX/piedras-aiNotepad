'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2, Mic, Send, SlidersHorizontal } from 'lucide-react';
import { buildGlobalChatCatalogItems } from '@/lib/global-chat-ui';
import type { Collection, GlobalChatFilters, GlobalChatScope, Recipe, Workspace } from '@/lib/types';

export interface GlobalChatSubmitPayload {
  displayText?: string;
  question?: string;
  recipePrompt?: string;
  recipeId?: string;
  templatePrompt?: string;
  templateId?: string;
  nextScope?: GlobalChatScope;
  workspaceId?: string | null;
}

interface GlobalChatComposerProps {
  variant?: 'hero' | 'dock';
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (payload?: GlobalChatSubmitPayload) => void | Promise<void>;
  selectedWorkspaceId: string | null;
  onSelectedWorkspaceChange: (workspaceId: string | null) => void;
  preferredWorkspaceId?: string | null;
  workspaces: Workspace[];
  filters: GlobalChatFilters;
  onFiltersChange: (filters: GlobalChatFilters) => void;
  templates: Recipe[];
  collections: Collection[];
  disabled?: boolean;
  loading?: boolean;
  placeholder: string;
}

function accentClass(accent: 'lime' | 'amber' | 'sky' | 'violet') {
  if (accent === 'lime') return 'bg-lime-400';
  if (accent === 'sky') return 'bg-sky-400';
  if (accent === 'violet') return 'bg-violet-400';
  return 'bg-amber-400';
}

export default function GlobalChatComposer({
  variant = 'hero',
  input,
  onInputChange,
  onSubmit,
  selectedWorkspaceId,
  onSelectedWorkspaceChange,
  preferredWorkspaceId = null,
  workspaces,
  filters,
  onFiltersChange,
  templates: recipes,
  collections,
  disabled = false,
  loading = false,
  placeholder,
}: GlobalChatComposerProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const contextButtonRef = useRef<HTMLButtonElement | null>(null);
  const contextCardRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const dictationBaseRef = useRef('');
  const [showContext, setShowContext] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isDictating, setIsDictating] = useState(false);
  const [commandsDismissed, setCommandsDismissed] = useState(false);

  const commandQuery = input.startsWith('/') ? input.slice(1) : '';
  const showCommands = input.startsWith('/') && !commandsDismissed;
  const commandItems = useMemo(() => {
    const merged = buildGlobalChatCatalogItems(recipes);
    const q = commandQuery.trim().toLowerCase();
    if (!q) return merged;
    return merged.filter((item) =>
      [item.label, item.description, item.command]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q))
    );
  }, [commandQuery, recipes]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  const resizeInput = useCallback(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = 'auto';
    inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    resizeInput();
  }, [input, resizeInput]);

  useEffect(() => {
    if (selectedWorkspaceId) return;
    if (!filters.collectionId) return;
    onFiltersChange({ ...filters, collectionId: '' });
  }, [filters, onFiltersChange, selectedWorkspaceId]);

  useEffect(() => {
    if (!showContext) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (contextCardRef.current?.contains(target)) return;
      if (contextButtonRef.current?.contains(target)) return;
      setShowContext(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowContext(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showContext]);

  const stopDictation = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsDictating(false);
  }, []);

  const toggleDictation = useCallback(() => {
    if (isDictating) {
      stopDictation();
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('当前浏览器不支持语音输入，请使用 Chrome');
      return;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';
    dictationBaseRef.current = input ? `${input.trim()} ` : '';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let index = event.resultIndex; index < event.results.length; index++) {
        transcript += event.results[index][0].transcript;
      }
      onInputChange(`${dictationBaseRef.current}${transcript.trim()}`.trim());
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Global chat dictation error:', event.error);
      if (event.error === 'not-allowed') {
        alert('请允许麦克风权限以使用语音输入');
      }
      stopDictation();
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsDictating(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsDictating(true);
  }, [input, isDictating, onInputChange, stopDictation]);

  const handleTextChange = (value: string) => {
    if (!value.startsWith('/')) {
      setCommandsDismissed(false);
    } else {
      if (value !== input) {
        setCommandsDismissed(false);
      }
      if (!input.startsWith('/')) {
        setSelectedIdx(0);
      }
    }

    onInputChange(value);
  };

  const selectRecipe = async (recipe: Recipe) => {
    const recipeWorkspaceId =
      recipe.kind === 'quick' && recipe.scope === 'my_notes'
        ? selectedWorkspaceId || preferredWorkspaceId || workspaces[0]?.id || null
        : recipe.kind === 'quick'
          ? null
          : selectedWorkspaceId;

    onInputChange('');
    setCommandsDismissed(false);
    onSelectedWorkspaceChange(recipe.kind === 'quick' ? recipeWorkspaceId : selectedWorkspaceId);
    await onSubmit({
      displayText: recipe.name,
      question: recipe.kind === 'quick' ? recipe.prompt : recipe.name,
      recipePrompt: recipe.kind === 'prompt' ? recipe.prompt : undefined,
      recipeId: recipe.kind === 'prompt' ? recipe.id : undefined,
      nextScope:
        recipe.kind === 'quick'
          ? recipeWorkspaceId
            ? recipe.scope
            : 'all_meetings'
          : selectedWorkspaceId
            ? 'my_notes'
            : 'all_meetings',
      workspaceId: recipe.kind === 'quick' ? recipeWorkspaceId : selectedWorkspaceId,
    });
  };

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommands && commandItems.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIdx((prev) => Math.min(prev + 1, commandItems.length - 1));
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIdx((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const selected = commandItems[Math.min(selectedIdx, Math.max(commandItems.length - 1, 0))];
        if (!selected) return;
        await selectRecipe(selected.recipe);
        return;
      }

      if (event.key === 'Escape') {
        setCommandsDismissed(true);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      await onSubmit();
    }
  };

  const cardClassName =
    variant === 'hero'
      ? 'rounded-[28px] border border-[#D8CEC4] bg-white p-4 shadow-[0_12px_36px_rgba(58,46,37,0.08)]'
      : 'rounded-[24px] border border-[#D8CEC4] bg-white p-3 shadow-[0_12px_30px_rgba(58,46,37,0.08)]';
  const activeCommandIdx = Math.min(selectedIdx, Math.max(commandItems.length - 1, 0));
  const contextSummary = useMemo(() => {
    const parts: string[] = [];
    if (selectedWorkspaceId && filters.collectionId) {
      const selectedCollection =
        filters.collectionId === '__ungrouped'
          ? '未归类'
          : collections.find((item) => item.id === filters.collectionId)?.name || '指定 Collection';
      parts.push(selectedCollection);
    }
    if (filters.dateFrom || filters.dateTo) {
      parts.push('时间范围');
    }
    return parts.length > 0 ? parts.join(' · ') : '';
  }, [collections, filters.collectionId, filters.dateFrom, filters.dateTo, selectedWorkspaceId]);

  return (
    <div className="relative">
      <div className={cardClassName}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">选择聊天工作区范围</span>
            <select
              value={selectedWorkspaceId || '__all__'}
              onChange={(event) =>
                onSelectedWorkspaceChange(
                  event.target.value === '__all__' ? null : event.target.value
                )
              }
              className="appearance-none rounded-full border border-[#E3D9CE] bg-[#F8F4EF] px-4 py-2 pr-10 text-[12px] text-[#3A2E25] focus:border-[#BFAE9E] focus:outline-none"
            >
              <option value="__all__">全部工作区</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8C7A6B]"
            />
          </label>

          <button
            type="button"
            ref={contextButtonRef}
            onClick={() => setShowContext((value) => !value)}
            className="inline-flex items-center gap-1 rounded-full border border-[#E3D9CE] bg-[#FBF8F4] px-3 py-2 text-[12px] text-[#6B5C50] transition-colors hover:bg-white"
          >
            <SlidersHorizontal size={13} />
            Add context
            {contextSummary ? <span className="text-[#A08C79]">{contextSummary}</span> : null}
            <ChevronDown size={12} />
          </button>
        </div>

        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => handleTextChange(event.target.value)}
            onKeyDown={(event) => {
              void handleKeyDown(event);
            }}
            placeholder={placeholder}
            disabled={disabled || loading}
            rows={1}
            className="min-h-[72px] flex-1 resize-none bg-transparent px-2 py-2 text-[16px] leading-7 text-[#3A2E25] placeholder:text-[#B4A79A] focus:outline-none disabled:opacity-50"
          />

          <button
            type="button"
            onClick={toggleDictation}
            disabled={disabled || loading}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all ${
              isDictating
                ? 'bg-sky-500 text-white shadow-md'
                : 'bg-[#F7F3EE] text-[#8C7A6B] hover:bg-sky-50 hover:text-sky-500'
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <Mic size={18} />
          </button>

          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={disabled || loading || !input.trim()}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all ${
              input.trim() && !loading && !disabled
                ? 'bg-[#3A2E25] text-white shadow-md hover:bg-[#2B2420]'
                : 'bg-[#F7F3EE] text-[#B4A79A]'
            }`}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>

      {showContext ? (
        <div
          ref={contextCardRef}
          className="absolute left-0 right-0 top-[calc(100%+12px)] z-20 rounded-[24px] border border-[#E3D9CE] bg-[#FCFAF7] p-4 shadow-[0_22px_48px_rgba(58,46,37,0.14)]"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {selectedWorkspaceId ? (
              <label className="text-[12px] text-[#8C7A6B]">
                Collection
                <select
                  value={filters.collectionId || ''}
                  onChange={(event) =>
                    onFiltersChange({ ...filters, collectionId: event.target.value })
                  }
                  className="mt-1.5 w-full rounded-xl border border-[#E3D9CE] bg-white px-3 py-2.5 text-sm text-[#3A2E25] focus:border-[#BFAE9E] focus:outline-none"
                >
                  <option value="">全部 Collections</option>
                  <option value="__ungrouped">未归类</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="rounded-xl border border-dashed border-[#E3D9CE] bg-white/70 px-3 py-3 text-[12px] leading-6 text-[#9A8877]">
                选中全部工作区时，不提供 Collection 筛选。
              </div>
            )}

            <label className="text-[12px] text-[#8C7A6B]">
              开始日期
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(event) =>
                  onFiltersChange({ ...filters, dateFrom: event.target.value })
                }
                className="mt-1.5 w-full rounded-xl border border-[#E3D9CE] bg-white px-3 py-2.5 text-sm text-[#3A2E25] focus:border-[#BFAE9E] focus:outline-none"
              />
            </label>
            <label className="text-[12px] text-[#8C7A6B]">
              结束日期
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(event) =>
                  onFiltersChange({ ...filters, dateTo: event.target.value })
                }
                className="mt-1.5 w-full rounded-xl border border-[#E3D9CE] bg-white px-3 py-2.5 text-sm text-[#3A2E25] focus:border-[#BFAE9E] focus:outline-none"
              />
            </label>
          </div>
        </div>
      ) : null}

      {showCommands ? (
        <div className="absolute left-0 right-0 top-[calc(100%+12px)] z-30 overflow-hidden rounded-[24px] border border-[#E3D9CE] bg-white shadow-[0_24px_60px_rgba(58,46,37,0.16)]">
          <div className="border-b border-[#EFE7DE] px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-[#A69B8F]">
            Recipes
          </div>
          <div className="max-h-[360px] overflow-y-auto p-2">
            {commandItems.length === 0 ? (
              <div className="px-4 py-6 text-sm text-[#A69B8F]">没有匹配的 recipes</div>
            ) : (
              <div className="space-y-1">
                {commandItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      void selectRecipe(item.recipe);
                    }}
                    className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-all ${
                      index === activeCommandIdx ? 'bg-[#F7F3EE]' : 'hover:bg-[#FBF8F4]'
                    }`}
                  >
                    <div className={`mt-0.5 h-8 w-1.5 rounded-full ${accentClass(item.accent)}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-semibold text-[#3A2E25]">
                          {item.label}
                        </span>
                        {item.command ? (
                          <code className="rounded-md bg-[#F7F3EE] px-1.5 py-0.5 text-[10px] text-[#8C7A6B]">
                            {item.command}
                          </code>
                        ) : null}
                        <span className="rounded-full bg-[#F1EBE3] px-2 py-0.5 text-[10px] text-[#8C7A6B]">
                          {item.sourceLabel}
                        </span>
                        {item.recipe.kind === 'quick' ? (
                          <span className="rounded-full bg-[#FFF5DF] px-2 py-0.5 text-[10px] text-[#AD7A1C]">
                            快捷
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[12px] leading-5 text-[#8C7A6B]">
                        {item.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
