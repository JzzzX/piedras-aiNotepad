'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  MessageSquare,
  BookOpen,
  Loader2,
  Send,
  Bot,
  User,
  ExternalLink,
} from 'lucide-react';
import { useMeetingStore } from '@/lib/store';
import { chatAcrossMeetings } from '@/lib/llm';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage } from '@/lib/types';

type KBTab = 'search' | 'qa';

interface SearchResult {
  meetingId: string;
  title: string;
  date: string;
  score: number;
  snippets: string[];
}

interface FloatingKnowledgeBaseProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FloatingKnowledgeBase({ isOpen, onClose }: FloatingKnowledgeBaseProps) {
  const {
    currentWorkspaceId,
    folders,
    promptOptions,
    llmSettings,
    loadMeeting,
  } = useMeetingStore();

  const [activeTab, setActiveTab] = useState<KBTab>('search');

  // Search tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchScope, setSearchScope] = useState<'workspace' | 'all'>('workspace');
  const [searchDateFrom, setSearchDateFrom] = useState('');
  const [searchDateTo, setSearchDateTo] = useState('');
  const [searchFolderId, setSearchFolderId] = useState('');

  // QA tab state
  const [qaMessages, setQaMessages] = useState<ChatMessage[]>([]);
  const [qaInput, setQaInput] = useState('');
  const [isQaLoading, setIsQaLoading] = useState(false);
  const qaScrollRef = useRef<HTMLDivElement>(null);
  const qaInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (qaScrollRef.current) {
      qaScrollRef.current.scrollTop = qaScrollRef.current.scrollHeight;
    }
  }, [qaMessages]);

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q || isSearching) return;

    setIsSearching(true);
    try {
      const filters: Record<string, string | undefined> = {};
      if (searchScope === 'workspace' && currentWorkspaceId) {
        filters.workspaceId = currentWorkspaceId;
      }
      if (searchDateFrom) filters.dateFrom = searchDateFrom;
      if (searchDateTo) filters.dateTo = searchDateTo;
      if (searchFolderId) filters.folderId = searchFolderId;

      const res = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, filters }),
      });

      if (!res.ok) throw new Error('搜索失败');
      const data = await res.json();
      setSearchResults(data.sources || []);
    } catch (e) {
      console.error('知识库搜索失败:', e);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, isSearching, searchScope, currentWorkspaceId, searchDateFrom, searchDateTo, searchFolderId]);

  const handleResultClick = async (meetingId: string) => {
    await loadMeeting(meetingId);
    onClose();
  };

  const handleQaSend = async () => {
    const q = qaInput.trim();
    if (!q || isQaLoading) return;

    setQaInput('');
    if (qaInputRef.current) {
      qaInputRef.current.style.height = '44px';
    }

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: q,
      timestamp: Date.now(),
    };
    setQaMessages((prev) => [...prev, userMsg]);
    setIsQaLoading(true);

    try {
      const filters: Record<string, string | undefined> = {};
      if (searchScope === 'workspace' && currentWorkspaceId) {
        filters.workspaceId = currentWorkspaceId;
      }

      const stream = await chatAcrossMeetings(
        qaMessages,
        q,
        filters,
        promptOptions,
        llmSettings
      );

      if (!stream) throw new Error('No stream');

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
      setQaMessages((prev) => [...prev, assistantPlaceholder]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullContent += decoder.decode(value, { stream: true });
        setQaMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, content: fullContent } : m))
        );
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : '未知错误';
      const errMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `抱歉，请求出错了。\n\n${detail}`,
        timestamp: Date.now(),
      };
      setQaMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsQaLoading(false);
    }
  };

  const handleQaInputChange = (value: string) => {
    setQaInput(value);
    if (!qaInputRef.current) return;
    qaInputRef.current.style.height = 'auto';
    qaInputRef.current.style.height = `${Math.min(qaInputRef.current.scrollHeight, 120)}px`;
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/5 backdrop-blur-[2px] transition-all"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed top-1/2 left-1/2 z-50 w-[92vw] max-w-[760px] origin-center -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-[#E3D9CE] bg-[#FCFAF8]/98 shadow-[0_24px_80px_-12px_rgba(74,60,49,0.2)] backdrop-blur-2xl transition-all duration-300 ${
          isOpen
            ? 'scale-100 opacity-100 pointer-events-auto'
            : 'scale-95 opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex h-[78vh] max-h-[850px] flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-black/[0.04] px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 border border-amber-100/50">
                <BookOpen size={16} className="text-amber-600" />
              </div>
              <h3 className="font-song text-[15px] font-semibold text-stone-800">知识库</h3>
            </div>

            <div className="flex items-center gap-3">
              {/* Tab switcher */}
              <div className="flex items-center rounded-xl border border-black/[0.02] bg-[#F9F8F6] p-1">
                <button
                  onClick={() => setActiveTab('search')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    activeTab === 'search'
                      ? 'bg-white text-stone-800 shadow-sm border border-black/[0.04]'
                      : 'text-stone-400 hover:text-stone-600'
                  }`}
                >
                  <Search size={12} />
                  检索
                </button>
                <button
                  onClick={() => setActiveTab('qa')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    activeTab === 'qa'
                      ? 'bg-white text-stone-800 shadow-sm border border-black/[0.04]'
                      : 'text-stone-400 hover:text-stone-600'
                  }`}
                >
                  <MessageSquare size={12} />
                  问答
                </button>
              </div>

              {/* Scope toggle */}
              <div className="flex items-center rounded-lg border border-stone-200/80 bg-white/80 p-0.5 text-[11px]">
                <button
                  onClick={() => setSearchScope('workspace')}
                  className={`rounded-md px-2 py-1 transition-all ${
                    searchScope === 'workspace'
                      ? 'bg-stone-800 text-white'
                      : 'text-stone-400 hover:text-stone-600'
                  }`}
                >
                  当前工作区
                </button>
                <button
                  onClick={() => setSearchScope('all')}
                  className={`rounded-md px-2 py-1 transition-all ${
                    searchScope === 'all'
                      ? 'bg-stone-800 text-white'
                      : 'text-stone-400 hover:text-stone-600'
                  }`}
                >
                  全部
                </button>
              </div>

              <button
                onClick={onClose}
                className="rounded-xl p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Search tab */}
          {activeTab === 'search' && (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Search bar + filters */}
              <div className="space-y-2 border-b border-black/[0.04] px-5 py-3 sm:px-6">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSearch();
                      }}
                      placeholder="搜索会议内容..."
                      className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-3 text-sm text-stone-700 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={!searchQuery.trim() || isSearching}
                    className="rounded-xl bg-[#4A3C31] px-4 py-2.5 text-xs font-medium text-white transition-all hover:bg-[#3A2E25] disabled:opacity-50"
                  >
                    {isSearching ? <Loader2 size={14} className="animate-spin" /> : '搜索'}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={searchDateFrom}
                    onChange={(e) => setSearchDateFrom(e.target.value)}
                    className="rounded-lg border border-stone-200 bg-white/90 px-2 py-1 text-xs text-stone-600 focus:outline-none"
                    placeholder="开始日期"
                  />
                  <span className="text-xs text-stone-400">~</span>
                  <input
                    type="date"
                    value={searchDateTo}
                    onChange={(e) => setSearchDateTo(e.target.value)}
                    className="rounded-lg border border-stone-200 bg-white/90 px-2 py-1 text-xs text-stone-600 focus:outline-none"
                  />
                  <select
                    value={searchFolderId}
                    onChange={(e) => setSearchFolderId(e.target.value)}
                    className="rounded-lg border border-stone-200 bg-white/90 px-2 py-1 text-xs text-stone-600 focus:outline-none"
                  >
                    <option value="">全部文件夹</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Results */}
              <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
                {searchResults.length === 0 && !isSearching && (
                  <div className="flex flex-col items-center justify-center pt-16 text-stone-400">
                    <BookOpen size={32} className="mb-3 text-stone-300" />
                    <p className="text-sm">输入关键词搜索历史会议内容</p>
                  </div>
                )}
                {isSearching && (
                  <div className="flex items-center justify-center pt-16">
                    <Loader2 size={20} className="animate-spin text-stone-400" />
                  </div>
                )}
                <div className="space-y-3">
                  {searchResults.map((result) => (
                    <button
                      key={result.meetingId}
                      onClick={() => handleResultClick(result.meetingId)}
                      className="group w-full rounded-2xl border border-stone-200/80 bg-white p-4 text-left transition-all hover:border-[#D8CEC4] hover:shadow-md"
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <h4 className="text-sm font-semibold text-stone-800 group-hover:text-[#4A3C31]">
                          {result.title || '未命名会议'}
                        </h4>
                        <ExternalLink size={12} className="mt-0.5 shrink-0 text-stone-300 group-hover:text-[#8C7A6B]" />
                      </div>
                      <p className="mb-2 text-[11px] text-stone-400">
                        {new Date(result.date).toLocaleString('zh-CN', { hour12: false })}
                        {result.score > 0 && (
                          <span className="ml-2 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-600">
                            相关度 {Math.round(result.score * 100)}%
                          </span>
                        )}
                      </p>
                      {result.snippets.length > 0 && (
                        <div className="space-y-1">
                          {result.snippets.map((snippet, i) => (
                            <p key={i} className="text-xs leading-relaxed text-stone-500 line-clamp-2">
                              {snippet}
                            </p>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* QA tab */}
          {activeTab === 'qa' && (
            <div className="relative flex flex-1 flex-col overflow-hidden">
              <div
                ref={qaScrollRef}
                className={`flex-1 px-5 py-5 sm:px-6 ${
                  qaMessages.length === 0
                    ? 'overflow-hidden'
                    : 'space-y-5 overflow-y-auto pb-32'
                }`}
              >
                {qaMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center pt-12 text-stone-400">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[20px] border border-amber-100/50 bg-amber-50">
                      <Bot size={20} className="text-amber-500" />
                    </div>
                    <p className="font-song mb-1 text-[15px] font-semibold text-stone-700">知识库问答</p>
                    <p className="max-w-[260px] text-center text-[13px] leading-6 text-stone-400">
                      跨会议提问，快速召回历史结论与线索。
                    </p>
                  </div>
                )}

                {qaMessages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {msg.role === 'assistant' && (
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 border border-amber-100/50">
                        <Bot size={16} className="text-amber-500" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-[#4A3C31] text-white rounded-tr-sm'
                          : 'bg-white text-stone-700 border border-black/[0.04] rounded-tl-sm'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      {msg.role === 'assistant' && !msg.content && isQaLoading && (
                        <div className="flex items-center gap-2 text-amber-500">
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

              {/* QA input */}
              <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 sm:bottom-5 sm:left-6 sm:right-6">
                <div className="pointer-events-auto flex items-end gap-2 rounded-[24px] border border-black/[0.04] bg-white p-2 shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                  <textarea
                    ref={qaInputRef}
                    value={qaInput}
                    onChange={(e) => handleQaInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleQaSend();
                      }
                    }}
                    placeholder="输入跨会议问题..."
                    disabled={isQaLoading}
                    rows={1}
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                    className="flex-1 resize-none bg-transparent px-4 py-3 text-[15px] text-stone-800 placeholder:text-stone-400 focus:outline-none disabled:opacity-50"
                  />
                  <button
                    onClick={handleQaSend}
                    disabled={!qaInput.trim() || isQaLoading}
                    className={`mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-3 transition-all ${
                      qaInput.trim() && !isQaLoading
                        ? 'bg-[#4A3C31] text-white hover:bg-[#3A2E25] shadow-sm'
                        : 'bg-[#F9F8F6] text-stone-300'
                    }`}
                  >
                    {isQaLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} className="ml-0.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
