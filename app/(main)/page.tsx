'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRightLeft,
  CalendarDays,
  Clock3,
  FileAudio,
  FileText,
  FolderClosed,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Mic,
  Plus,
} from 'lucide-react';
import WorkspaceModal from '@/components/WorkspaceModal';
import WorkspaceIconBadge from '@/components/WorkspaceIconBadge';
import { useMeetingStore } from '@/lib/store';
import type { DashboardMeetingItem, DashboardResponse, DashboardScope } from '@/lib/types';

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} 分钟`;
}

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMeetingDate(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
}

function groupMeetingsByDate(meetings: DashboardMeetingItem[]) {
  const map = new Map<string, DashboardMeetingItem[]>();

  for (const meeting of meetings) {
    const date = new Date(meeting.date);
    const key = date.toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)?.push(meeting);
  }

  return Array.from(map.entries()).map(([key, items]) => {
    const date = new Date(key);
    return {
      label: date.toLocaleDateString('zh-CN', {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      }),
      items,
    };
  });
}

export default function WorkbenchPage() {
  const router = useRouter();
  const {
    currentWorkspaceId,
    workspaces,
    loadWorkspaces,
    loadFolders,
    createWorkspace,
    setCurrentWorkspaceId,
    updateMeetingWorkspace,
  } = useMeetingStore();

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [meetingQuery, setMeetingQuery] = useState('');
  const [taskScope, setTaskScope] = useState<DashboardScope>('all');
  const [meetingScope, setMeetingScope] = useState<DashboardScope>('all');
  const [openMoveMenuId, setOpenMoveMenuId] = useState<string | null>(null);
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);

  const currentWorkspaceName = useMemo(
    () => workspaces.find((workspace) => workspace.id === currentWorkspaceId)?.name || null,
    [currentWorkspaceId, workspaces]
  );

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) {
        throw new Error('加载工作台失败');
      }
      setDashboard((await res.json()) as DashboardResponse);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError instanceof Error ? loadError.message : '加载工作台失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspaces();
    void loadFolders();
    void loadDashboard();
  }, [loadDashboard, loadFolders, loadWorkspaces]);

  useEffect(() => {
    const handleCloseMenu = () => setOpenMoveMenuId(null);
    window.addEventListener('pointerdown', handleCloseMenu);
    return () => window.removeEventListener('pointerdown', handleCloseMenu);
  }, []);

  const filteredActionItems = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.recentActionItems.filter((item) =>
      taskScope === 'current' ? item.workspaceId === currentWorkspaceId : true
    );
  }, [currentWorkspaceId, dashboard, taskScope]);

  const filteredMeetings = useMemo(() => {
    if (!dashboard) return [];
    const scoped = dashboard.recentMeetings.filter((meeting) =>
      meetingScope === 'current' ? meeting.workspaceId === currentWorkspaceId : true
    );
    if (!meetingQuery.trim()) return scoped;
    const query = meetingQuery.trim().toLowerCase();
    return scoped.filter((meeting) => {
      const title = (meeting.title || '').toLowerCase();
      const folderName = meeting.folder?.name?.toLowerCase() || '';
      return title.includes(query) || folderName.includes(query);
    });
  }, [currentWorkspaceId, dashboard, meetingQuery, meetingScope]);

  const groupedMeetings = useMemo(() => groupMeetingsByDate(filteredMeetings), [filteredMeetings]);

  const handleNewMeeting = useCallback(() => {
    const { reset } = useMeetingStore.getState();
    reset();
    const newId = useMeetingStore.getState().meetingId;
    router.push(`/meeting/${newId}`);
  }, [router]);

  const handleImportAudio = useCallback(() => {
    const { reset } = useMeetingStore.getState();
    reset();
    const newId = useMeetingStore.getState().meetingId;
    router.push(`/meeting/${newId}?intent=upload`);
  }, [router]);

  const handleMoveMeeting = useCallback(
    async (meetingId: string, workspaceId: string) => {
      await updateMeetingWorkspace(meetingId, workspaceId);
      setOpenMoveMenuId(null);
      await loadDashboard();
    },
    [loadDashboard, updateMeetingWorkspace]
  );

  const handleCreateWorkspace = useCallback(
    async (input: { name: string; description: string; color: string; icon: string }) => {
      const workspace = await createWorkspace(input);
      setCurrentWorkspaceId(workspace.id);
      await loadFolders();
      setWorkspaceModalOpen(false);
    },
    [createWorkspace, loadFolders, setCurrentWorkspaceId]
  );

  const shortcuts = [
    {
      id: 'record',
      title: '开始录音',
      description: '新建一场会议并立即进入录音。',
      icon: Mic,
      onClick: handleNewMeeting,
    },
    {
      id: 'upload',
      title: '导入音频',
      description: '上传已有录音并直接转写。',
      icon: FileAudio,
      onClick: handleImportAudio,
    },
    {
      id: 'chat',
      title: 'AI 对话',
      description: '围绕全部会议发起全局提问。',
      icon: MessageSquare,
      onClick: () => router.push('/chat'),
    },
    {
      id: 'workspace',
      title: '新建工作区',
      description: '把不同主题和项目拆开管理。',
      icon: Plus,
      onClick: () => setWorkspaceModalOpen(true),
    },
  ];

  return (
    <div className="min-h-full bg-[#F6F2EB]">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-8 px-6 pb-10 pt-8 sm:px-8 lg:px-10">
        <section className="rounded-[34px] border border-[#DDD2C6] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.94),_rgba(249,244,237,0.98)_58%,_rgba(239,231,221,1))] px-6 py-7 shadow-[0_24px_72px_rgba(58,46,37,0.08)] sm:px-8 sm:py-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-[#A79380]">
                <LayoutDashboard size={12} />
                Workbench
              </div>
              <p className="mt-4 text-sm text-[#8B796A]">{dashboard?.dateLabel || '今天'}</p>
              <h1 className="mt-2 font-song text-[34px] leading-tight text-[#3A2E25] sm:text-[44px]">
                {dashboard?.greeting || '你好'}，今天从哪件事开始？
              </h1>
              <p className="mt-3 max-w-[640px] text-[15px] leading-7 text-[#7C6B5C]">
                先看最近行动项，再决定是继续会议、导入音频，还是直接进入 AI 对话。
              </p>
            </div>

            {currentWorkspaceName ? (
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#E2D6CA] bg-white/85 px-4 py-2 text-sm text-[#6C5D50]">
                <span className="text-[#A08E7E]">当前工作区</span>
                <span className="font-medium text-[#3A2E25]">{currentWorkspaceName}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {shortcuts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="rounded-[24px] border border-[#E7DDD2] bg-white/90 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#D9CCBF] hover:shadow-[0_16px_32px_rgba(58,46,37,0.08)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F5EEE5] text-[#5E4E43]">
                  <item.icon size={19} />
                </div>
                <div className="mt-4 text-[16px] font-semibold text-[#3A2E25]">{item.title}</div>
                <div className="mt-1 text-sm leading-6 text-[#8B796A]">{item.description}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
          <div className="rounded-[30px] border border-[#DED4C9] bg-white/90 p-6 shadow-[0_18px_48px_rgba(58,46,37,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-song text-[26px] text-[#3A2E25]">最近行动项</h2>
                <p className="mt-1 text-sm text-[#8B796A]">从近期 AI 总结里抽取出来的待办和跟进。</p>
              </div>
              <div className="inline-flex rounded-full border border-[#E3D9CE] bg-[#F8F4EF] p-1 text-[12px]">
                <button
                  type="button"
                  onClick={() => setTaskScope('all')}
                  className={`rounded-full px-3 py-1.5 transition-all ${
                    taskScope === 'all' ? 'bg-white text-[#3A2E25] shadow-sm' : 'text-[#8C7A6B]'
                  }`}
                >
                  全部工作区
                </button>
                <button
                  type="button"
                  onClick={() => setTaskScope('current')}
                  className={`rounded-full px-3 py-1.5 transition-all ${
                    taskScope === 'current'
                      ? 'bg-white text-[#3A2E25] shadow-sm'
                      : 'text-[#8C7A6B]'
                  }`}
                >
                  当前工作区
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {isLoading ? (
                <div className="flex items-center gap-3 rounded-2xl bg-[#F8F3EC] px-4 py-6 text-sm text-[#8C7A6B]">
                  <Loader2 size={16} className="animate-spin" />
                  正在整理最近行动项...
                </div>
              ) : null}

              {!isLoading && filteredActionItems.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#DDD2C7] bg-[#FCFAF7] px-4 py-10 text-center text-sm text-[#9A8877]">
                  还没有可展示的行动项。先完成一场 AI 总结，工作台会自动把行动项提到这里。
                </div>
              ) : null}

              {!isLoading &&
                filteredActionItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => router.push(`/meeting/${item.meetingId}`)}
                    className="w-full rounded-[24px] border border-[#E8DED3] bg-[#FCFAF7] px-4 py-4 text-left transition-all hover:border-[#D8CEC4] hover:bg-white"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#8C7A6B]">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={12} />
                        {formatMeetingDate(item.meetingDate)}
                      </span>
                      {item.workspace ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5EFE7] px-2.5 py-1 text-[11px] text-[#6C5D50]">
                          <WorkspaceIconBadge
                            icon={item.workspace.icon}
                            color={item.workspace.color}
                            size="sm"
                          />
                          {item.workspace.name}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 text-[15px] font-medium leading-7 text-[#3A2E25]">
                      {item.text}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-[#8C7A6B]">
                      {item.owner ? (
                        <span className="rounded-full bg-white px-2.5 py-1">负责人：{item.owner}</span>
                      ) : null}
                      {item.dueDate ? (
                        <span className="rounded-full bg-white px-2.5 py-1">截止：{item.dueDate}</span>
                      ) : null}
                      <span className="rounded-full bg-white px-2.5 py-1">
                        来自：{item.meetingTitle || '无标题记录'}
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-[#DED4C9] bg-white/90 p-6 shadow-[0_18px_48px_rgba(58,46,37,0.08)]">
            <h2 className="font-song text-[26px] text-[#3A2E25]">当前上下文</h2>
            <div className="mt-5 space-y-3 text-sm text-[#7C6B5C]">
              <div className="rounded-[22px] border border-[#E7DDD2] bg-[#FCFAF7] px-4 py-4">
                <div className="text-[12px] uppercase tracking-[0.2em] text-[#A08E7E]">Workspace</div>
                <div className="mt-2 text-[18px] font-semibold text-[#3A2E25]">
                  {currentWorkspaceName || '未选择工作区'}
                </div>
                <p className="mt-2 leading-6 text-[#8B796A]">
                  工作台默认从全局视角看最近任务和会议；切到“当前工作区”后，会用这里作为过滤上下文。
                </p>
              </div>

              <div className="rounded-[22px] border border-[#E7DDD2] bg-[#FCFAF7] px-4 py-4">
                <div className="text-[12px] uppercase tracking-[0.2em] text-[#A08E7E]">Tips</div>
                <ul className="mt-3 space-y-2 leading-6 text-[#6F6053]">
                  <li>先录音，再生成 AI 总结，行动项才会自动出现在首页。</li>
                  <li>“导入音频”会直接进入上传转写链路，无需先手动点录音页按钮。</li>
                  <li>全局问题请直接去 AI 对话页，工作台不再重复放一个简化版 chat。</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-[#DED4C9] bg-white/90 p-6 shadow-[0_18px_48px_rgba(58,46,37,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-song text-[28px] text-[#3A2E25]">最近会议</h2>
              <p className="mt-1 text-sm text-[#8B796A]">会议浏览还在这里，只是不再占据首页首屏。</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="inline-flex rounded-full border border-[#E3D9CE] bg-[#F8F4EF] p-1 text-[12px]">
                <button
                  type="button"
                  onClick={() => setMeetingScope('all')}
                  className={`rounded-full px-3 py-1.5 transition-all ${
                    meetingScope === 'all'
                      ? 'bg-white text-[#3A2E25] shadow-sm'
                      : 'text-[#8C7A6B]'
                  }`}
                >
                  全部工作区
                </button>
                <button
                  type="button"
                  onClick={() => setMeetingScope('current')}
                  className={`rounded-full px-3 py-1.5 transition-all ${
                    meetingScope === 'current'
                      ? 'bg-white text-[#3A2E25] shadow-sm'
                      : 'text-[#8C7A6B]'
                  }`}
                >
                  当前工作区
                </button>
              </div>

              <input
                value={meetingQuery}
                onChange={(event) => setMeetingQuery(event.target.value)}
                placeholder="搜索最近会议"
                className="w-full rounded-2xl border border-[#D8CEC4] bg-[#FCFAF7] px-4 py-2.5 text-sm text-[#3A2E25] placeholder:text-[#A69B8F] focus:border-[#C7B6A5] focus:outline-none sm:w-56"
              />
            </div>
          </div>

          <div className="mt-6 space-y-6">
            {error ? (
              <div className="rounded-[22px] border border-[#F0C6C3] bg-[#FFF3F2] px-4 py-4 text-sm text-[#B35454]">
                {error}
              </div>
            ) : null}

            {!isLoading && filteredMeetings.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#DDD2C7] bg-[#FCFAF7] px-4 py-10 text-center text-sm text-[#9A8877]">
                {meetingQuery ? '没有符合条件的会议。' : '这里还没有可显示的会议记录。'}
              </div>
            ) : null}

            {isLoading ? (
              <div className="flex items-center gap-3 rounded-2xl bg-[#F8F3EC] px-4 py-6 text-sm text-[#8C7A6B]">
                <Loader2 size={16} className="animate-spin" />
                正在加载最近会议...
              </div>
            ) : null}

            {!isLoading &&
              groupedMeetings.map((group) => (
                <div key={group.label}>
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#A08E7E]">
                    {group.label}
                  </div>
                  <div className="space-y-2.5">
                    {group.items.map((meeting) => {
                      const canMove = workspaces.length > 0;
                      return (
                        <div
                          key={meeting.id}
                          className="group flex items-start gap-3 rounded-[24px] border border-[#E8DED3] bg-[#FCFAF7] px-4 py-4 transition-all hover:border-[#D8CEC4] hover:bg-white"
                        >
                          <button
                            type="button"
                            onClick={() => router.push(`/meeting/${meeting.id}`)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="line-clamp-2 text-[15px] font-medium text-[#3A2E25]">
                              {meeting.title || '无标题记录'}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-[#8C7A6B]">
                              <span>{formatTime(meeting.date)}</span>
                              {meeting.workspace ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E8DED3] bg-white px-2.5 py-1 text-[11px] text-[#6C5D50]">
                                  <WorkspaceIconBadge
                                    icon={meeting.workspace.icon}
                                    color={meeting.workspace.color}
                                    size="sm"
                                  />
                                  {meeting.workspace.name}
                                </span>
                              ) : null}
                              {meeting.duration > 0 ? (
                                <span className="inline-flex items-center gap-1">
                                  <Clock3 size={12} />
                                  {formatDuration(meeting.duration)}
                                </span>
                              ) : null}
                              {meeting.folder ? (
                                <span className="inline-flex items-center gap-1">
                                  <FolderClosed size={12} />
                                  {meeting.folder.name}
                                </span>
                              ) : null}
                              {meeting._count.segments > 0 ? (
                                <span className="inline-flex items-center gap-1">
                                  <FileText size={12} />
                                  {meeting._count.segments} 段
                                </span>
                              ) : null}
                            </div>
                          </button>

                          {canMove ? (
                            <div
                              className="relative"
                              onClick={(event) => event.stopPropagation()}
                              onPointerDown={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenMoveMenuId((prev) =>
                                    prev === meeting.id ? null : meeting.id
                                  )
                                }
                                className="rounded-xl p-2 text-[#A69B8F] opacity-0 transition-all group-hover:opacity-100 hover:bg-[#F4EEE6] hover:text-[#5C4D42]"
                              >
                                <MoreHorizontal size={16} />
                              </button>

                              {openMoveMenuId === meeting.id ? (
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
                                          onClick={() =>
                                            void handleMoveMeeting(meeting.id, workspace.id)
                                          }
                                          className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm text-[#4A3C31] transition-colors hover:bg-[#F7F3EE] disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
                                        >
                                          <span className="flex min-w-0 items-center gap-2">
                                            <WorkspaceIconBadge
                                              icon={workspace.icon}
                                              color={workspace.color}
                                              size="sm"
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
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>

      <WorkspaceModal
        open={workspaceModalOpen}
        mode="create"
        onClose={() => setWorkspaceModalOpen(false)}
        onSubmit={handleCreateWorkspace}
      />
    </div>
  );
}
