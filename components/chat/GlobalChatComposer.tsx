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
  workspaces: Workspace[];
  filters: GlobalChatFilters;
  onFiltersChange: (filters: GlobalChatFilters) => void;
  templates: Recipe[];
  collections: Collection[];
  disabled?: boolean;
  loading?: boolean;
  placeholder: string;
}

function accentClass(accent: 'system' | 'custom') {
  return accent === 'system' ? 'bg-[#D8C2A8]' : 'bg-[#CFC6BC]';
}

export default function GlobalChatComposer({
  variant = 'hero',
  input,
  onInputChange,
  onSubmit,
  selectedWorkspaceId,
  onSelectedWorkspaceChange,
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
    const recipeWorkspaceId = selectedWorkspaceId;
    const nextScope = selectedWorkspaceId ? 'my_notes' : 'all_meetings';

    onInputChange('');
    setCommandsDismissed(false);
    onSelectedWorkspaceChange(recipeWorkspaceId);
    await onSubmit({
      displayText: recipe.name,
      question: recipe.starterQuestion?.trim() || recipe.name,
      recipePrompt: recipe.prompt,
      recipeId: recipe.id,
      nextScope,
      workspaceId: nextScope === 'my_notes' ? recipeWorkspaceId : null,
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
      ? 'rounded-none border-2 border-[#111] bg-[#F4F0E6] p-4 shadow-[4px_4px_0px_#111]'
      : 'rounded-none border-2 border-[#111] bg-[#F4F0E6] p-3 shadow-[4px_4px_0px_#111]';
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
              className="appearance-none rounded-none border-2 border-[#111] bg-[#EAE3D2] px-4 py-2 pr-10 text-[12px] text-[#111] focus:outline-none"
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
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8A8578]"
            />
          </label>

          <button
            type="button"
            ref={contextButtonRef}
            onClick={() => setShowContext((value) => !value)}
            className="inline-flex items-center gap-1 rounded-none border-2 border-[#111] bg-[#F4F0E6] px-3 py-2 text-[12px] text-[#111] transition-colors hover:bg-[#EAE3D2]"
          >
            <SlidersHorizontal size={13} />
            Add context
            {contextSummary ? <span className="text-[#8A8578]">{contextSummary}</span> : null}
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
            className="min-h-[72px] flex-1 resize-none bg-transparent px-2 py-2 text-[16px] leading-7 text-[#111] placeholder:text-[#8A8578] focus:outline-none disabled:opacity-50"
          />

          <button
            type="button"
            onClick={toggleDictation}
            disabled={disabled || loading}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-none border-2 border-[#111] transition-all ${
              isDictating
                ? 'bg-[#D9423E] text-[#F4F0E6] shadow-[2px_2px_0px_#111]'
                : 'bg-[#EAE3D2] text-[#8A8578] hover:bg-[#D9423E]/10 hover:text-[#D9423E]'
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <Mic size={18} />
          </button>

          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={disabled || loading || !input.trim()}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-none border-2 border-[#111] transition-all ${
              input.trim() && !loading && !disabled
                ? 'bg-[#111] text-[#F4F0E6] shadow-[2px_2px_0px_#555] hover:bg-[#333]'
                : 'bg-[#EAE3D2] text-[#8A8578]'
            }`}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>

      {showContext ? (
        <div
          ref={contextCardRef}
          className="absolute left-0 right-0 top-[calc(100%+12px)] z-20 rounded-none border-2 border-[#111] bg-[#F4F0E6] p-4 shadow-[4px_4px_0px_#111]"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {selectedWorkspaceId ? (
              <label className="text-[12px] text-[#8A8578]">
                Collection
                <select
                  value={filters.collectionId || ''}
                  onChange={(event) =>
                    onFiltersChange({ ...filters, collectionId: event.target.value })
                  }
                  className="mt-1.5 w-full rounded-none border-2 border-[#111] bg-[#F4F0E6] px-3 py-2.5 text-sm text-[#111] focus:outline-none"
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
              <div className="rounded-none border-2 border-dashed border-[#111] bg-[#F4F0E6]/70 px-3 py-3 text-[12px] leading-6 text-[#8A8578]">
                选中全部工作区时，不提供 Collection 筛选。
              </div>
            )}

            <label className="text-[12px] text-[#8A8578]">
              开始日期
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(event) =>
                  onFiltersChange({ ...filters, dateFrom: event.target.value })
                }
                className="mt-1.5 w-full rounded-none border-2 border-[#111] bg-[#F4F0E6] px-3 py-2.5 text-sm text-[#111] focus:outline-none"
              />
            </label>
            <label className="text-[12px] text-[#8A8578]">
              结束日期
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(event) =>
                  onFiltersChange({ ...filters, dateTo: event.target.value })
                }
                className="mt-1.5 w-full rounded-none border-2 border-[#111] bg-[#F4F0E6] px-3 py-2.5 text-sm text-[#111] focus:outline-none"
              />
            </label>
          </div>
        </div>
      ) : null}

      {showCommands ? (
        <div className="absolute left-0 right-0 top-[calc(100%+12px)] z-30 overflow-hidden rounded-none border-2 border-[#111] bg-[#F4F0E6] shadow-[4px_4px_0px_#111]">
          <div className="border-b-2 border-[#111] px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-[#8A8578]">
            Recipes
          </div>
          <div className="max-h-[360px] overflow-y-auto p-2">
            {commandItems.length === 0 ? (
              <div className="px-4 py-6 text-sm text-[#8A8578]">没有匹配的 recipes</div>
            ) : (
              <div className="space-y-1">
                {commandItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      void selectRecipe(item.recipe);
                    }}
                    className={`flex w-full items-start gap-3 rounded-none px-3 py-3 text-left transition-all ${
                      index === activeCommandIdx ? 'bg-[#EAE3D2] border-2 border-[#111]' : 'hover:bg-[#EAE3D2]'
                    }`}
                  >
                    <div className={`mt-0.5 h-8 w-1.5 rounded-none ${accentClass(item.accent)}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-semibold text-[#111]">
                          {item.label}
                        </span>
                        {item.command ? (
                          <code className="rounded-none bg-[#EAE3D2] px-1.5 py-0.5 text-[10px] text-[#8A8578] border border-[#111]">
                            {item.command}
                          </code>
                        ) : null}
                        {!item.recipe.isSystem ? (
                          <span className="rounded-none bg-[#EAE3D2] px-2 py-0.5 text-[10px] text-[#8A8578] border border-[#111]">
                            {item.sourceLabel}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[12px] leading-5 text-[#8A8578]">
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
