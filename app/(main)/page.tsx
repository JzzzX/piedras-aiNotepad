'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Mic,
  Clock,
  MessageSquare,
  FolderClosed,
  Loader2,
  FileText,
  Send,
  Bot,
  User,
  X,
  MoreHorizontal,
  GripVertical,
  ArrowRightLeft,
} from 'lucide-react';
import { useMeetingStore, type MeetingListItem } from '@/lib/store';
import { chatAcrossMeetings } from '@/lib/llm';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const {
    meetingList,
    meetingListScope,
    setMeetingListScope,
    isLoadingList,
    loadMeetingList,
    updateMeetingWorkspace,
    workspaces,
    folders,
    currentWorkspaceId,
    promptOptions,
    llmSettings,
  } = useMeetingStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [aiExpanded, setAiExpanded] = useState(false);
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [openMoveMenuId, setOpenMoveMenuId] = useState<string | null>(null);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (aiScrollRef.current) {
      aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
    }
  }, [aiMessages]);

  useEffect(() => {
    void loadMeetingList({ workspaceScope: meetingListScope });
  }, [currentWorkspaceId, loadMeetingList, meetingListScope]);

  useEffect(() => {
    const handleCloseMenu = () => setOpenMoveMenuId(null);
    window.addEventListener('pointerdown', handleCloseMenu);
    return () => window.removeEventListener('pointerdown', handleCloseMenu);
  }, []);

  // Filter meetings by search query (client-side simple filter)
  const filteredMeetings = useMemo(() => {
    if (!searchQuery.trim()) return meetingList;
    const q = searchQuery.toLowerCase();
    return meetingList.filter((m) => (m.title || '').toLowerCase().includes(q));
  }, [meetingList, searchQuery]);

  // Group meetings by date
  const groupedByDate = useMemo(() => {
    const groups: { label: string; meetings: MeetingListItem[] }[] = [];
    const map = new Map<string, MeetingListItem[]>();

    for (const m of filteredMeetings) {
      const d = new Date(m.date);
      const key = d.toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    for (const [key, meetings] of map) {
      const d = new Date(key);
      let label: string;
      if (d.toDateString() === now.toDateString()) {
        label = `今天 · ${d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}`;
      } else if (d.toDateString() === yesterday.toDateString()) {
        label = `昨天 · ${d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}`;
      } else {
        label = d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
      }
      groups.push({ label, meetings });
    }

    return groups;
  }, [filteredMeetings]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    return `${m}分钟`;
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const handleNewRecording = () => {
    const { reset } = useMeetingStore.getState();
    reset();
    const newId = useMeetingStore.getState().meetingId;
    router.push(`/meeting/${newId}`);
  };

  const handleAiSend = useCallback(async () => {
    const q = aiInput.trim();
    if (!q || isAiLoading) return;

    setAiInput('');
    const userMsg: ChatMessage = { id: uuidv4(), role: 'user', content: q, timestamp: Date.now() };
    setAiMessages((prev) => [...prev, userMsg]);
    setIsAiLoading(true);

    try {
      const filters: Record<string, string | undefined> = {};
      if (currentWorkspaceId) filters.workspaceId = currentWorkspaceId;

      const stream = await chatAcrossMeetings(aiMessages, q, filters, promptOptions, llmSettings);
      if (!stream) throw new Error('No stream');

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      const msgId = uuidv4();

      setAiMessages((prev) => [...prev, { id: msgId, role: 'assistant', content: '', timestamp: Date.now() }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullContent += decoder.decode(value, { stream: true });
        setAiMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, content: fullContent } : m)));
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : '未知错误';
      setAiMessages((prev) => [...prev, { id: uuidv4(), role: 'assistant', content: `抱歉，请求出错了。\n\n${detail}`, timestamp: Date.now() }]);
    } finally {
      setIsAiLoading(false);
    }
  }, [aiInput, isAiLoading, aiMessages, currentWorkspaceId, promptOptions, llmSettings]);

  const getFolderName = (folderId: string | null) => {
    if (!folderId) return null;
    const folder = folders.find((f) => f.id === folderId);
    return folder ? folder.name : null;
  };

  const handleMoveMeeting = useCallback(
    async (meeting: MeetingListItem, workspaceId: string) => {
      if (meeting.workspaceId === workspaceId) {
        setOpenMoveMenuId(null);
        return;
      }

      await updateMeetingWorkspace(meeting.id, workspaceId);
      setOpenMoveMenuId(null);
      await loadMeetingList({ workspaceScope: meetingListScope });
    },
    [loadMeetingList, meetingListScope, updateMeetingWorkspace]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 sm:px-8">
        <h1 className="font-song text-lg font-semibold text-[#3A2E25] pl-10 md:pl-0">首页</h1>
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A69B8F]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索会议..."
              className="w-48 rounded-xl border border-[#D8CEC4] bg-white py-2 pl-9 pr-3 text-sm text-[#3A2E25] placeholder:text-[#A69B8F] focus:outline-none focus:ring-1 focus:ring-[#D8CEC4]"
            />
          </div>
          <button
            onClick={handleNewRecording}
            className="flex items-center gap-1.5 rounded-xl bg-[#4A3C31] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#3A2E25]"
          >
            <Mic size={15} />
            新录音
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-8 sm:px-8">
        {/* AI Search Box */}
        <div className="mb-6">
          {!aiExpanded ? (
            <button
              onClick={() => setAiExpanded(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-[#E3D9CE] bg-white px-5 py-4 text-left text-sm text-[#A69B8F] transition-all hover:border-[#D8CEC4] hover:shadow-sm"
            >
              <Bot size={18} className="text-amber-500" />
              向 AI 提问关于你的会议...
            </button>
          ) : (
            <div className="rounded-2xl border border-[#E3D9CE] bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#E3D9CE]/50 px-5 py-3">
                <div className="flex items-center gap-2 text-sm font-medium text-[#3A2E25]">
                  <Bot size={16} className="text-amber-500" />
                  AI 问答
                </div>
                <button onClick={() => { setAiExpanded(false); setAiMessages([]); }} className="rounded-lg p-1 text-[#8C7A6B] hover:bg-[#F7F3EE]">
                  <X size={15} />
                </button>
              </div>
              <div ref={aiScrollRef} className="max-h-[300px] overflow-y-auto px-5 py-4 space-y-4">
                {aiMessages.length === 0 && (
                  <p className="text-center text-sm text-[#A69B8F] py-4">跨会议提问，快速召回历史结论。</p>
                )}
                {aiMessages.map((msg) => (
                  <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {msg.role === 'assistant' && (
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-50 border border-amber-100/50">
                        <Bot size={14} className="text-amber-500" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#4A3C31] text-white rounded-tr-sm'
                        : 'bg-[#F7F3EE] text-[#3A2E25] rounded-tl-sm'
                    }`}>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      {msg.role === 'assistant' && !msg.content && isAiLoading && (
                        <div className="flex items-center gap-2 text-amber-500">
                          <Loader2 size={14} className="animate-spin" />
                          <span className="text-xs">思考中...</span>
                        </div>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F7F3EE] border border-[#E3D9CE]/50">
                        <User size={14} className="text-[#8C7A6B]" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="border-t border-[#E3D9CE]/50 px-4 py-3">
                <div className="flex items-end gap-2">
                  <input
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiSend(); } }}
                    placeholder="输入跨会议问题..."
                    disabled={isAiLoading}
                    className="flex-1 rounded-xl border border-[#D8CEC4] bg-[#F9F9F8] px-4 py-2.5 text-sm text-[#3A2E25] placeholder:text-[#A69B8F] focus:outline-none focus:ring-1 focus:ring-[#D8CEC4] disabled:opacity-50"
                  />
                  <button
                    onClick={handleAiSend}
                    disabled={!aiInput.trim() || isAiLoading}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                      aiInput.trim() && !isAiLoading
                        ? 'bg-[#4A3C31] text-white hover:bg-[#3A2E25]'
                        : 'bg-[#F7F3EE] text-[#A69B8F]'
                    }`}
                  >
                    {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="inline-flex rounded-2xl border border-[#E3D9CE] bg-white p-1 shadow-sm">
            <button
              onClick={() => setMeetingListScope('current')}
              className={`rounded-[14px] px-4 py-2 text-sm font-medium transition-all ${
                meetingListScope === 'current'
                  ? 'bg-[#4A3C31] text-white shadow-sm'
                  : 'text-[#8C7A6B] hover:bg-[#F7F3EE] hover:text-[#4A3C31]'
              }`}
            >
              当前工作区
            </button>
            <button
              onClick={() => setMeetingListScope('all')}
              className={`rounded-[14px] px-4 py-2 text-sm font-medium transition-all ${
                meetingListScope === 'all'
                  ? 'bg-[#4A3C31] text-white shadow-sm'
                  : 'text-[#8C7A6B] hover:bg-[#F7F3EE] hover:text-[#4A3C31]'
              }`}
            >
              全部工作区
            </button>
          </div>
          <p className="text-xs text-[#A69B8F]">
            {meetingListScope === 'current'
              ? '聚焦当前工作区内的会议记录'
              : '跨工作区查看会议，并显示归属标识'}
          </p>
        </div>

        {/* Meeting list */}
        {isLoadingList && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-[#A69B8F]" />
          </div>
        )}

        {!isLoadingList && filteredMeetings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-[#A69B8F]">
            <FileText size={32} className="mb-3 opacity-40" />
            <p className="text-sm">{searchQuery ? '没有符合条件的会议' : '暂无会议记录'}</p>
            <p className="mt-1 text-xs text-[#C4B6A9]">
              {searchQuery
                ? '试试调整搜索条件'
                : meetingListScope === 'current'
                  ? '当前工作区内还没有会议，点击“新录音”开始记录'
                  : '所有工作区下都还没有会议记录'}
            </p>
          </div>
        )}

        {!isLoadingList && groupedByDate.map((group) => (
          <div key={group.label} className="mb-6">
            <h2 className="mb-3 text-xs font-semibold text-[#A69B8F]">{group.label}</h2>
            <div className="space-y-2">
              {group.meetings.map((meeting) => {
                const folderName = getFolderName(meeting.folderId);
                return (
                  <div
                    key={meeting.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/meeting-id', meeting.id);
                      event.dataTransfer.effectAllowed = 'move';
                    }}
                    className="group flex items-start gap-3 rounded-2xl border border-[#E3D9CE]/60 bg-white px-4 py-4 transition-all hover:border-[#D8CEC4] hover:shadow-md"
                  >
                    <button
                      type="button"
                      onClick={() => router.push(`/meeting/${meeting.id}`)}
                      className="mt-0.5 rounded-lg p-1 text-[#C4B6A9] opacity-0 transition-all group-hover:opacity-100 hover:bg-[#F7F3EE] hover:text-[#8C7A6B]"
                      title="拖拽到工作区或文件夹"
                    >
                      <GripVertical size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push(`/meeting/${meeting.id}`)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="line-clamp-2 text-[15px] font-medium text-[#3A2E25] group-hover:text-[#2B2420]">
                        {meeting.title || '无标题记录'}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#A69B8F]">
                        <span>{formatTime(meeting.date)}</span>
                        {meetingListScope === 'all' && meeting.workspace && (
                          <>
                            <span className="opacity-50">·</span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#E3D9CE] bg-[#FCFAF8] px-2 py-0.5 text-[11px] text-[#6C5D50]">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: meeting.workspace.color }}
                              />
                              {meeting.workspace.name}
                            </span>
                          </>
                        )}
                        {meeting.duration > 0 && (
                          <>
                            <span className="opacity-50">·</span>
                            <span className="flex items-center gap-0.5">
                              <Clock size={10} />
                              {formatDuration(meeting.duration)}
                            </span>
                          </>
                        )}
                        {folderName && (
                          <>
                            <span className="opacity-50">·</span>
                            <span className="flex items-center gap-0.5">
                              <FolderClosed size={10} />
                              {folderName}
                            </span>
                          </>
                        )}
                        {meeting._count.segments > 0 && (
                          <>
                            <span className="opacity-50">·</span>
                            <span className="flex items-center gap-0.5">
                              <MessageSquare size={10} />
                              {meeting._count.segments}
                            </span>
                          </>
                        )}
                      </div>
                    </button>

                    <div
                      className="relative"
                      onClick={(event) => event.stopPropagation()}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMoveMenuId((prev) => (prev === meeting.id ? null : meeting.id))
                        }
                        className="rounded-lg p-2 text-[#A69B8F] opacity-0 transition-all group-hover:opacity-100 hover:bg-[#F7F3EE] hover:text-[#5C4D42]"
                        title="移动到工作区"
                      >
                        <MoreHorizontal size={16} />
                      </button>

                      {openMoveMenuId === meeting.id && (
                        <div className="absolute right-0 top-10 z-20 w-56 overflow-hidden rounded-2xl border border-[#E3D9CE] bg-white shadow-xl">
                          <div className="border-b border-[#EDE6DE] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A69B8F]">
                            移动到工作区
                          </div>
                          <div className="py-1">
                            {workspaces.map((workspace) => {
                              const isCurrent = workspace.id === meeting.workspaceId;
                              return (
                                <button
                                  key={workspace.id}
                                  type="button"
                                  disabled={isCurrent}
                                  onClick={() => void handleMoveMeeting(meeting, workspace.id)}
                                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm text-[#4A3C31] transition-colors hover:bg-[#F7F3EE] disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <span
                                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                                      style={{ backgroundColor: workspace.color }}
                                    />
                                    <span className="truncate">{workspace.name}</span>
                                  </span>
                                  {isCurrent ? (
                                    <span className="text-[11px] text-[#A69B8F]">当前</span>
                                  ) : (
                                    <ArrowRightLeft size={13} className="text-[#C4B6A9]" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
