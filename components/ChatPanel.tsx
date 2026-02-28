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
  SlidersHorizontal,
  LayoutTemplate,
} from 'lucide-react';
import { useMeetingStore } from '@/lib/store';
import { chatAcrossMeetings, chatWithMeeting } from '@/lib/llm';
import { filterTemplates } from '@/lib/templates';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage, Template } from '@/lib/types';
import TemplateManager from './TemplateManager';
import TooltipIconButton from './TooltipIconButton';

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
    folders,
    addChatMessage,
    loadFolders,
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
  const [globalFolderFilter, setGlobalFolderFilter] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const resetInputHeight = () => {
    if (!inputRef.current) return;
    inputRef.current.style.height = '44px';
  };

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

  useEffect(() => {
    void loadFolders();
  }, [loadFolders]);

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
                titleKeyword: globalTitleFilter,
                dateFrom: globalDateFrom,
                dateTo: globalDateTo,
                folderId: globalFolderFilter || undefined,
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
    resetInputHeight();
    handleSend(template.name, template.prompt, template.id);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    if (!inputRef.current) return;
    inputRef.current.style.height = 'auto';
    inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
  };

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

  const suggestions =
    chatMode === 'global'
      ? ['最近一周有哪些关键决策？', '标题包含复盘的会议达成了什么共识？', '跨会议重复出现的风险点有哪些？']
      : ['会议的核心决策是什么？', '提取所有行动项', '总结关键讨论点'];

  return (
    <div className="flex h-full flex-col bg-transparent relative">
      <div className="flex items-center justify-between border-b border-black/[0.04] px-6 py-5">
        <h3 className="text-[15px] font-serif font-semibold text-stone-800 flex items-center">
          <Sparkles size={16} className="mr-2 text-sky-400" />
          AI 助手
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl bg-[#F9F8F6] p-1 border border-black/[0.02]">
            <button
              onClick={() => switchMode('meeting')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
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
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
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
            <TooltipIconButton
              onClick={() => setShowTemplateManager(true)}
              label="模板管理"
              className="rounded-xl p-2 text-stone-400 transition-colors hover:bg-[#F9F8F6] hover:text-stone-600"
            >
              <LayoutTemplate size={16} />
            </TooltipIconButton>
          ) : (
            <TooltipIconButton
              onClick={() => setShowGlobalFilters((v) => !v)}
              label="筛选条件"
              className={`rounded-xl p-2 transition-colors ${
                showGlobalFilters
                  ? 'bg-[#F9F8F6] text-stone-700'
                  : 'text-stone-400 hover:bg-[#F9F8F6] hover:text-stone-600'
              }`}
            >
              <SlidersHorizontal size={16} />
            </TooltipIconButton>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto px-6 py-6 pb-28">
        {activeMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-stone-400">
            <div className="w-full max-w-[280px] rounded-2xl border border-dashed border-stone-200 bg-white/50 p-8 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center mb-4 shadow-sm border border-sky-100/50">
                <Bot size={20} className="text-sky-400" strokeWidth={2} />
              </div>
              <p className="text-[15px] font-serif font-semibold text-stone-700 mb-1">
                {chatMode === 'meeting' ? '会议专属助手' : '全局知识库'}
              </p>
              <p className="text-center text-[13px] leading-relaxed text-stone-400 mb-6">
                {chatMode === 'meeting'
                  ? hasMeetingContent
                    ? '随时提问，或使用 / 调用专业模版'
                    : '保持安静，准备聆听...'
                  : '提问以获取跨会议的历史知识引用'}
              </p>
              <div className="flex flex-col gap-2 w-full">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      handleInputChange(q);
                      inputRef.current?.focus();
                    }}
                    className="rounded-xl bg-[#F9F8F6] px-4 py-2.5 text-[13px] text-stone-500 transition-all hover:bg-white hover:text-stone-700 hover:shadow-sm text-left border border-transparent hover:border-black/[0.04]"
                  >
                    {q}
                  </button>
                ))}
              </div>
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
        <div className="border-t border-black/5 bg-white/50 backdrop-blur px-6 py-4 absolute bottom-24 w-full z-10">
          <div className="space-y-3">
            <input
              value={globalTitleFilter}
              onChange={(e) => setGlobalTitleFilter(e.target.value)}
              placeholder="标题关键词（可选）"
              className="w-full rounded-xl border-transparent bg-white px-4 py-2.5 text-sm text-stone-700 placeholder:text-stone-400 focus:ring-2 focus:ring-sky-500/20 focus:outline-none shadow-sm border border-black/[0.04]"
            />
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-medium text-stone-500">
                开始日期
                <input
                  type="date"
                  value={globalDateFrom}
                  onChange={(e) => setGlobalDateFrom(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border-transparent bg-white px-4 py-2.5 text-sm text-stone-700 focus:ring-2 focus:ring-sky-500/20 focus:outline-none shadow-sm border border-black/[0.04]"
                />
              </label>
              <label className="text-xs font-medium text-stone-500">
                结束日期
                <input
                  type="date"
                  value={globalDateTo}
                  onChange={(e) => setGlobalDateTo(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border-transparent bg-white px-4 py-2.5 text-sm text-stone-700 focus:ring-2 focus:ring-sky-500/20 focus:outline-none shadow-sm border border-black/[0.04]"
                />
              </label>
            </div>
            <label className="block text-xs font-medium text-stone-500">
              文件夹范围
              <select
                value={globalFolderFilter}
                onChange={(e) => setGlobalFolderFilter(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-black/[0.04] bg-white px-4 py-2.5 text-sm text-stone-700 shadow-sm focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
              >
                <option value="">全部文件夹</option>
                <option value="__ungrouped">仅未分组</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}

      {chatMode === 'meeting' && showTemplates && (
        <div className="bg-white/90 backdrop-blur-xl absolute bottom-[84px] left-6 right-6 z-20 shadow-xl border border-black/[0.04] rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-black/[0.04] bg-[#F9F8F6]/50">
            <Sparkles size={14} className="text-sky-400" />
            <span className="text-[11px] font-medium text-stone-500 tracking-widest uppercase">选择助手技能</span>
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
      <div className="absolute bottom-6 left-6 right-6 z-10 pointer-events-none">
        <div className="pointer-events-auto flex items-end gap-2 rounded-[24px] bg-white p-2 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-black/[0.04] transition-all focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.12)] focus-within:ring-2 focus-within:ring-sky-500/20">
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
    </div>
  );
}
