'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarRange,
  Clock,
  Loader2,
  MessageSquare,
  Search,
  Trash2,
} from 'lucide-react';
import { useMeetingStore, type MeetingListFilters, type MeetingListItem } from '@/lib/store';

interface MeetingHistoryProps {
  onSelectMeeting?: () => void;
  fixedCollectionId?: string | null;
  hideCollectionFilter?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

type CollectionFilterValue = 'all' | 'ungrouped' | string;

export default function MeetingHistory({
  onSelectMeeting,
  fixedCollectionId,
  hideCollectionFilter = false,
  emptyTitle = '还没有会议记录',
  emptyDescription = '可以从当前工作区开始录音或导入音频，随后再整理到合适的 Collection。',
}: MeetingHistoryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    meetingList,
    isLoadingList,
    meetingId,
    collections,
    isLoadingCollections,
    loadMeetingList,
    deleteMeeting,
    loadCollections,
    updateMeetingCollection,
  } = useMeetingStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilterValue>('all');

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  const effectiveCollectionFilter: CollectionFilterValue =
    fixedCollectionId !== undefined
      ? fixedCollectionId === null
        ? 'ungrouped'
        : fixedCollectionId
      : collectionFilter;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const effectiveCollectionId =
        fixedCollectionId !== undefined
          ? fixedCollectionId === null
            ? '__ungrouped'
            : fixedCollectionId
          : effectiveCollectionFilter === 'all'
            ? undefined
            : effectiveCollectionFilter === 'ungrouped'
              ? '__ungrouped'
              : effectiveCollectionFilter;

      const filters: MeetingListFilters = {
        query: searchQuery,
        dateFrom,
        dateTo,
        workspaceScope: 'current',
        collectionId: effectiveCollectionId,
      };
      void loadMeetingList(filters);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [dateFrom, dateTo, effectiveCollectionFilter, fixedCollectionId, loadMeetingList, searchQuery]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) {
      return `今天 ${d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (isYesterday) {
      return `昨天 ${d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m${s > 0 ? `${s}s` : ''}`;
  };

  const buildNotePreview = (meeting: MeetingListItem) => {
    const enhanced = meeting.enhancedNotes?.replace(/\s+/g, ' ').trim();
    if (enhanced) return enhanced;

    const userNotes = meeting.userNotes?.replace(/\s+/g, ' ').trim();
    if (userNotes) return userNotes;

    return '还没有笔记内容，打开会议后可以查看完整转写并补充记录。';
  };

  const handleSelectMeeting = (id: string) => {
    router.push(`/meeting/${id}?returnTo=${encodeURIComponent(pathname)}`);
    onSelectMeeting?.();
  };

  const moveOptions = useMemo(
    () => [
      { value: '__ungrouped', label: '未归类' },
      ...collections.map((collection) => ({ value: collection.id, label: collection.name })),
    ],
    [collections]
  );

  const renderMeetingCard = (meeting: MeetingListItem) => {
    const isActive = meeting.id === meetingId;

    return (
      <div
        key={meeting.id}
        className={`group flex items-start gap-4 rounded-[24px] border px-4 py-4 transition-all ${
          isActive
            ? 'border-zinc-300 bg-white shadow-sm'
            : 'border-[#ECE4DA] bg-[#FCFAF7] hover:border-[#D8CEC4] hover:shadow-[0_12px_24px_rgba(58,46,37,0.06)]'
        }`}
      >
        <button
          type="button"
          onClick={() => handleSelectMeeting(meeting.id)}
          className="min-w-0 flex-1 text-left"
        >
          <p
            className={`line-clamp-2 text-[15px] font-medium leading-6 ${
              isActive ? 'text-gray-900' : 'text-gray-700'
            }`}
          >
            {meeting.title || '无标题记录'}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-400">
            <span>{formatDate(meeting.date)}</span>
            {meeting.duration > 0 && (
              <>
                <span className="opacity-50">·</span>
                <span className="flex items-center gap-0.5">
                  <Clock size={10} />
                  {formatDuration(meeting.duration)}
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
          <p className="mt-2 line-clamp-2 text-[13px] leading-6 text-stone-500">
            {buildNotePreview(meeting)}
          </p>
        </button>

        <div className="flex w-[172px] shrink-0 flex-col items-end gap-2">
          <label className="w-full">
            <span className="sr-only">移动到 Collection</span>
            <select
              value={meeting.collectionId || '__ungrouped'}
              onChange={(event) =>
                void updateMeetingCollection(
                  meeting.id,
                  event.target.value === '__ungrouped' ? null : event.target.value
                )
              }
              className="w-full rounded-xl border border-[#E3D9CE] bg-white px-3 py-2 text-sm text-[#5C4D42] focus:border-[#C2B3A4] focus:outline-none"
            >
              {moveOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={() => {
              if (window.confirm('确定删除这条会议记录？')) {
                void deleteMeeting(meeting.id);
              }
            }}
            className="rounded-lg px-2 py-1.5 text-xs text-[#A09082] transition-colors hover:bg-rose-50 hover:text-rose-600"
            title="删除会议"
          >
            <span className="inline-flex items-center gap-1">
              <Trash2 size={12} />
              删除
            </span>
          </button>
        </div>
      </div>
    );
  };

  const isEmpty = meetingList.length === 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-[24px] border border-[#E8DED3] bg-[#FCFAF7] p-4 md:grid-cols-[minmax(0,1.2fr)_repeat(2,minmax(180px,0.5fr))]">
        <label className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#B4A79A]"
          />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="搜索会议标题、AI 总结或用户笔记"
            className="w-full rounded-2xl border border-[#E3D9CE] bg-white px-10 py-3 text-sm text-[#3A2E25] placeholder:text-[#AE9D8E] focus:border-[#C2B3A4] focus:outline-none"
          />
        </label>

        {!hideCollectionFilter && fixedCollectionId === undefined ? (
          <label className="text-[12px] text-[#8C7A6B]">
            Collection
            <select
              value={effectiveCollectionFilter}
              onChange={(event) => setCollectionFilter(event.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-[#E3D9CE] bg-white px-3 py-3 text-sm text-[#3A2E25] focus:border-[#C2B3A4] focus:outline-none"
            >
              <option value="all">全部 Collections</option>
              <option value="ungrouped">未归类</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="text-[12px] text-[#8C7A6B]">
          开始日期
          <div className="relative mt-1.5">
            <CalendarRange
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#B4A79A]"
            />
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="w-full rounded-2xl border border-[#E3D9CE] bg-white px-3 py-3 pr-10 text-sm text-[#3A2E25] focus:border-[#C2B3A4] focus:outline-none"
            />
          </div>
        </label>

        <label className="text-[12px] text-[#8C7A6B]">
          结束日期
          <div className="relative mt-1.5">
            <CalendarRange
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#B4A79A]"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="w-full rounded-2xl border border-[#E3D9CE] bg-white px-3 py-3 pr-10 text-sm text-[#3A2E25] focus:border-[#C2B3A4] focus:outline-none"
            />
          </div>
        </label>
      </div>

      {(isLoadingCollections || isLoadingList) && (
        <div className="flex items-center justify-center gap-2 rounded-[24px] border border-[#E8DED3] bg-white/80 px-4 py-10 text-sm text-[#8B796A]">
          <Loader2 size={16} className="animate-spin" />
          正在加载会议历史...
        </div>
      )}

      {!isLoadingCollections && !isLoadingList && isEmpty && (
        <div className="rounded-[24px] border border-dashed border-[#D8CEC4] bg-[#FCFAF7] px-6 py-12 text-center">
          <p className="text-base font-medium text-[#5C4D42]">{emptyTitle}</p>
          <p className="mt-2 text-sm leading-6 text-[#8B796A]">{emptyDescription}</p>
        </div>
      )}

      {!isLoadingCollections && !isLoadingList && !isEmpty && (
        <div className="space-y-3">{meetingList.map((meeting) => renderMeetingCard(meeting))}</div>
      )}
    </div>
  );
}
