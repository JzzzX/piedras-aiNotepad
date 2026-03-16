'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Clock3, Plus } from 'lucide-react';
import WorkspaceModal from '@/components/WorkspaceModal';
import { useMeetingStore, type MeetingListItem } from '@/lib/store';
import type { GlobalChatSessionSummary, Workspace } from '@/lib/types';
import { getWorkspaceModeLabel } from '@/lib/workspace-mode';

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < hour) return `${Math.max(1, Math.round(diff / minute))} 分钟前`;
  if (diff < day) return `${Math.round(diff / hour)} 小时前`;
  if (diff < day * 7) return `${Math.round(diff / day)} 天前`;
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

function formatMeetingDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number) {
  if (seconds <= 0) return '未结束';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m${rest > 0 ? `${rest}s` : ''}`;
}

function GreetingHeader() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const hour = now.getHours();
  const greeting =
    hour < 6 ? '夜深了' : hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';

  return (
    <div>
      <div className="text-[12px] uppercase tracking-[0.26em] text-[#B29F8B]">
        {now.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        })}
      </div>
      <h1 className="mt-3 font-song text-[34px] leading-tight text-[#3A2E25] sm:text-[44px]">
        {greeting}
      </h1>
      <p className="mt-3 max-w-[620px] text-[15px] leading-7 text-[#7C6B5C]">
        从最近的会议和最近的对话继续，不用每次都重新找上下文。
      </p>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { currentWorkspaceId, setCurrentWorkspaceId, workspaces, loadWorkspaces, createWorkspace } =
    useMeetingStore();

  const [selectedWorkspaceOverride, setSelectedWorkspaceOverride] = useState<
    string | null | undefined
  >(undefined);
  const [sessions, setSessions] = useState<GlobalChatSessionSummary[]>([]);
  const [recentMeetings, setRecentMeetings] = useState<MeetingListItem[]>([]);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  const selectedWorkspaceId =
    selectedWorkspaceOverride !== undefined
      ? selectedWorkspaceOverride
      : currentWorkspaceId || workspaces[0]?.id || null;

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        const sessionsRes = await fetch('/api/chat/sessions?limit=5');
        if (active && sessionsRes.ok) {
          setSessions((await sessionsRes.json()) as GlobalChatSessionSummary[]);
        }
      } catch (error) {
        console.error('加载首页对话失败:', error);
      }
    };

    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadScopedMeetings = async () => {
      if (!selectedWorkspaceId) {
        setRecentMeetings([]);
        return;
      }

      try {
        const meetingsRes = await fetch(`/api/meetings?workspaceId=${selectedWorkspaceId}`);
        if (!active || !meetingsRes.ok) return;
        const meetings = (await meetingsRes.json()) as MeetingListItem[];
        setRecentMeetings(meetings.slice(0, 6));
      } catch (error) {
        console.error('加载首页会议失败:', error);
      }
    };

    void loadScopedMeetings();
    return () => {
      active = false;
    };
  }, [selectedWorkspaceId]);

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspaceId) || null,
    [selectedWorkspaceId, workspaces]
  );

  const handleSelectWorkspace = useCallback(
    (workspaceId: string) => {
      setSelectedWorkspaceOverride(workspaceId);
      setCurrentWorkspaceId(workspaceId);
    },
    [setCurrentWorkspaceId]
  );

  const handleCreateWorkspace = useCallback(
    async (input: {
      name: string;
      description: string;
      color: string;
      icon: string;
      workflowMode: Workspace['workflowMode'];
      modeLabel: string;
    }) => {
      const workspace = await createWorkspace(input);
      setCurrentWorkspaceId(workspace.id);
      setSelectedWorkspaceOverride(workspace.id);
      setShowCreateWorkspace(false);
      router.push(`/workspace/${workspace.id}`);
    },
    [createWorkspace, router, setCurrentWorkspaceId]
  );

  return (
    <div className="flex-1">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-8 px-6 pb-12 pt-10 sm:px-8 lg:px-10">
        <section className="rounded-[34px] border border-[#DED4C9] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.94),_rgba(249,244,237,0.98)_58%,_rgba(239,231,221,1))] px-6 py-8 shadow-[0_24px_72px_rgba(58,46,37,0.08)] sm:px-8 sm:py-9">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <GreetingHeader />
            <div className="flex flex-wrap items-center gap-3">
              {selectedWorkspace ? (
                <Link
                  href={`/workspace/${selectedWorkspace.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[#D8CEC4] bg-white/88 px-4 py-2 text-sm text-[#5C4D42] transition-colors hover:bg-white"
                >
                  进入 {selectedWorkspace.name}
                  <ArrowRight size={14} />
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => setShowCreateWorkspace(true)}
                className="inline-flex items-center gap-2 rounded-full border border-[#D8CEC4] bg-white/70 px-4 py-2 text-sm text-[#5C4D42] transition-colors hover:bg-white"
              >
                <Plus size={14} />
                创建工作区
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <div className="rounded-[30px] border border-[#DED4C9] bg-white/90 p-6 shadow-[0_18px_48px_rgba(58,46,37,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-song text-[24px] text-[#3A2E25]">最近会议</h2>
                <p className="mt-1 text-sm text-[#8C7A6B]">
                  {selectedWorkspace
                    ? `当前查看 ${selectedWorkspace.name} 下最近继续过的会议。`
                    : '先创建一个工作区，再开始积累会议记录。'}
                </p>
              </div>
              {selectedWorkspace ? (
                <Link
                  href={`/workspace/${selectedWorkspace.id}`}
                  className="inline-flex items-center gap-1 rounded-full border border-[#D8CEC4] bg-[#FBF8F4] px-3 py-2 text-sm text-[#6B5C50] transition-colors hover:bg-white"
                >
                  查看工作区
                  <ArrowRight size={14} />
                </Link>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {workspaces.map((workspace) => {
                const active = workspace.id === selectedWorkspaceId;
                return (
                  <button
                    key={workspace.id}
                    type="button"
                    onClick={() => handleSelectWorkspace(workspace.id)}
                    className={`rounded-full border px-4 py-2 text-left transition-all ${
                      active
                        ? 'border-[#D4C1AA] bg-white shadow-sm ring-2 ring-[#EFE1D0]'
                        : 'border-[#E7DDD2] bg-white/70 hover:border-[#D9CBBB] hover:bg-white'
                    }`}
                  >
                    <div className="text-sm font-semibold text-[#3A2E25]">{workspace.name}</div>
                    <div className="mt-0.5 text-[11px] text-[#9D8B7B]">
                      {getWorkspaceModeLabel(workspace)}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 space-y-3">
              {selectedWorkspace && recentMeetings.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#D8CEC4] bg-[#FCFAF7] px-5 py-10 text-center">
                  <p className="text-sm font-medium text-[#5C4D42]">这个工作区还没有会议</p>
                  <p className="mt-2 text-sm leading-6 text-[#8B796A]">
                    进入工作区后开始录音或导入音频，会自动沉淀到正确上下文。
                  </p>
                </div>
              ) : !selectedWorkspace ? (
                <div className="rounded-[24px] border border-dashed border-[#D8CEC4] bg-[#FCFAF7] px-5 py-10 text-center">
                  <p className="text-sm font-medium text-[#5C4D42]">还没有工作区</p>
                  <p className="mt-2 text-sm leading-6 text-[#8B796A]">先创建一个工作区，再开始积累会议与笔记。</p>
                </div>
              ) : (
                recentMeetings.map((meeting) => (
                  <button
                    key={meeting.id}
                    type="button"
                    onClick={() => router.push(`/meeting/${meeting.id}?returnTo=${encodeURIComponent('/')}`)}
                    className="w-full rounded-[24px] border border-[#E8DED3] bg-[#FCFAF7] p-4 text-left transition-all hover:border-[#D8CEC4] hover:shadow-[0_12px_24px_rgba(58,46,37,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="line-clamp-1 text-[15px] font-semibold text-[#3A2E25]">
                          {meeting.title || '无标题记录'}
                        </div>
                        {meeting.roundLabel ? (
                          <div className="mt-1 text-xs text-[#A09082]">
                            {meeting.roundLabel}
                            {meeting.interviewerName ? ` · ${meeting.interviewerName}` : ''}
                          </div>
                        ) : null}
                      </div>
                      <div className="text-xs text-[#A09082]">{formatDuration(meeting.duration)}</div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-[#8B796A]">
                      <Clock3 size={12} />
                      {formatMeetingDate(meeting.date)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[30px] border border-[#DED4C9] bg-white/90 p-6 shadow-[0_18px_48px_rgba(58,46,37,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-song text-[24px] text-[#3A2E25]">最近对话</h2>
                <p className="mt-1 text-sm text-[#8C7A6B]">从最近的 AI 对话继续，不用重复描述上下文。</p>
              </div>
              <Link
                href="/chat/history"
                className="inline-flex items-center gap-1 rounded-full border border-[#D8CEC4] bg-[#FBF8F4] px-3 py-2 text-sm text-[#6B5C50] transition-colors hover:bg-white"
              >
                查看全部
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {sessions.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#D8CEC4] bg-[#FCFAF7] px-5 py-10 text-center">
                  <p className="text-sm font-medium text-[#5C4D42]">还没有历史对话</p>
                  <p className="mt-2 text-sm leading-6 text-[#8B796A]">进入 AI 对话页发起一次问题，之后就会出现在这里。</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => router.push(`/chat/${session.id}`)}
                    className="w-full rounded-[24px] border border-[#E8DED3] bg-[#FCFAF7] p-4 text-left transition-all hover:border-[#D8CEC4] hover:shadow-[0_12px_24px_rgba(58,46,37,0.06)]"
                  >
                    <div className="line-clamp-1 text-[15px] font-semibold text-[#3A2E25]">
                      {session.title}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#8B796A]">
                      <span className="rounded-full bg-white px-2.5 py-1">
                        {session.workspace?.name || '全部工作区'}
                      </span>
                      <span>{formatRelativeTime(session.updatedAt)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      <WorkspaceModal
        open={showCreateWorkspace}
        mode="create"
        onClose={() => setShowCreateWorkspace(false)}
        onSubmit={handleCreateWorkspace}
      />
    </div>
  );
}
