'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  MessageSquare,
  Mic,
  Search,
  Trash2,
  User,
  Volume2,
  X,
} from 'lucide-react';
import { useMeetingStore } from '@/lib/store';

function getSpeakerStyle(speaker: string) {
  if (speaker.includes('麦克风') || speaker === '我（麦克风）') {
    return {
      dot: 'bg-sky-400',
      icon: Mic,
      label: 'ME',
    };
  }
  if (speaker.includes('系统音频') || speaker.includes('对方')) {
    return {
      dot: 'bg-teal-400',
      icon: Volume2,
      label: 'OTHER',
    };
  }
  const colors: Record<string, { dot: string }> = {
    'Speaker A': { dot: 'bg-indigo-400' },
    'Speaker B': { dot: 'bg-teal-400' },
    'Speaker C': { dot: 'bg-purple-400' },
  };
  const c = colors[speaker] || { dot: 'bg-stone-400' };
  return { ...c, icon: User, label: speaker.toUpperCase() };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatRelativeTime(offsetMs: number) {
  const totalSeconds = Math.max(0, Math.floor(offsetMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
      seconds
    ).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function highlightText(text: string, query: string) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return text;

  const regex = new RegExp(`(${escapeRegExp(trimmedQuery)})`, 'gi');
  const parts = text.split(regex);
  const normalizedQuery = trimmedQuery.toLocaleLowerCase();

  return parts.map((part, index) => {
    if (part.toLocaleLowerCase() === normalizedQuery) {
      return (
        <mark
          key={`${part}-${index}`}
          className="rounded bg-amber-100 px-0.5 text-amber-900"
        >
          {part}
        </mark>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

export default function TranscriptPanel() {
  const {
    segments,
    currentPartial,
    status,
    speakers,
    meetingDate,
    meetingId,
    systemAudioActive,
    micActive,
    meetingList,
    isPersistedMeeting,
    removeSegment,
    saveMeeting,
  } = useMeetingStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [copiedSegmentId, setCopiedSegmentId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments, currentPartial]);

  useEffect(() => {
    if (!actionMessage) return;
    const timer = window.setTimeout(() => setActionMessage(''), 1800);
    return () => window.clearTimeout(timer);
  }, [actionMessage]);

  useEffect(() => {
    if (!copiedSegmentId) return;
    const timer = window.setTimeout(() => setCopiedSegmentId(null), 1500);
    return () => window.clearTimeout(timer);
  }, [copiedSegmentId]);

  const getSpeakerDisplayName = (speaker: string) => speakers[speaker] || speaker;

  const baseTime = useMemo(() => {
    if (segments.length > 0) {
      return Math.min(meetingDate || segments[0].startTime, segments[0].startTime);
    }
    return meetingDate || 0;
  }, [meetingDate, segments]);

  const matchedSegmentIds = useMemo(() => {
    const trimmedQuery = searchQuery.trim().toLocaleLowerCase();
    if (!trimmedQuery) return [];

    return segments
      .filter((segment) => segment.text.toLocaleLowerCase().includes(trimmedQuery))
      .map((segment) => segment.id);
  }, [searchQuery, segments]);

  const safeActiveMatchIndex =
    matchedSegmentIds.length > 0
      ? Math.min(activeMatchIndex, matchedSegmentIds.length - 1)
      : 0;

  const activeMatchedSegmentId =
    matchedSegmentIds.length > 0 ? matchedSegmentIds[safeActiveMatchIndex] : null;

  useEffect(() => {
    if (!activeMatchedSegmentId) return;
    segmentRefs.current[activeMatchedSegmentId]?.scrollIntoView({
      block: 'center',
      behavior: 'smooth',
    });
  }, [activeMatchedSegmentId]);

  const jumpToMatch = (direction: 'prev' | 'next') => {
    if (matchedSegmentIds.length === 0) return;
    setActiveMatchIndex((prev) => {
      if (direction === 'prev') {
        return prev === 0 ? matchedSegmentIds.length - 1 : prev - 1;
      }
      return prev === matchedSegmentIds.length - 1 ? 0 : prev + 1;
    });
  };

  const handleCopySegment = async (speaker: string, text: string, segmentId: string) => {
    try {
      await navigator.clipboard.writeText(`[${getSpeakerDisplayName(speaker)}] ${text}`);
      setCopiedSegmentId(segmentId);
      setActionMessage('已复制该段转写');
    } catch {
      setActionMessage('复制失败，请检查浏览器剪贴板权限');
    }
  };

  const handleDeleteSegment = async (segmentId: string) => {
    if (!window.confirm('确定删除这一段转写吗？该操作会同步更新当前会议记录。')) {
      return;
    }

    removeSegment(segmentId);
    setActionMessage('已删除该段转写');

    const meetingExistsInList = meetingList.some((meeting) => meeting.id === meetingId);
    if (isPersistedMeeting || meetingExistsInList) {
      await saveMeeting({ allowEmpty: true });
    }
  };

  if (status === 'idle') {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-transparent p-6 text-[#A69B8F]">
        <div className="flex w-full max-w-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#D8CEC4] bg-[#F7F3EE]/50 p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-100/50 bg-sky-50 shadow-sm">
            <MessageSquare size={20} className="text-sky-400" strokeWidth={2} />
          </div>
          <p className="mb-1 text-[15px] font-serif font-semibold text-[#5C4D42]">准备聆听...</p>
          <p className="text-center text-[13px] leading-relaxed text-[#A69B8F]">
            保持安静，或点击顶部按钮开始记录
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-transparent">
      <div className="border-b border-[#E3D9CE] px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-[15px] font-serif font-semibold text-[#4A3C31]">实时转写</h3>
          <div className="flex items-center gap-3">
            {status === 'recording' && (
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                    micActive
                      ? 'border border-sky-100 bg-sky-50 text-sky-600'
                      : 'border border-[#D8CEC4]/50 bg-[#F7F3EE] text-[#8C7A6B]'
                  }`}
                >
                  <Mic size={10} />
                  <span>ME</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                    systemAudioActive
                      ? 'border border-teal-100 bg-teal-50 text-teal-600'
                      : 'border border-[#D8CEC4]/50 bg-[#F7F3EE] text-[#8C7A6B]'
                  }`}
                >
                  <Volume2 size={10} />
                  <span>OTHER</span>
                </div>
              </div>
            )}
            <span className="rounded-full border border-[#D8CEC4]/50 bg-[#F7F3EE] px-2.5 py-1 text-[11px] font-medium text-[#8C7A6B]">
              {segments.length} 条
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 rounded-2xl border border-[#D8CEC4] bg-white px-3 py-2 shadow-sm">
            <Search size={14} className="text-[#A69B8F]" />
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setActiveMatchIndex(0);
              }}
              placeholder="搜索转写内容..."
              className="flex-1 bg-transparent text-sm text-[#4A3C31] placeholder:text-[#C4B6A9] focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveMatchIndex(0);
                }}
                className="rounded-md p-1 text-[#A69B8F] transition-colors hover:bg-[#F7F3EE] hover:text-[#5C4D42]"
                title="清空搜索"
              >
                <X size={14} />
              </button>
            )}
            <div className="h-4 w-px bg-[#E3D9CE]" />
            <button
              onClick={() => jumpToMatch('prev')}
              disabled={matchedSegmentIds.length === 0}
              className="rounded-md p-1 text-[#A69B8F] transition-colors hover:bg-[#F7F3EE] hover:text-[#5C4D42] disabled:cursor-not-allowed disabled:opacity-30"
              title="上一个匹配"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={() => jumpToMatch('next')}
              disabled={matchedSegmentIds.length === 0}
              className="rounded-md p-1 text-[#A69B8F] transition-colors hover:bg-[#F7F3EE] hover:text-[#5C4D42] disabled:cursor-not-allowed disabled:opacity-30"
              title="下一个匹配"
            >
              <ChevronDown size={14} />
            </button>
          </div>

          {searchQuery.trim() ? (
            <p className="text-xs text-[#8C7A6B]">
              {matchedSegmentIds.length > 0
                  ? `找到 ${safeActiveMatchIndex + 1} / ${matchedSegmentIds.length} 条匹配`
                : `未找到“${searchQuery.trim()}”`}
            </p>
          ) : actionMessage ? (
            <p className="text-xs text-[#8C7A6B]">{actionMessage}</p>
          ) : null}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
        {segments.map((segment) => {
          const style = getSpeakerStyle(segment.speaker);
          const Icon = style.icon;
          const isSystemPlaceholder = segment.text.startsWith('[对方正在发言');
          const isMatched = matchedSegmentIds.includes(segment.id);
          const isActiveMatch = activeMatchedSegmentId === segment.id;

          return (
            <div
              key={segment.id}
              ref={(node) => {
                segmentRefs.current[segment.id] = node;
              }}
              className={`group relative rounded-2xl border transition-all duration-300 ${
                isSystemPlaceholder ? 'opacity-50 grayscale' : ''
              } ${
                isActiveMatch
                  ? 'border-sky-300 bg-sky-50/30 ring-4 ring-sky-500/5'
                  : isMatched
                    ? 'border-amber-200 bg-amber-50/50'
                    : 'border-[#E3D9CE] bg-white hover:border-[#D8CEC4] hover:shadow-md'
              } px-5 py-4`}
            >
              <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() =>
                    handleCopySegment(segment.speaker, segment.text, segment.id)
                  }
                  className="rounded-lg border border-[#E3D9CE] bg-white p-2 text-[#A69B8F] transition-all hover:bg-[#F7F3EE] hover:text-[#4A3C31]"
                  title="复制该段"
                >
                  {copiedSegmentId === segment.id ? (
                    <Check size={14} className="text-[#6D8A67]" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
                <button
                  onClick={() => handleDeleteSegment(segment.id)}
                  className="rounded-lg border border-[#E3D9CE] bg-white p-2 text-[#A69B8F] transition-all hover:bg-red-50 hover:text-red-500"
                  title="删除该段"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="mb-3 flex items-center gap-3 pr-20">
                <span className="inline-flex items-center gap-2 rounded-lg bg-[#F7F3EE] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#8C7A6B] border border-[#E3D9CE]">
                  <span className={`h-1.5 w-1.5 rounded-full ${style.dot} shadow-sm`} />
                  {getSpeakerDisplayName(segment.speaker)}
                </span>
                <span
                  title={new Date(segment.startTime).toLocaleString('zh-CN')}
                  className="cursor-default font-mono text-[10px] font-bold tracking-tighter text-[#A69B8F]"
                >
                  {formatRelativeTime(segment.startTime - baseTime)}
                </span>
              </div>
              <p
                className={`text-[15px] leading-relaxed text-[#3A2E25] selection:bg-sky-100 ${
                  isSystemPlaceholder ? 'italic text-[#A69B8F]' : ''
                }`}
              >
                {highlightText(segment.text, searchQuery)}
              </p>
            </div>
          );
        })}

        {currentPartial && status === 'recording' && (
          <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/50 p-3">
            <div className="mb-1 flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
              <Mic size={11} className="text-blue-400" />
              <span className="text-xs font-medium text-blue-500">识别中...</span>
            </div>
            <p className="text-sm italic text-blue-500/80">{highlightText(currentPartial, searchQuery)}</p>
          </div>
        )}

        {systemAudioActive && status === 'recording' && (
          <div className="rounded-lg border border-dashed border-green-200 bg-green-50/50 p-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              <Volume2 size={11} className="text-green-400" />
              <span className="text-xs font-medium text-green-500">对方正在发言...</span>
            </div>
          </div>
        )}

        {segments.length === 0 && !currentPartial && status === 'recording' && (
          <div className="flex flex-col items-center justify-center py-8 text-[#A69B8F]">
            <div className="mb-3 flex gap-1">
              <div
                className="h-3 w-1 animate-pulse rounded bg-sky-300"
                style={{ animationDelay: '0ms' }}
              />
              <div
                className="h-4 w-1 animate-pulse rounded bg-sky-400"
                style={{ animationDelay: '150ms' }}
              />
              <div
                className="h-5 w-1 animate-pulse rounded bg-sky-500"
                style={{ animationDelay: '300ms' }}
              />
              <div
                className="h-4 w-1 animate-pulse rounded bg-sky-400"
                style={{ animationDelay: '150ms' }}
              />
              <div
                className="h-3 w-1 animate-pulse rounded bg-sky-300"
                style={{ animationDelay: '0ms' }}
              />
            </div>
            <p className="text-xs">正在聆听...</p>
          </div>
        )}
      </div>

      {segments.length > 0 && (
        <div className="border-t border-[#E3D9CE] px-4 py-2">
          <div className="flex flex-wrap gap-3">
            {Array.from(new Set(segments.map((segment) => segment.speaker))).map((speaker) => {
              const style = getSpeakerStyle(speaker);
              const Icon = style.icon;
              return (
                <div key={speaker} className="flex items-center gap-1.5 text-xs text-[#8C7A6B]">
                  <div className={`h-2 w-2 rounded-full ${style.dot}`} />
                  <Icon size={10} />
                  <span>{getSpeakerDisplayName(speaker)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
