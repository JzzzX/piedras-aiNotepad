'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  ChevronUp,
  Settings2,
  Globe2,
  MessageSquare,
  SlidersHorizontal,
} from 'lucide-react';
import { useMeetingStore } from '@/lib/store';
import { chatAcrossMeetings, chatWithMeeting } from '@/lib/llm';
import { filterTemplates } from '@/lib/templates';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage, Template } from '@/lib/types';
import TemplateManager from './TemplateManager';

type ChatMode = 'meeting' | 'global';

export default function ChatPanel() {
  const {
    segments,
    userNotes,
    enhancedNotes,
    chatMessages,
    isChatLoading,
    speakers,
    promptOptions,
    status,
    addChatMessage,
    setIsChatLoading,
  } = useMeetingStore();

  const [chatMode, setChatMode] = useState<ChatMode>('meeting');
  const [globalMessages, setGlobalMessages] = useState<ChatMessage[]>([]);
  const [isGlobalChatLoading, setIsGlobalChatLoading] = useState(false);
  const [input, setInput] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateFilter, setTemplateFilter] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  const [showGlobalFilters, setShowGlobalFilters] = useState(false);
  const [globalTitleFilter, setGlobalTitleFilter] = useState('');
  const [globalDateFrom, setGlobalDateFrom] = useState('');
  const [globalDateTo, setGlobalDateTo] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadTemplates = useCallback(async () => {
    setTemplatesError('');
    try {
      const res = await fetch('/api/templates');
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        throw new Error(data.error || '加载模板失败');
      }
      setTemplates(data as Template[]);
    } catch (e) {
      setTemplates([]);
      setTemplatesError(e instanceof Error ? e.message : '加载模板失败');
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const filteredTemplates = useMemo(() => {
    return filterTemplates(templates, templateFilter);
  }, [templateFilter, templates]);

  const activeMessages = chatMode === 'global' ? globalMessages : chatMessages;
  const activeLoading = chatMode === 'global' ? isGlobalChatLoading : isChatLoading;

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
    setChatMode(mode);
    setInput('');
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

    setInput('');
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
                titleKeyword: globalTitleFilter,
                dateFrom: globalDateFrom,
                dateTo: globalDateTo,
              },
              promptOptions
            )
          : await chatWithMeeting(
              segments,
              userNotes,
              enhancedNotes,
              chatMessages,
              templatePrompt || question,
              speakers,
              templatePrompt,
              promptOptions
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

  const selectTemplate = (template: Template) => {
    setShowTemplates(false);
    setInput('');
    handleSend(template.name, template.prompt, template.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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

  const suggestions =
    chatMode === 'global'
      ? ['最近一周有哪些关键决策？', '标题包含复盘的会议达成了什么共识？', '跨会议重复出现的风险点有哪些？']
      : ['会议的核心决策是什么？', '提取所有行动项', '总结关键讨论点'];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2">
        <h3 className="text-sm font-semibold text-zinc-700">
          <Sparkles size={14} className="mr-1.5 inline text-amber-500" />
          AI 助手
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-zinc-200 bg-white p-0.5">
            <button
              onClick={() => switchMode('meeting')}
              className={`rounded px-2 py-1 text-xs transition-colors ${
                chatMode === 'meeting'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
              }`}
              title="当前会议"
            >
              <MessageSquare size={12} className="mr-1 inline" />
              当前
            </button>
            <button
              onClick={() => switchMode('global')}
              className={`rounded px-2 py-1 text-xs transition-colors ${
                chatMode === 'global'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
              }`}
              title="跨会议"
            >
              <Globe2 size={12} className="mr-1 inline" />
              跨会议
            </button>
          </div>

          {chatMode === 'meeting' ? (
            <button
              onClick={() => setShowTemplateManager(true)}
              className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
              title="模板管理"
            >
              <Settings2 size={14} />
            </button>
          ) : (
            <button
              onClick={() => setShowGlobalFilters((v) => !v)}
              className={`rounded-md p-1 transition-colors ${
                showGlobalFilters
                  ? 'bg-zinc-100 text-zinc-700'
                  : 'text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600'
              }`}
              title="筛选条件"
            >
              <SlidersHorizontal size={14} />
            </button>
          )}

          <span className="text-xs text-zinc-400">
            {chatMode === 'meeting' ? '输入 / 调用模版' : '跨会议问答（支持筛选）'}
          </span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {activeMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
            <Bot size={40} strokeWidth={1} className="mb-3 opacity-50" />
            <p className="text-sm font-medium">
              {chatMode === 'meeting' ? '会议 AI 助手' : '跨会议 AI 助手'}
            </p>
            <p className="mt-1 max-w-[260px] text-center text-xs">
              {chatMode === 'meeting'
                ? hasMeetingContent
                  ? '对当前会议提问，或输入 / 调用专业模版'
                  : '开始录音后，可以在这里提问'
                : '可针对历史会议集合提问，回答会附带来源会议引用'}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {suggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                    inputRef.current?.focus();
                  }}
                  className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeMessages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
                <Bot size={14} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                msg.role === 'user' ? 'bg-zinc-800 text-white' : 'bg-zinc-50 text-zinc-700'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.role === 'assistant' && !msg.content && activeLoading && (
                <Loader2 size={14} className="animate-spin text-zinc-400" />
              )}
            </div>
            {msg.role === 'user' && (
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200">
                <User size={14} className="text-zinc-600" />
              </div>
            )}
          </div>
        ))}
      </div>

      {chatMode === 'global' && showGlobalFilters && (
        <div className="border-t border-zinc-100 bg-zinc-50 px-3 py-2">
          <div className="space-y-2">
            <input
              value={globalTitleFilter}
              onChange={(e) => setGlobalTitleFilter(e.target.value)}
              placeholder="标题关键词（可选）"
              className="w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-700 placeholder:text-zinc-300 focus:border-zinc-400 focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-zinc-500">
                开始日期
                <input
                  type="date"
                  value={globalDateFrom}
                  onChange={(e) => setGlobalDateFrom(e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-700 focus:border-zinc-400 focus:outline-none"
                />
              </label>
              <label className="text-[11px] text-zinc-500">
                结束日期
                <input
                  type="date"
                  value={globalDateTo}
                  onChange={(e) => setGlobalDateTo(e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-700 focus:border-zinc-400 focus:outline-none"
                />
              </label>
            </div>
            <p className="text-[11px] text-zinc-400">留空表示不过滤。</p>
          </div>
        </div>
      )}

      {chatMode === 'meeting' && showTemplates && (
        <div className="border-t border-zinc-100 bg-white">
          <div className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-400">
            <ChevronUp size={12} />
            选择模版
          </div>
          <div className="max-h-[240px] overflow-y-auto">
            {templatesLoading && (
              <p className="px-4 py-3 text-xs text-zinc-400">模板加载中...</p>
            )}
            {!templatesLoading && templatesError && (
              <p className="px-4 py-3 text-xs text-red-500">{templatesError}</p>
            )}
            {!templatesLoading &&
              !templatesError &&
              filteredTemplates.map((t, idx) => (
                <button
                  key={t.id}
                  onClick={() => selectTemplate(t)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    idx === selectedIdx ? 'bg-zinc-100' : 'hover:bg-zinc-50'
                  }`}
                >
                  <span className="text-lg">{t.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-800">{t.name}</span>
                      <code className="text-xs text-zinc-400">{t.command}</code>
                    </div>
                    <p className="truncate text-xs text-zinc-500">{t.description}</p>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-400">
                    {t.category}
                  </span>
                </button>
              ))}
            {!templatesLoading && !templatesError && filteredTemplates.length === 0 && (
              <p className="px-4 py-3 text-xs text-zinc-400">无匹配模版</p>
            )}
          </div>
        </div>
      )}

      <div className="border-t border-zinc-100 p-3">
        <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 transition-colors focus-within:border-zinc-400">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              chatMode === 'meeting'
                ? canAsk
                  ? '输入问题或 / 调用模版...'
                  : '开始录音后可提问...'
                : '输入跨会议问题（如：上周所有会议的共识）'
            }
            disabled={!canAsk || activeLoading}
            className="flex-1 text-sm text-zinc-700 placeholder:text-zinc-300 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || activeLoading || !canAsk}
            className="rounded-md p-1 text-zinc-400 transition-colors hover:text-zinc-600 disabled:opacity-30"
          >
            {activeLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>

      <TemplateManager
        open={showTemplateManager}
        templates={templates}
        onClose={() => setShowTemplateManager(false)}
        onSaved={loadTemplates}
      />
    </div>
  );
}

