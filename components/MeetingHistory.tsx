'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarRange,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  FolderClosed,
  FolderPlus,
  GripVertical,
  Loader2,
  MessageSquare,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  useMeetingStore,
  MeetingListFilters,
  MeetingListItem,
} from '@/lib/store';

interface MeetingHistoryProps {
  onSelectMeeting?: () => void;
}

const FOLDER_COLORS = ['#94a3b8', '#38bdf8', '#22c55e', '#f59e0b', '#f97316', '#a855f7'];

type FolderFilterValue = 'all' | 'ungrouped' | string;

export default function MeetingHistory({ onSelectMeeting }: MeetingHistoryProps) {
  const {
    meetingList,
    isLoadingList,
    meetingId,
    folders,
    isLoadingFolders,
    loadMeetingList,
    loadMeeting,
    deleteMeeting,
    loadFolders,
    createFolder,
    deleteFolder,
    updateMeetingFolder,
  } = useMeetingStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [folderFilter, setFolderFilter] = useState<FolderFilterValue>('all');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [showNewFolderForm, setShowNewFolderForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | 'ungrouped' | null>(null);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const filters: MeetingListFilters = {
        query: searchQuery,
        dateFrom,
        dateTo,
        folderId:
          folderFilter === 'all'
            ? undefined
            : folderFilter === 'ungrouped'
              ? '__ungrouped'
              : folderFilter,
      };
      void loadMeetingList(filters);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [dateFrom, dateTo, folderFilter, loadMeetingList, searchQuery]);

  const groupedMeetings = useMemo(() => {
    const folderBuckets = folders.map((folder) => ({
      folder,
      meetings: meetingList.filter((meeting) => meeting.folderId === folder.id),
    }));

    return {
      folders: folderBuckets,
      ungrouped: meetingList.filter((meeting) => !meeting.folderId),
    };
  }, [folders, meetingList]);

  const effectiveExpandedFolders = useMemo(() => {
    const next: Record<string, boolean> = {};
    for (const folder of folders) {
      next[folder.id] = expandedFolders[folder.id] ?? true;
    }
    return next;
  }, [expandedFolders, folders]);

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

  const handleSelectMeeting = async (id: string) => {
    await loadMeeting(id);
    onSelectMeeting?.();
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;

    const folder = await createFolder({ name, color: newFolderColor });
    if (!folder) return;

    setExpandedFolders((prev) => ({ ...prev, [folder.id]: true }));
    setNewFolderName('');
    setNewFolderColor(FOLDER_COLORS[0]);
    setShowNewFolderForm(false);
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!window.confirm('确定删除这个文件夹吗？其中会议会回到“未分组”。')) {
      return;
    }
    await deleteFolder(folderId);
    if (folderFilter === folderId) {
      setFolderFilter('all');
    }
  };

  const handleDropMeeting = async (folderId: string | null, meetingIdValue: string) => {
    setDragOverFolderId(null);
    await updateMeetingFolder(meetingIdValue, folderId);
    await loadMeetingList({
      query: searchQuery,
      dateFrom,
      dateTo,
      folderId:
        folderFilter === 'all'
          ? undefined
          : folderFilter === 'ungrouped'
            ? '__ungrouped'
            : folderFilter,
    });
  };

  const renderMeetingCard = (meeting: MeetingListItem) => {
    const isActive = meeting.id === meetingId;

    return (
      <div
        key={meeting.id}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData('text/meeting-id', meeting.id);
          event.dataTransfer.effectAllowed = 'move';
        }}
        onClick={() => handleSelectMeeting(meeting.id)}
        className={`group flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-all ${
          isActive
            ? 'border-zinc-300 bg-white shadow-sm'
            : 'border-transparent hover:border-black/5 hover:bg-black/5'
        }`}
      >
        <button
          type="button"
          className="mt-1 cursor-grab text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="拖拽会议到文件夹"
          title="拖拽会议到文件夹"
          onClick={(event) => event.stopPropagation()}
        >
          <GripVertical size={14} />
        </button>

        <div className="min-w-0 flex-1">
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
        </div>

        <button
          onClick={(event) => {
            event.stopPropagation();
            if (window.confirm('确定删除这条会议记录？')) {
              void deleteMeeting(meeting.id);
            }
          }}
          className="mt-0.5 rounded-lg p-1.5 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-400 group-hover:opacity-100"
          title="删除"
        >
          <Trash2 size={12} />
        </button>
      </div>
    );
  };

  const renderSection = (
    id: string | 'ungrouped',
    title: string,
    count: number,
    meetings: MeetingListItem[],
    color?: string
  ) => {
    const isExpanded = id === 'ungrouped' ? true : effectiveExpandedFolders[id] ?? true;
    const isHighlighted = dragOverFolderId === id;

    return (
      <div
        key={id}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOverFolderId(id);
        }}
        onDragLeave={() => {
          setDragOverFolderId((prev) => (prev === id ? null : prev));
        }}
        onDrop={(event) => {
          event.preventDefault();
          const meetingIdValue = event.dataTransfer.getData('text/meeting-id');
          if (!meetingIdValue) return;
          void handleDropMeeting(id === 'ungrouped' ? null : id, meetingIdValue);
        }}
        className={`rounded-2xl border p-2 transition-colors ${
          isHighlighted ? 'border-sky-300 bg-sky-50/70' : 'border-black/5 bg-white/70'
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <button
            onClick={() => {
              if (id === 'ungrouped') return;
              setExpandedFolders((prev) => ({ ...prev, [id]: !isExpanded }));
            }}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            {id === 'ungrouped' ? (
              <FolderClosed size={14} className="text-stone-400" />
            ) : isExpanded ? (
              <ChevronDown size={14} className="text-stone-400" />
            ) : (
              <ChevronRight size={14} className="text-stone-400" />
            )}
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color || '#d6d3d1' }}
            />
            <span className="truncate text-sm font-semibold text-stone-700">{title}</span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-500">
              {count}
            </span>
          </button>

          {id !== 'ungrouped' && (
            <button
              onClick={() => void handleDeleteFolder(id)}
              className="rounded-md p-1 text-stone-300 transition-colors hover:bg-red-50 hover:text-red-400"
              title="删除文件夹"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>

        {(id === 'ungrouped' || isExpanded) && (
          <div className="mt-1 space-y-1.5">
            {meetings.length > 0 ? (
              meetings.map(renderMeetingCard)
            ) : (
              <div className="rounded-xl border border-dashed border-stone-200 px-3 py-4 text-center text-xs text-stone-400">
                拖拽会议到这里完成归档
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const isEmpty = !isLoadingList && meetingList.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="space-y-3 px-2">
        <div className="flex items-center gap-2 rounded-2xl border border-black/5 bg-white px-3 py-2 shadow-sm">
          <Search size={14} className="text-stone-400" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="搜索标题或 AI 纪要..."
            className="flex-1 bg-transparent text-sm text-stone-700 placeholder:text-stone-300 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="rounded-md p-1 text-stone-400 transition-colors hover:bg-stone-50 hover:text-stone-600"
              title="清空搜索"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="rounded-xl border border-black/5 bg-white px-3 py-2 text-[11px] text-stone-500 shadow-sm">
            <div className="mb-1 flex items-center gap-1">
              <CalendarRange size={12} className="text-stone-400" />
              开始日期
            </div>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="w-full bg-transparent text-xs text-stone-700 focus:outline-none"
            />
          </label>
          <label className="rounded-xl border border-black/5 bg-white px-3 py-2 text-[11px] text-stone-500 shadow-sm">
            <div className="mb-1 flex items-center gap-1">
              <CalendarRange size={12} className="text-stone-400" />
              结束日期
            </div>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="w-full bg-transparent text-xs text-stone-700 focus:outline-none"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={folderFilter}
            onChange={(event) => setFolderFilter(event.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-black/5 bg-white px-3 py-2 text-xs text-stone-700 shadow-sm focus:border-stone-300 focus:outline-none"
          >
            <option value="all">全部文件夹</option>
            <option value="ungrouped">仅未分组</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowNewFolderForm((prev) => !prev)}
            className="inline-flex w-full shrink-0 items-center justify-center gap-1 rounded-xl border border-black/5 bg-white px-3 py-2 text-xs font-medium text-stone-600 shadow-sm transition-colors hover:bg-stone-50 sm:w-auto"
          >
            <FolderPlus size={13} />
            新建文件夹
          </button>
        </div>

        {showNewFolderForm && (
          <div className="rounded-2xl border border-black/5 bg-white p-3 shadow-sm">
            <input
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder="文件夹名称"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:border-stone-400 focus:outline-none"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewFolderColor(color)}
                  className={`h-6 w-6 rounded-full border-2 transition-transform ${
                    newFolderColor === color ? 'scale-110 border-stone-700' : 'border-white'
                  }`}
                  style={{ backgroundColor: color }}
                  title={`选择颜色 ${color}`}
                />
              ))}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowNewFolderForm(false);
                  setNewFolderName('');
                }}
                className="rounded-lg px-3 py-1.5 text-xs text-stone-500 transition-colors hover:bg-stone-50"
              >
                取消
              </button>
              <button
                onClick={() => void handleCreateFolder()}
                className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-black"
              >
                创建
              </button>
            </div>
          </div>
        )}

        <p className="text-[11px] leading-relaxed text-stone-400">
          支持按标题/AI 纪要搜索，并可将会议卡片拖拽到文件夹中分组管理。
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {(isLoadingFolders || isLoadingList) && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="animate-spin text-gray-400" />
          </div>
        )}

        {!isLoadingFolders && !isLoadingList && isEmpty && (
          <div className="px-4 py-10 text-center text-xs text-gray-400">
            <FileText size={20} className="mx-auto mb-3 opacity-40" />
            <p>{searchQuery || dateFrom || dateTo ? '没有符合筛选条件的会议' : '暂无会议记录'}</p>
            <p className="mt-1 text-gray-300">
              {searchQuery || dateFrom || dateTo ? '试试调整搜索条件' : '录音结束后会自动保存'}
            </p>
          </div>
        )}

        {!isLoadingFolders && !isLoadingList && !isEmpty && (
          <div className="space-y-3">
            {groupedMeetings.folders.map(({ folder, meetings }) =>
              renderSection(folder.id, folder.name, meetings.length, meetings, folder.color)
            )}
            {renderSection('ungrouped', '未分组', groupedMeetings.ungrouped.length, groupedMeetings.ungrouped)}
          </div>
        )}
      </div>
    </div>
  );
}
