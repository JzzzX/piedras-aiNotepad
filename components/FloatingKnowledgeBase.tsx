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
  type: 'meeting' | 'asset';
  meetingId?: string;
  assetId?: string;
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
    collections,
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
  const [searchCollectionId, setSearchCollectionId] = useState('');

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
      if (searchCollectionId) filters.collectionId = searchCollectionId;

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
  }, [searchQuery, isSearching, searchScope, currentWorkspaceId, searchDateFrom, searchDateTo, searchCollectionId]);

  const handleResultClick = async (result: SearchResult) => {
    if (result.type === 'asset' && result.assetId) {
      window.open(`/api/assets/${result.assetId}/file`, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!result.meetingId) return;
    await loadMeeting(result.meetingId);
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
          className="fixed inset-0 z-40 bg-black/5 transition-all"
          onClick={onClose}
        />
      )}
      <div
        className={`retro-window fixed top-1/2 left-1/2 z-50 w-[92vw] max-w-[760px] origin-center -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-none border-2 border-[#111] bg-[#F4F0E6] shadow-[4px_4px_0px_#111] transition-all duration-300 ${
          isOpen
            ? 'scale-100 opacity-100 pointer-events-auto'
            : 'scale-95 opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex h-[78vh] max-h-[850px] flex-col">
          {/* Header */}
          <div className="retro-title-bar flex items-center justify-between border-b-2 border-[#111] px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-none bg-[#D9423E]/10 border-2 border-[#111]">
                <BookOpen size={16} className="text-[#D9423E]" />
              </div>
              <h3 className="font-[family-name:var(--font-vt323)] text-[15px] font-semibold text-[#111]">知识库</h3>
            </div>

            <div className="flex items-center gap-3">
              {/* Tab switcher */}
              <div className="flex items-center rounded-none border-2 border-[#111] bg-[#EAE3D2] p-1">
                <button
                  onClick={() => setActiveTab('search')}
                  className={`flex items-center gap-1.5 rounded-none px-3 py-1.5 text-xs font-medium transition-all ${
                    activeTab === 'search'
                      ? 'bg-[#F4F0E6] text-[#111] shadow-[4px_4px_0px_#111] border-2 border-[#111]'
                      : 'text-[#8A8578] hover:text-[#111]'
                  }`}
                >
                  <Search size={12} />
                  检索
                </button>
                <button
                  onClick={() => setActiveTab('qa')}
                  className={`flex items-center gap-1.5 rounded-none px-3 py-1.5 text-xs font-medium transition-all ${
                    activeTab === 'qa'
                      ? 'bg-[#F4F0E6] text-[#111] shadow-[4px_4px_0px_#111] border-2 border-[#111]'
                      : 'text-[#8A8578] hover:text-[#111]'
                  }`}
                >
                  <MessageSquare size={12} />
                  问答
                </button>
              </div>

              {/* Scope toggle */}
              <div className="flex items-center rounded-none border-2 border-[#111] bg-[#F4F0E6] p-0.5 text-[11px]">
                <button
                  onClick={() => setSearchScope('workspace')}
                  className={`rounded-none px-2 py-1 transition-all ${
                    searchScope === 'workspace'
                      ? 'bg-[#111] text-white'
                      : 'text-[#8A8578] hover:text-[#111]'
                  }`}
                >
                  当前工作区
                </button>
                <button
                  onClick={() => setSearchScope('all')}
                  className={`rounded-none px-2 py-1 transition-all ${
                    searchScope === 'all'
                      ? 'bg-[#111] text-white'
                      : 'text-[#8A8578] hover:text-[#111]'
                  }`}
                >
                  全部
                </button>
              </div>

              <button
                onClick={onClose}
                className="rounded-none p-2 text-[#8A8578] transition-colors hover:bg-[#EAE3D2] hover:text-[#111]"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Search tab */}
          {activeTab === 'search' && (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Search bar + filters */}
              <div className="space-y-2 border-b-2 border-[#111] px-5 py-3 sm:px-6">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8578]" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSearch();
                      }}
                      placeholder="搜索会议内容..."
                      className="w-full rounded-none border-2 border-[#111] bg-[#F4F0E6] py-2.5 pl-9 pr-3 text-sm text-[#111] placeholder:text-[#8A8578] focus:border-[#111] focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={!searchQuery.trim() || isSearching}
                    className="rounded-none bg-[#111] px-4 py-2.5 text-xs font-medium text-white transition-all hover:bg-[#333] disabled:opacity-50 border-2 border-[#111] shadow-[4px_4px_0px_#111]"
                  >
                    {isSearching ? <Loader2 size={14} className="animate-spin" /> : '搜索'}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={searchDateFrom}
                    onChange={(e) => setSearchDateFrom(e.target.value)}
                    className="rounded-none border-2 border-[#111] bg-[#F4F0E6] px-2 py-1 text-xs text-[#111] focus:outline-none"
                    placeholder="开始日期"
                  />
                  <span className="text-xs text-[#8A8578]">~</span>
                  <input
                    type="date"
                    value={searchDateTo}
                    onChange={(e) => setSearchDateTo(e.target.value)}
                    className="rounded-none border-2 border-[#111] bg-[#F4F0E6] px-2 py-1 text-xs text-[#111] focus:outline-none"
                  />
                  <select
                    value={searchCollectionId}
                    onChange={(e) => setSearchCollectionId(e.target.value)}
                    className="rounded-none border-2 border-[#111] bg-[#F4F0E6] px-2 py-1 text-xs text-[#111] focus:outline-none"
                  >
                    <option value="">全部 Collections</option>
                    <option value="__ungrouped">未归类</option>
                    {collections.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Results */}
              <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
                {searchResults.length === 0 && !isSearching && (
                  <div className="flex flex-col items-center justify-center pt-16 text-[#8A8578]">
                    <BookOpen size={32} className="mb-3 text-[#8A8578]" />
                    <p className="text-sm">输入关键词搜索历史会议内容</p>
                  </div>
                )}
                {isSearching && (
                  <div className="flex items-center justify-center pt-16">
                    <Loader2 size={20} className="animate-spin text-[#8A8578]" />
                  </div>
                )}
                <div className="space-y-3">
                  {searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.meetingId || result.assetId}`}
                      onClick={() => handleResultClick(result)}
                      className="group w-full rounded-none border-2 border-[#111] bg-[#F4F0E6] p-4 text-left transition-all hover:border-[#111] hover:shadow-[4px_4px_0px_#111]"
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <h4 className="text-sm font-semibold text-[#111] group-hover:text-[#111]">
                          {result.title || (result.type === 'meeting' ? '未命名会议' : '未命名资料')}
                        </h4>
                        <ExternalLink size={12} className="mt-0.5 shrink-0 text-[#8A8578] group-hover:text-[#111]" />
                      </div>
                      <p className="mb-2 text-[11px] text-[#8A8578]">
                        <span className="mr-2 rounded-none bg-[#EAE3D2] px-1.5 py-0.5 text-[10px] text-[#8A8578]">
                          {result.type === 'meeting' ? '会议' : '资料'}
                        </span>
                        {new Date(result.date).toLocaleString('zh-CN', { hour12: false })}
                        {result.score > 0 && (
                          <span className="ml-2 rounded-none bg-[#D9423E]/10 px-1.5 py-0.5 text-[10px] text-[#D9423E]">
                            相关度 {Math.round(result.score * 100)}%
                          </span>
                        )}
                      </p>
                      {result.snippets.length > 0 && (
                        <div className="space-y-1">
                          {result.snippets.map((snippet, i) => (
                            <p key={i} className="text-xs leading-relaxed text-[#8A8578] line-clamp-2">
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
                  <div className="flex flex-col items-center justify-center pt-12 text-[#8A8578]">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-none border-2 border-[#111] bg-[#D9423E]/10">
                      <Bot size={20} className="text-[#D9423E]" />
                    </div>
                    <p className="font-[family-name:var(--font-vt323)] mb-1 text-[15px] font-semibold text-[#111]">知识库问答</p>
                    <p className="max-w-[260px] text-center text-[13px] leading-6 text-[#8A8578]">
                      跨会议提问，快速召回历史结论与线索。
                    </p>
                  </div>
                )}

                {qaMessages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {msg.role === 'assistant' && (
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-[#D9423E]/10 border-2 border-[#111]">
                        <Bot size={16} className="text-[#D9423E]" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-none px-5 py-3.5 text-[15px] leading-relaxed shadow-[4px_4px_0px_#111] ${
                        msg.role === 'user'
                          ? 'bg-[#111] text-white'
                          : 'bg-[#F4F0E6] text-[#111] border-2 border-[#111]'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      {msg.role === 'assistant' && !msg.content && isQaLoading && (
                        <div className="flex items-center gap-2 text-[#D9423E]">
                          <Loader2 size={16} className="animate-spin" />
                          <span className="text-sm">思考中...</span>
                        </div>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-[#EAE3D2] border-2 border-[#111]">
                        <User size={16} className="text-[#8A8578]" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* QA input */}
              <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 sm:bottom-5 sm:left-6 sm:right-6">
                <div className="pointer-events-auto flex items-end gap-2 rounded-none border-2 border-[#111] bg-[#F4F0E6] p-2 shadow-[4px_4px_0px_#111]">
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
                    className="flex-1 resize-none bg-transparent px-4 py-3 text-[15px] text-[#111] placeholder:text-[#8A8578] focus:outline-none disabled:opacity-50"
                  />
                  <button
                    onClick={handleQaSend}
                    disabled={!qaInput.trim() || isQaLoading}
                    className={`mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-none p-3 transition-all border-2 border-[#111] ${
                      qaInput.trim() && !isQaLoading
                        ? 'bg-[#111] text-white hover:bg-[#333] shadow-[4px_4px_0px_#111]'
                        : 'bg-[#EAE3D2] text-[#8A8578]'
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
