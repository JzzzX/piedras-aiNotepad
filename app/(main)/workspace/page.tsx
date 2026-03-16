'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Calendar, Mic, Plus, Sparkles } from 'lucide-react';
import WorkspaceIconBadge from '@/components/WorkspaceIconBadge';
import WorkspaceModal from '@/components/WorkspaceModal';
import { useMeetingStore } from '@/lib/store';
import type { WorkspaceOverviewItem } from '@/lib/types';

function formatLatestMeeting(value?: string | null) {
  if (!value) return '还没有会议';
  const date = new Date(value);
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function WorkspaceOverviewPage() {
  const router = useRouter();
  const { currentWorkspaceId, setCurrentWorkspaceId, createWorkspace, loadWorkspaces } = useMeetingStore();

  const [overview, setOverview] = useState<WorkspaceOverviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/workspaces/overview', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('加载工作区总览失败');
      }

      const data = (await res.json()) as WorkspaceOverviewItem[];
      setOverview(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '加载工作区总览失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspaces();
    void loadOverview();
  }, [loadOverview, loadWorkspaces]);

  const currentWorkspace = useMemo(
    () => overview.find((workspace) => workspace.id === currentWorkspaceId) || null,
    [currentWorkspaceId, overview]
  );

  const handleOpenWorkspace = useCallback(
    (workspaceId: string) => {
      setCurrentWorkspaceId(workspaceId);
      router.push(`/workspace/${workspaceId}`);
    },
    [router, setCurrentWorkspaceId]
  );

  const handleCreateWorkspace = useCallback(
    async (input: { name: string; description: string; color: string; icon: string }) => {
      const workspace = await createWorkspace(input);
      setCurrentWorkspaceId(workspace.id);
      await loadOverview();
      router.push(`/workspace/${workspace.id}`);
    },
    [createWorkspace, loadOverview, router, setCurrentWorkspaceId]
  );

  const handleNewMeeting = useCallback(() => {
    const { reset } = useMeetingStore.getState();
    reset();
    const newId = useMeetingStore.getState().meetingId;
    router.push(`/meeting/${newId}?returnTo=${encodeURIComponent('/workspace')}`);
  }, [router]);

  return (
    <div className="min-h-full bg-[#F6F2EB]">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-6 pb-10 pt-8 sm:px-8 lg:px-10">
        <section className="rounded-[30px] border border-[#DED4C9] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.94),_rgba(249,244,237,0.98)_58%,_rgba(239,231,221,1))] px-6 py-7 shadow-[0_24px_72px_rgba(58,46,37,0.08)] sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm text-[#6C5D50]">
                <Sparkles size={14} />
                总工作区
              </div>
              <h1 className="mt-4 font-song text-[34px] leading-tight text-[#3A2E25] sm:text-[42px]">
                在这里进入各个工作区
              </h1>
              <p className="mt-3 max-w-[720px] text-[15px] leading-7 text-[#7C6B5C]">
                工作区是你管理会议、笔记和归档历史的主入口。先选一个工作区，再进入具体记录。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {currentWorkspace ? (
                <button
                  type="button"
                  onClick={() => handleOpenWorkspace(currentWorkspace.id)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#D8CEC4] bg-white px-4 py-2.5 text-sm font-medium text-[#5C4D42] transition-colors hover:bg-[#FBF8F4]"
                >
                  <WorkspaceIconBadge icon={currentWorkspace.icon} color={currentWorkspace.color} size="sm" />
                  进入当前工作区
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleNewMeeting}
                className="inline-flex items-center gap-2 rounded-xl border border-[#D8CEC4] bg-white px-4 py-2.5 text-sm font-medium text-[#5C4D42] transition-colors hover:bg-[#FBF8F4]"
              >
                <Mic size={16} />
                开始录音
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#3A2E25] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2B2420]"
              >
                <Plus size={16} />
                创建工作区
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-600">
            {error}
          </section>
        ) : null}

        <section className="rounded-[30px] border border-[#DED4C9] bg-white/90 p-4 shadow-[0_18px_48px_rgba(58,46,37,0.08)] sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-2">
            <div>
              <h2 className="font-song text-[26px] text-[#3A2E25]">全部工作区</h2>
              <p className="mt-1 text-sm text-[#8B796A]">
                点击任意卡片进入该工作区，查看会议历史和笔记记录。
              </p>
            </div>
            <div className="rounded-full bg-[#F8F4EF] px-3 py-2 text-[12px] text-[#8B796A]">
              共 {overview.length} 个工作区
            </div>
          </div>

          {isLoading ? (
            <div className="px-2 py-14 text-center text-sm text-[#8B796A]">正在加载工作区...</div>
          ) : overview.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#D8CEC4] bg-[#FCFAF7] px-6 py-12 text-center">
              <p className="text-base font-medium text-[#5C4D42]">还没有工作区</p>
              <p className="mt-2 text-sm text-[#8B796A]">先创建一个工作区，再把会议和笔记整理进去。</p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#3A2E25] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2B2420]"
              >
                <Plus size={16} />
                创建工作区
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {overview.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => handleOpenWorkspace(workspace.id)}
                  className={`group rounded-[26px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,243,236,0.92))] p-5 text-left shadow-[0_14px_40px_rgba(58,46,37,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(58,46,37,0.12)] ${
                    workspace.id === currentWorkspaceId
                      ? 'border-[#D4C1AA] ring-2 ring-[#EFE1D0]'
                      : 'border-[#E7DDD2] hover:border-[#D9CBBB]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <WorkspaceIconBadge icon={workspace.icon} color={workspace.color} size="lg" />
                      <div className="min-w-0">
                        <div className="truncate text-lg font-semibold text-[#3A2E25]">{workspace.name}</div>
                        <div className="mt-1 text-xs text-[#A09082]">
                          {workspace.id === currentWorkspaceId ? '当前工作区' : '点击进入管理'}
                        </div>
                      </div>
                    </div>
                    <ArrowRight
                      size={16}
                      className="shrink-0 text-[#B09D8A] transition-transform group-hover:translate-x-0.5"
                    />
                  </div>

                  <p className="mt-4 line-clamp-2 min-h-[44px] text-sm leading-6 text-[#746556]">
                    {workspace.description || '还没有描述，可进入后继续补充用途和上下文。'}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-2 text-[12px] text-[#8B796A]">
                    <span className="rounded-full bg-white px-3 py-1.5">
                      会议 {workspace.meetingCount} 条
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5">
                      <Calendar size={12} />
                      {formatLatestMeeting(workspace.latestMeetingAt)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <WorkspaceModal
        open={showCreateModal}
        mode="create"
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateWorkspace}
      />
    </div>
  );
}
