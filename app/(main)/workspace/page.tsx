'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Calendar, Plus, Sparkles } from 'lucide-react';
import WorkspaceIconBadge from '@/components/WorkspaceIconBadge';
import WorkspaceModal from '@/components/WorkspaceModal';
import { useMeetingStore } from '@/lib/store';
import type { WorkspaceOverviewItem } from '@/lib/types';
import { getWorkspaceModeConfig, getWorkspaceModeLabel } from '@/lib/workspace-mode';

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
    async (input: {
      name: string;
      description: string;
      color: string;
      icon: string;
      workflowMode: 'general' | 'interview';
      modeLabel: string;
    }) => {
      const workspace = await createWorkspace(input);
      setCurrentWorkspaceId(workspace.id);
      await loadOverview();
      router.push(`/workspace/${workspace.id}`);
    },
    [createWorkspace, loadOverview, router, setCurrentWorkspaceId]
  );

  return (
    <div className="flex-1">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-6 pb-10 pt-8 sm:px-8 lg:px-10">
        <section className="rounded-none border-2 border-[#111] bg-[#F4F0E6] px-6 py-7 shadow-[4px_4px_0px_#111] sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-none border-2 border-[#111] bg-[#F4F0E6] px-4 py-2 text-sm text-[#111]">
                <Sparkles size={14} />
                总工作区
              </div>
              <h1 className="mt-4 font-[family-name:var(--font-vt323)] text-[34px] leading-tight text-[#111] sm:text-[42px]">
                在这里进入各个工作区
              </h1>
              <p className="mt-3 max-w-[720px] text-[15px] leading-7 text-[#8A8578]">
                工作区是你管理会议、笔记和归档历史的主入口。先选一个工作区，再进入具体记录。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {currentWorkspace ? (
                <button
                  type="button"
                  onClick={() => handleOpenWorkspace(currentWorkspace.id)}
                  className="inline-flex items-center gap-2 rounded-none border-2 border-[#111] bg-[#F4F0E6] px-4 py-2.5 text-sm font-medium text-[#111] shadow-[4px_4px_0px_#111] transition-colors hover:bg-[#E8E4DA]"
                >
                  <WorkspaceIconBadge icon={currentWorkspace.icon} color={currentWorkspace.color} size="sm" />
                  进入当前工作区
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 rounded-none border-2 border-[#111] bg-[#111] px-4 py-2.5 text-sm font-medium text-[#F4F0E6] shadow-[4px_4px_0px_#111] transition-colors hover:bg-[#333]"
              >
                <Plus size={16} />
                创建工作区
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-none border-2 border-rose-600 bg-rose-50 px-5 py-4 text-sm text-rose-600">
            {error}
          </section>
        ) : null}

        <section className="rounded-none border-2 border-[#111] bg-[#F4F0E6] p-4 shadow-[4px_4px_0px_#111] sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-2">
            <div>
              <h2 className="font-[family-name:var(--font-vt323)] text-[26px] text-[#111]">全部工作区</h2>
              <p className="mt-1 text-sm text-[#8A8578]">
                点击任意卡片进入该工作区，查看会议历史和笔记记录。
              </p>
            </div>
            <div className="rounded-none border-2 border-[#111] bg-[#F4F0E6] px-3 py-2 text-[12px] text-[#8A8578]">
              共 {overview.length} 个工作区
            </div>
          </div>

          {isLoading ? (
            <div className="px-2 py-14 text-center text-sm text-[#8A8578]">正在加载工作区...</div>
          ) : overview.length === 0 ? (
            <div className="rounded-none border-2 border-dashed border-[#111] bg-[#F4F0E6] px-6 py-12 text-center">
              <p className="text-base font-medium text-[#111]">还没有工作区</p>
              <p className="mt-2 text-sm text-[#8A8578]">先创建一个工作区，再把会议和笔记整理进去。</p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-none border-2 border-[#111] bg-[#111] px-4 py-2.5 text-sm font-medium text-[#F4F0E6] shadow-[4px_4px_0px_#111] transition-colors hover:bg-[#333]"
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
                  className={`retro-window group rounded-none border-2 bg-[#F4F0E6] p-5 text-left shadow-[4px_4px_0px_#111] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#111] ${
                    workspace.id === currentWorkspaceId
                      ? 'border-[#111] ring-2 ring-[#111]'
                      : 'border-[#111]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <WorkspaceIconBadge icon={workspace.icon} color={workspace.color} size="lg" />
                      <div className="min-w-0">
                        <div className="truncate text-lg font-semibold text-[#111]">{workspace.name}</div>
                        <div className="mt-1 text-xs text-[#8A8578]">
                          {workspace.id === currentWorkspaceId ? '当前工作区' : '点击进入管理'}
                        </div>
                        <div
                          className={`mt-2 inline-flex rounded-none border-2 border-[#111] px-2.5 py-1 text-[11px] font-medium ${
                            getWorkspaceModeConfig(workspace.workflowMode).accentSurface
                          } ${getWorkspaceModeConfig(workspace.workflowMode).accentText}`}
                        >
                          {getWorkspaceModeLabel(workspace)}
                        </div>
                      </div>
                    </div>
                    <ArrowRight
                      size={16}
                      className="shrink-0 text-[#8A8578] transition-transform group-hover:translate-x-0.5"
                    />
                  </div>

                  <p className="mt-4 line-clamp-2 min-h-[44px] text-sm leading-6 text-[#8A8578]">
                    {workspace.description || '还没有描述，可进入后继续补充用途和上下文。'}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-2 text-[12px] text-[#8A8578]">
                    <span className="rounded-none border-2 border-[#111] bg-[#F4F0E6] px-3 py-1.5">
                      会议 {workspace.meetingCount} 条
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-none border-2 border-[#111] bg-[#F4F0E6] px-3 py-1.5">
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
