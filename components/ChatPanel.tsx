'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  Globe2,
  MessageSquare,
  ListFilter,
  LayoutTemplate,
  Mic,
  RotateCcw,
  Settings2,
  X,
} from 'lucide-react';
import { useMeetingStore } from '@/lib/store';
import { chatAcrossMeetings, chatWithMeeting } from '@/lib/llm';
import { filterTemplates } from '@/lib/templates';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage, Recipe } from '@/lib/types';
import TemplateManager from './TemplateManager';
import TooltipIconButton from './TooltipIconButton';
import PromptSettings from './PromptSettings';
import SpeakerManager from './SpeakerManager';

type ChatMode = 'meeting' | 'global';

interface ChatPanelProps {
  onClose?: () => void;
}

export default function ChatPanel({ onClose }: ChatPanelProps = {}) {
  const {
    segments,
    userNotes,
    enhancedNotes,
    chatMessages,
    isChatLoading,
    speakers,
    promptOptions,
    llmSettings,
    status,
    collections,
    addChatMessage,
    loadCollections,
    setIsChatLoading,
  } = useMeetingStore();

  const [chatMode, setChatMode] = useState<ChatMode>('meeting');
  const [globalMessages, setGlobalMessages] = useState<ChatMessage[]>([]);
  const [isGlobalChatLoading, setIsGlobalChatLoading] = useState(false);
  const [input, setInput] = useState('');
  const [templates, setTemplates] = useState<Recipe[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateFilter, setTemplateFilter] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);

  const [showGlobalFilters, setShowGlobalFilters] = useState(false);
  const [globalDateFrom, setGlobalDateFrom] = useState('');
  const [globalDateTo, setGlobalDateTo] = useState('');
  const [globalCollectionFilter, setGlobalCollectionFilter] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dictationRecognitionRef = useRef<SpeechRecognition | null>(null);
  const dictationBaseRef = useRef('');
  const [isDictating, setIsDictating] = useState(false);

  const resetInputHeight = () => {
    if (!inputRef.current) return;
    inputRef.current.style.height = '44px';
  };

  const loadTemplates = useCallback(async () => {
    setTemplatesError('');
    try {
      const res = await fetch('/api/recipes');
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        throw new Error(data.error || '加载 Recipe 失败');
      }
      setTemplates((data as Recipe[]).filter((recipe) => recipe.surfaces === 'chat' || recipe.surfaces === 'both'));
    } catch (e) {
      setTemplates([]);
      setTemplatesError(e instanceof Error ? e.message : '加载 Recipe 失败');
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  const filteredTemplates = useMemo(() => {
    return filterTemplates(templates, templateFilter);
  }, [templateFilter, templates]);

  const activeMessages = chatMode === 'global' ? globalMessages : chatMessages;
  const activeLoading = chatMode === 'global' ? isGlobalChatLoading : isChatLoading;
  const activeGlobalFilterCount = useMemo(
    () => [globalDateFrom, globalDateTo, globalCollectionFilter].filter(Boolean).length,
    [globalDateFrom, globalDateTo, globalCollectionFilter]
  );
  const hasActiveGlobalFilters = activeGlobalFilterCount > 0;

  const handleResetGlobalFilters = useCallback(() => {
    setGlobalDateFrom('');
    setGlobalDateTo('');
    setGlobalCollectionFilter('');
  }, []);

  // 自动滚动
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeMessages]);

  // 输入框 "/" 触发模版选择（仅会议模式）
  useEffect(() => {
    if (chatMode === 'meeting' && input.startsWith('/')) {
      setShowTemplates(true);
      setTemplateFilter(input.slice(1));
      setSelectedIdx(0);
      return;
    }
    setShowTemplates(false);
  }, [chatMode, input]);

  // 保护 selectedIdx 不越界
  useEffect(() => {
    if (selectedIdx > filteredTemplates.length - 1) {
      setSelectedIdx(Math.max(filteredTemplates.length - 1, 0));
    }
  }, [selectedIdx, filteredTemplates.length]);

  const switchMode = (mode: ChatMode) => {
    if (mode === chatMode) return;
    if (dictationRecognitionRef.current) {
      dictationRecognitionRef.current.onend = null;
      dictationRecognitionRef.current.stop();
      dictationRecognitionRef.current = null;
      setIsDictating(false);
    }
    setChatMode(mode);
    setInput('');
    resetInputHeight();
    setShowTemplates(false);
    setTemplateFilter('');
    setSelectedIdx(0);
  };

  const handleSend = async (
    displayText?: string,
    templatePrompt?: string,
    templateId?: string
  ) => {
    const question = displayText || input.trim();
    if (!question || activeLoading) return;

    if (dictationRecognitionRef.current) {
      dictationRecognitionRef.current.onend = null;
      dictationRecognitionRef.current.stop();
      dictationRecognitionRef.current = null;
      setIsDictating(false);
    }

    setInput('');
    resetInputHeight();
    setShowTemplates(false);

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: question,
      timestamp: Date.now(),
      templateId,
    };

    if (chatMode === 'global') {
      setGlobalMessages((prev) => [...prev, userMessage]);
      setIsGlobalChatLoading(true);
    } else {
      addChatMessage(userMessage);
      setIsChatLoading(true);
    }

    try {
      const stream =
        chatMode === 'global'
          ? await chatAcrossMeetings(
              globalMessages,
              question,
              {
                dateFrom: globalDateFrom,
                dateTo: globalDateTo,
                collectionId: globalCollectionFilter || undefined,
              },
              promptOptions,
              llmSettings
            )
          : await chatWithMeeting(
              segments,
              userNotes,
              enhancedNotes,
              chatMessages,
              templatePrompt || question,
              speakers,
              templatePrompt,
              promptOptions,
              llmSettings
            );

      if (!stream) {
        throw new Error('No stream');
      }

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      const msgId = uuidv4();

      const assistantPlaceholder: ChatMessage = {
        id: msgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      if (chatMode === 'global') {
        setGlobalMessages((prev) => [...prev, assistantPlaceholder]);
      } else {
        addChatMessage(assistantPlaceholder);
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullContent += decoder.decode(value, { stream: true });

        if (chatMode === 'global') {
          setGlobalMessages((prev) =>
            prev.map((m) => (m.id === msgId ? { ...m, content: fullContent } : m))
          );
        } else {
          useMeetingStore.setState((state) => ({
            chatMessages: state.chatMessages.map((m) =>
              m.id === msgId ? { ...m, content: fullContent } : m
            ),
          }));
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const detail = error instanceof Error ? error.message : '未知错误';
      const errMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `抱歉，请求出错了。\n\n${detail}`,
        timestamp: Date.now(),
      };

      if (chatMode === 'global') {
        setGlobalMessages((prev) => [...prev, errMessage]);
      } else {
        addChatMessage(errMessage);
      }
    } finally {
      if (chatMode === 'global') {
        setIsGlobalChatLoading(false);
      } else {
        setIsChatLoading(false);
      }
    }
  };

  const selectTemplate = (template: Recipe) => {
    setShowTemplates(false);
    setInput('');
    resetInputHeight();
    handleSend(template.name, template.prompt, template.id);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    if (!inputRef.current) return;
    inputRef.current.style.height = 'auto';
    inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
  };

  const stopDictation = useCallback(() => {
    if (dictationRecognitionRef.current) {
      dictationRecognitionRef.current.onend = null;
      dictationRecognitionRef.current.stop();
      dictationRecognitionRef.current = null;
    }
    setIsDictating(false);
  }, []);

  const startDictation = useCallback(() => {
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

      handleInputChange(`${dictationBaseRef.current}${transcript.trim()}`.trim());
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Dictation error:', event.error);
      if (event.error === 'not-allowed') {
        alert('请允许麦克风权限以使用语音输入');
      }
      stopDictation();
    };

    recognition.onend = () => {
      dictationRecognitionRef.current = null;
      setIsDictating(false);
    };

    recognition.start();
    dictationRecognitionRef.current = recognition;
    setIsDictating(true);
  }, [input, stopDictation]);

  const toggleDictation = () => {
    if (isDictating) {
      stopDictation();
      return;
    }
    startDictation();
  };

  useEffect(() => {
    return () => {
      stopDictation();
    };
  }, [stopDictation]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (chatMode === 'meeting' && showTemplates && filteredTemplates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, filteredTemplates.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        selectTemplate(filteredTemplates[selectedIdx]);
      } else if (e.key === 'Escape') {
        setShowTemplates(false);
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasMeetingContent = segments.length > 0 || status !== 'idle';
  const canAsk = chatMode === 'global' ? true : hasMeetingContent;

  return (
    <div className="relative flex h-full flex-col bg-transparent">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.04] px-4 py-4 sm:px-6 sm:py-5">
        <h3 className="font-song flex items-center text-[15px] font-semibold text-stone-800">
          <Sparkles size={16} className="mr-2 text-sky-400" />
          AI 助手
        </h3>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
          <div className="flex flex-1 items-center rounded-xl border border-black/[0.02] bg-[#F9F8F6] p-1 sm:flex-none">
            <button
              onClick={() => switchMode('meeting')}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:flex-none ${
                chatMode === 'meeting'
                  ? 'bg-white text-stone-800 shadow-sm border border-black/[0.04]'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
              title="当前会议"
            >
              <MessageSquare size={12} className="mr-1.5 inline" />
              当前
            </button>
            <button
              onClick={() => switchMode('global')}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:flex-none ${
                chatMode === 'global'
                  ? 'bg-white text-stone-800 shadow-sm border border-black/[0.04]'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
              title="跨会议"
            >
              <Globe2 size={12} className="mr-1.5 inline" />
              全局
            </button>
          </div>

          {chatMode === 'meeting' ? (
            <div className="flex items-center gap-1 sm:gap-2">
              <TooltipIconButton
                onClick={() => setShowAISettings(true)}
                label="AI 设置"
                tooltipSide="bottom"
                className="rounded-xl p-2 text-stone-400 transition-colors hover:bg-[#F9F8F6] hover:text-stone-600"
              >
                <Settings2 size={16} />
              </TooltipIconButton>
              <TooltipIconButton
                onClick={() => setShowTemplateManager(true)}
                label="Recipe 管理"
                tooltipSide="bottom"
                className="rounded-xl p-2 text-stone-400 transition-colors hover:bg-[#F9F8F6] hover:text-stone-600"
              >
                <LayoutTemplate size={16} />
              </TooltipIconButton>
            </div>
          ) : (
            <TooltipIconButton
              onClick={() => setShowGlobalFilters((v) => !v)}
              label="筛选条件"
              tooltipSide="bottom"
              className={`relative rounded-xl border p-2 transition-all ${
                showGlobalFilters
                  ? 'border-[#CFC2B5] bg-[#F7F1EA] text-stone-700 shadow-sm'
                  : hasActiveGlobalFilters
                    ? 'border-[#D8CEC4] bg-[#FBF7F2] text-stone-700 hover:border-[#C8B9AA] hover:bg-[#F7F1EA]'
                    : 'border-transparent text-stone-400 hover:border-[#E5DDD5] hover:bg-[#F9F8F6] hover:text-stone-600'
              }`}
            >
              <ListFilter size={16} />
              {hasActiveGlobalFilters && (
                <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-stone-800 px-1 text-[10px] font-semibold text-white shadow-sm">
                  {activeGlobalFilterCount}
                </span>
              )}
            </TooltipIconButton>
          )}

          {onClose && (
            <div className="w-px h-4 bg-black/[0.04] ml-1 mr-1" />
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
              title="关闭"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        className={`flex-1 px-4 py-5 sm:px-7 sm:py-8 ${
          activeMessages.length === 0
            ? 'overflow-hidden pb-24 sm:pb-28'
            : 'space-y-6 overflow-y-auto pb-36 sm:pb-32'
        }`}
      >
        {activeMessages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-start px-2 pt-6 text-stone-400 sm:pt-10">
            <div className="w-full max-w-[360px] rounded-[28px] border border-dashed border-stone-200/90 bg-[#FCFBF8] px-5 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:px-8 sm:py-10">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[20px] border border-sky-100/50 bg-sky-50 shadow-sm">
                <Bot size={20} className="text-sky-400" strokeWidth={2} />
              </div>
              <p className="font-song mb-2 text-center text-[17px] font-semibold text-stone-700">
                {chatMode === 'meeting' ? '会议专属助手' : '全局知识库'}
              </p>
              <p className="mx-auto mb-7 max-w-[240px] text-center text-[13px] leading-6 text-stone-400">
                {chatMode === 'meeting'
                  ? hasMeetingContent
                    ? '围绕当前会议提问，提炼决策、行动项与结论。'
                    : '开录后即可围绕当前会议提问，快速提炼重点。'
                  : '跨会议提问，快速召回相关结论与线索。'}
              </p>
              {chatMode === 'global' && (
                <p className="mx-auto max-w-[240px] text-center text-[12px] leading-5 text-stone-400/80">
                  更多检索功能请使用底栏「知识库」
                </p>
              )}
            </div>
          </div>
        )}

        {activeMessages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 shadow-sm border border-sky-100/50">
                <Bot size={16} className="text-sky-500" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-sky-500 text-white rounded-tr-sm border-transparent' 
                  : 'bg-white text-stone-700 border border-black/[0.04] rounded-tl-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.role === 'assistant' && !msg.content && activeLoading && (
                <div className="flex items-center gap-2 text-sky-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">思考中...</span>
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F9F8F6] border border-black/[0.04]">
                <User size={16} className="text-stone-400" />
              </div>
            )}
          </div>
        ))}
      </div>

      {chatMode === 'global' && showGlobalFilters && (
        <>
          <button
            type="button"
            aria-label="关闭全局检索筛选"
            onClick={() => setShowGlobalFilters(false)}
            className="absolute inset-0 z-20 bg-white/50 backdrop-blur-[10px] transition-all"
          />
          <div
            className="absolute inset-x-4 z-30 max-h-[min(52vh,420px)] overflow-y-auto rounded-[26px] border border-stone-200/90 bg-[#FCFAF7]/92 p-4 shadow-[0_28px_60px_-24px_rgba(15,23,42,0.32)] backdrop-blur-xl sm:inset-x-6 sm:p-5"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium tracking-wide text-stone-500">全局检索筛选</p>
                <div className="flex items-center gap-2">
                  {hasActiveGlobalFilters && (
                    <button
                      type="button"
                      onClick={handleResetGlobalFilters}
                      className="inline-flex items-center gap-1 rounded-full border border-stone-200/90 bg-white/85 px-2.5 py-1 text-[11px] text-stone-500 transition-colors hover:text-stone-700"
                    >
                      <RotateCcw size={12} />
                      清空
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowGlobalFilters(false)}
                    className="rounded-full border border-stone-200/90 bg-white/85 px-2.5 py-1 text-[11px] text-stone-500 transition-colors hover:text-stone-700"
                  >
                    收起
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs text-stone-500">
                  开始日期
                  <input
                    type="date"
                    value={globalDateFrom}
                    onChange={(e) => setGlobalDateFrom(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white/90 px-3 py-2.5 text-sm text-stone-700 focus:border-stone-400 focus:outline-none"
                  />
                </label>
                <label className="text-xs text-stone-500">
                  结束日期
                  <input
                    type="date"
                    value={globalDateTo}
                    onChange={(e) => setGlobalDateTo(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white/90 px-3 py-2.5 text-sm text-stone-700 focus:border-stone-400 focus:outline-none"
                  />
                </label>
              </div>

              <label className="block text-xs text-stone-500">
                Collection 范围
                <select
                  value={globalCollectionFilter}
                  onChange={(e) => setGlobalCollectionFilter(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white/90 px-3 py-2.5 text-sm text-stone-700 focus:border-stone-400 focus:outline-none"
                >
                  <option value="">全部会议</option>
                  <option value="__ungrouped">未归类的会议</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </label>

              <p className="text-[11px] text-stone-400">默认不限制 Collection，只按时间范围缩小检索。</p>
            </div>
          </div>
        </>
      )}

      {chatMode === 'meeting' && showTemplates && (
        <div className="absolute bottom-[88px] left-4 right-4 z-20 overflow-hidden rounded-2xl border border-white/40 bg-white/80 shadow-2xl backdrop-blur-2xl ring-1 ring-black/5 animate-in fade-in slide-in-from-bottom-2 duration-200 sm:bottom-[84px] sm:left-6 sm:right-6">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-black/[0.04] bg-[#F9F8F6]/50">
            <Sparkles size={14} className="text-sky-400" />
            <span className="text-[11px] font-medium text-stone-500 tracking-widest uppercase">选择 Recipe</span>
          </div>
          <div className="max-h-[240px] overflow-y-auto p-2">
            {templatesLoading && (
              <p className="px-4 py-4 text-sm text-stone-400 text-center">技能加载中...</p>
            )}
            {!templatesLoading && templatesError && (
              <p className="px-4 py-4 text-sm text-red-500 text-center">{templatesError}</p>
            )}
            {!templatesLoading &&
              !templatesError &&
              filteredTemplates.map((t, idx) => (
                <button
                  key={t.id}
                  onClick={() => selectTemplate(t)}
                  className={`flex w-full items-start gap-4 p-3 rounded-xl text-left transition-all ${
                    idx === selectedIdx ? 'bg-[#F9F8F6]' : 'hover:bg-[#F9F8F6]/50'
                  }`}
                >
                  <span className="text-xl mt-0.5">{t.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[14px] font-semibold text-stone-800">{t.name}</span>
                      <code className="rounded-md bg-white border border-black/[0.04] px-1.5 py-0.5 text-[10px] text-stone-400 font-mono shadow-sm">{t.command}</code>
                    </div>
                    <p className="text-xs text-stone-500 leading-relaxed line-clamp-1">{t.description}</p>
                  </div>
                </button>
              ))}
            {!templatesLoading && !templatesError && filteredTemplates.length === 0 && (
              <p className="px-4 py-4 text-sm text-stone-400 text-center">无匹配技能</p>
            )}
          </div>
        </div>
      )}

      {/* Floating Command Bar */}
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 sm:bottom-6 sm:left-6 sm:right-6">
        <div className={`pointer-events-auto flex items-end gap-2 rounded-[24px] border border-black/[0.04] bg-white p-2 shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.12)] ${isDictating ? 'ring-2 ring-sky-300/70 shadow-[0_12px_36px_rgba(14,165,233,0.18)]' : ''}`}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              chatMode === 'meeting'
                ? canAsk
                  ? '输入问题，或输入 / 调用技能...'
                  : '开始录音后可提问...'
                : '输入跨会议问题...'
            }
            disabled={!canAsk || activeLoading}
            rows={1}
            style={{ minHeight: '44px', maxHeight: '120px' }}
            className="flex-1 resize-none bg-transparent px-4 py-3 text-[15px] text-stone-800 placeholder:text-stone-400 focus:outline-none disabled:opacity-50 leading-relaxed font-sans"
          />
          <button
            onClick={toggleDictation}
            disabled={!canAsk || activeLoading}
            className={`rounded-full p-3 transition-all flex items-center justify-center mb-0.5 h-11 w-11 ${
              isDictating
                ? 'bg-sky-500 text-white shadow-sm animate-pulse'
                : 'bg-[#F9F8F6] text-stone-400 hover:bg-sky-50 hover:text-sky-500'
            } disabled:cursor-not-allowed disabled:opacity-40`}
            title={isDictating ? '停止语音输入' : '语音输入'}
          >
            <Mic size={17} />
          </button>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || activeLoading || !canAsk}
            className={`rounded-full p-3 transition-all flex items-center justify-center mb-0.5 h-11 w-11 ${
              input.trim() && !activeLoading && canAsk
                ? 'bg-sky-500 text-white hover:bg-sky-400 shadow-sm'
                : 'bg-[#F9F8F6] text-stone-300'
            }`}
          >
            {activeLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
          </button>
        </div>
      </div>

      <TemplateManager
        open={showTemplateManager}
        templates={templates}
        onClose={() => setShowTemplateManager(false)}
        onSaved={loadTemplates}
      />

      {showAISettings && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="w-full max-w-[500px] rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
             <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
                <h3 className="font-semibold text-base text-stone-800 flex items-center gap-2">
                  <Settings2 size={18} className="text-stone-400" />
                  AI 输出设置
                </h3>
                <button onClick={() => setShowAISettings(false)} className="p-2 rounded-full hover:bg-stone-50 text-stone-400 transition-colors">
                  <X size={18} />
                </button>
             </div>
             <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6 custom-scrollbar">
               <PromptSettings />
               <SpeakerManager />
             </div>
           </div>
        </div>
      )}
    </div>
  );
}
