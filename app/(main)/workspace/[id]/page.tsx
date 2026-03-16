'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowRight,
  Edit3,
  FileAudio,
  FileText,
  FolderClosed,
  LibraryBig,
  Mic,
  Plus,
  Trash2,
  UserRound,
} from 'lucide-react';
import AssetLibrary from '@/components/AssetLibrary';
import CollectionModal from '@/components/CollectionModal';
import MeetingHistory from '@/components/MeetingHistory';
import WorkspaceIconBadge from '@/components/WorkspaceIconBadge';
import WorkspaceModal from '@/components/WorkspaceModal';
import { getCandidateStatusMeta, getRecommendationMeta } from '@/lib/interview';
import { useMeetingStore } from '@/lib/store';
import type { Collection } from '@/lib/types';
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

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const {
    workspaces,
    currentWorkspaceId,
    setCurrentWorkspaceId,
    loadWorkspaces,
    loadCollections,
    loadMeetingList,
    updateWorkspace,
    createCollection,
    updateCollection,
    deleteCollection,
    meetingList,
    collections,
  } = useMeetingStore();

  const [showEditWorkspace, setShowEditWorkspace] = useState(false);
  const [activeTab, setActiveTab] = useState<'collections' | 'meetings' | 'assets'>('collections');
  const [assetUploadSignal, setAssetUploadSignal] = useState(0);
  const [collectionModalState, setCollectionModalState] = useState<{
    mode: 'create' | 'edit';
    collectionId?: string;
  } | null>(null);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    if (!workspaceId) return;
    if (currentWorkspaceId !== workspaceId) {
      setCurrentWorkspaceId(workspaceId);
    }
  }, [currentWorkspaceId, setCurrentWorkspaceId, workspaceId]);

  useEffect(() => {
    if (!workspaceId || currentWorkspaceId !== workspaceId) return;
    void loadCollections();
    void loadMeetingList({ workspaceScope: 'current' });
  }, [currentWorkspaceId, loadCollections, loadMeetingList, workspaceId]);

  const workspace = useMemo(
    () => workspaces.find((item) => item.id === workspaceId) || null,
    [workspaceId, workspaces]
  );

  useEffect(() => {
    if (workspaces.length > 0 && !workspace) {
      router.replace('/workspace');
    }
  }, [router, workspace, workspaces.length]);

  const collectionById = useMemo(
    () => new Map(collections.map((item) => [item.id, item])),
    [collections]
  );

  const collectionStats = useMemo(() => {
    const grouped = collections.map((collection) => {
      const meetings = meetingList.filter((meeting) => meeting.collectionId === collection.id);
      return {
        collection,
        meetings,
        meetingCount: meetings.length,
        latestMeetingAt: meetings[0]?.date || null,
      };
    });

    const ungroupedMeetings = meetingList.filter((meeting) => !meeting.collectionId);
    return {
      grouped,
      ungroupedCount: ungroupedMeetings.length,
      ungroupedLatestMeetingAt: ungroupedMeetings[0]?.date || null,
    };
  }, [collections, meetingList]);

  const editingCollection =
    collectionModalState?.mode === 'edit' && collectionModalState.collectionId
      ? collectionById.get(collectionModalState.collectionId) || null
      : null;

  const isInterviewMode = workspace?.workflowMode === 'interview';
  const modeConfig = workspace ? getWorkspaceModeConfig(workspace.workflowMode) : null;

  const handleNewMeeting = useCallback(() => {
    const { reset } = useMeetingStore.getState();
    reset();
    const newId = useMeetingStore.getState().meetingId;
    router.push(`/meeting/${newId}?returnTo=${encodeURIComponent(`/workspace/${workspaceId}`)}`);
  }, [router, workspaceId]);

  const handleImportAudio = useCallback(() => {
    const { reset } = useMeetingStore.getState();
    reset();
    const newId = useMeetingStore.getState().meetingId;
    router.push(
      `/meeting/${newId}?intent=upload&returnTo=${encodeURIComponent(`/workspace/${workspaceId}`)}`
    );
  }, [router, workspaceId]);

  const handleSaveWorkspace = useCallback(
    async (input: {
      name: string;
      description: string;
      color: string;
      icon: string;
      workflowMode: 'general' | 'interview';
      modeLabel: string;
    }) => {
      if (!workspace) return;
      await updateWorkspace(workspace.id, input);
      setShowEditWorkspace(false);
    },
    [updateWorkspace, workspace]
  );

  const handleSaveCollection = useCallback(
    async (input: {
      name: string;
      description: string;
      color: string;
      icon: string;
      candidateStatus: Collection['candidateStatus'];
      nextInterviewer: string;
      nextFocus: string;
    }) => {
      if (collectionModalState?.mode === 'edit' && collectionModalState.collectionId) {
        await updateCollection(collectionModalState.collectionId, input);
      } else {
        await createCollection(input);
      }
      setCollectionModalState(null);
    },
    [collectionModalState, createCollection, updateCollection]
  );

  const handleDeleteCollection = useCallback(
    async (collection: Collection) => {
      if (
        !window.confirm(
          isInterviewMode
            ? `确定删除候选人「${collection.name}」吗？其下会议会回到“未归类”。`
            : `确定删除「${collection.name}」吗？其中会议会回到“未归类”。`
        )
      ) {
        return;
      }
      await deleteCollection(collection.id);
    },
    [deleteCollection, isInterviewMode]
  );

  const openCollectionRoute = useCallback(
    (collectionId: string) => {
      router.push(`/workspace/${workspaceId}/collections/${collectionId}`);
    },
    [router, workspaceId]
  );

  const openUngroupedRoute = useCallback(() => {
    router.push(`/workspace/${workspaceId}/ungrouped`);
  }, [router, workspaceId]);

  return (
    <div className="min-h-full shrink-0">
      <div className="mx-auto grid min-h-full w-full max-w-[1180px] grid-rows-[auto_minmax(0,1fr)] gap-6 px-6 pb-10 pt-8 sm:px-8 lg:px-10">
        <section className="rounded-[30px] border border-[#DED4C9] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.94),_rgba(249,244,237,0.98)_58%,_rgba(239,231,221,1))] px-6 py-7 shadow-[0_24px_72px_rgba(58,46,37,0.08)] sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              {workspace ? (
                <div
                  className={`inline-flex items-center gap-3 rounded-full px-4 py-2 text-sm ${
                    modeConfig?.accentSurface || 'bg-white/90'
                  } ${modeConfig?.accentText || 'text-[#6C5D50]'}`}
                >
                  <WorkspaceIconBadge icon={workspace.icon} color={workspace.color} size="sm" />
                  <span>{getWorkspaceModeLabel(workspace)}</span>
                </div>
              ) : null}
              <h1 className="mt-4 font-song text-[34px] leading-tight text-[#3A2E25] sm:text-[42px]">
                {workspace?.name || '工作区'}
              </h1>
              <p className="mt-3 max-w-[720px] text-[15px] leading-7 text-[#7C6B5C]">
                {isInterviewMode
                  ? workspace?.description || '在这里管理候选人、多轮面试和交接摘要。'
                  : workspace?.description || '先选一个 Collection，再管理这组会议和笔记历史。'}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] text-[#8B796A]">
                <span className="rounded-full bg-white px-3 py-1.5">会议 {meetingList.length} 条</span>
                <span className="rounded-full bg-white px-3 py-1.5">
                  {isInterviewMode ? '候选人' : 'Collection'} {collections.length} 个
                </span>
                {modeConfig ? (
                  <span
                    className={`rounded-full px-3 py-1.5 font-medium ${modeConfig.accentSurface} ${modeConfig.accentText}`}
                  >
                    {modeConfig.description}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isInterviewMode ? null : (
                <>
                  <button
                    type="button"
                    onClick={handleNewMeeting}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#3A2E25] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2B2420]"
                  >
                    <Mic size={16} />
                    新录音
                  </button>
                  <button
                    type="button"
                    onClick={handleImportAudio}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#D8CEC4] bg-white px-4 py-2.5 text-sm font-medium text-[#5C4D42] transition-colors hover:bg-[#FBF8F4]"
                  >
                    <FileAudio size={16} />
                    导入音频
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setShowEditWorkspace(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#D8CEC4] bg-white px-4 py-2.5 text-sm font-medium text-[#5C4D42] transition-colors hover:bg-[#FBF8F4]"
              >
                <Edit3 size={16} />
                编辑工作区
              </button>
              <button
                type="button"
                onClick={() => setCollectionModalState({ mode: 'create' })}
                className="inline-flex items-center gap-2 rounded-xl border border-[#D8CEC4] bg-white px-4 py-2.5 text-sm font-medium text-[#5C4D42] transition-colors hover:bg-[#FBF8F4]"
              >
                <Plus size={16} />
                {isInterviewMode ? '新增候选人' : '新建 Collection'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('assets');
                  setAssetUploadSignal((value) => value + 1);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-[#D8CEC4] bg-white px-4 py-2.5 text-sm font-medium text-[#5C4D42] transition-colors hover:bg-[#FBF8F4]"
              >
                <FileText size={16} />
                导入资料
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-[#DED4C9] bg-white/90 p-5 shadow-[0_18px_48px_rgba(58,46,37,0.08)]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-song text-[26px] text-[#3A2E25]">
                {activeTab === 'collections'
                  ? isInterviewMode
                    ? '候选人池'
                    : 'Collections'
                  : activeTab === 'meetings'
                    ? '会议记录'
                    : '资料库'}
              </h2>
              <p className="mt-1 text-sm text-[#8B796A]">
                {activeTab === 'collections'
                  ? isInterviewMode
                    ? '每个候选人对应一个 Collection，进入后可以查看多轮面试时间线和交接摘要。'
                    : '先进入某个 Collection，再查看那一组会议、笔记和后续检索范围。'
                  : activeTab === 'meetings'
                    ? '从整个工作区查看会议历史，并按 Collection 继续整理。'
                    : '当前资料库仅提供预览和归档；资料不会参与 AI 检索。'}
              </p>
            </div>
            <div className="inline-flex rounded-2xl border border-[#E3D9CE] bg-[#F8F4EF] p-1">
              <WorkspaceTab
                active={activeTab === 'collections'}
                icon={isInterviewMode ? <UserRound size={14} /> : <LibraryBig size={14} />}
                label={isInterviewMode ? '候选人' : 'Collections'}
                onClick={() => setActiveTab('collections')}
              />
              {!isInterviewMode ? (
                <WorkspaceTab
                  active={activeTab === 'meetings'}
                  icon={<Mic size={14} />}
                  label="会议记录"
                  onClick={() => setActiveTab('meetings')}
                />
              ) : null}
              <WorkspaceTab
                active={activeTab === 'assets'}
                icon={<FileText size={14} />}
                label="资料库"
                onClick={() => setActiveTab('assets')}
              />
            </div>
          </div>

          {activeTab === 'collections' ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {!isInterviewMode ? (
                <button
                  type="button"
                  onClick={openUngroupedRoute}
                  className="group rounded-[26px] border border-dashed border-[#D9CBBB] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,243,236,0.92))] p-5 text-left shadow-[0_14px_40px_rgba(58,46,37,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(58,46,37,0.1)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E3D9CE] bg-white text-[#8C7A6B]">
                        <FolderClosed size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-lg font-semibold text-[#3A2E25]">未归类</div>
                        <div className="mt-1 text-xs text-[#A09082]">尚未归入任何 Collection</div>
                      </div>
                    </div>
                    <ArrowRight size={16} className="shrink-0 text-[#B09D8A] transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-4 min-h-[44px] text-sm leading-6 text-[#746556]">
                    用来承接刚录完、还未整理结构的会议记录。
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-2 text-[12px] text-[#8B796A]">
                    <span className="rounded-full bg-white px-3 py-1.5">会议 {collectionStats.ungroupedCount} 条</span>
                    <span className="rounded-full bg-white px-3 py-1.5">
                      {formatLatestMeeting(collectionStats.ungroupedLatestMeetingAt)}
                    </span>
                  </div>
                </button>
              ) : null}

              {collectionStats.grouped.map(({ collection, meetingCount, latestMeetingAt, meetings }) => {
                const latestMeeting = meetings[0];
                const statusMeta = getCandidateStatusMeta(collection.candidateStatus);
                const recommendationMeta = latestMeeting
                  ? getRecommendationMeta(latestMeeting.recommendation)
                  : null;

                return (
                  <div
                    key={collection.id}
                    className="group rounded-[26px] border border-[#E7DDD2] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,243,236,0.92))] p-5 shadow-[0_14px_40px_rgba(58,46,37,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(58,46,37,0.12)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => openCollectionRoute(collection.id)}
                        className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      >
                        <WorkspaceIconBadge icon={collection.icon} color={collection.color} size="lg" />
                        <div className="min-w-0">
                          <div className="truncate text-lg font-semibold text-[#3A2E25]">
                            {collection.name}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className={`rounded-full px-2.5 py-1 ${statusMeta.tone}`}>
                              {statusMeta.label}
                            </span>
                            {recommendationMeta ? (
                              <span className={`rounded-full px-2.5 py-1 ${recommendationMeta.tone}`}>
                                {recommendationMeta.label}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setCollectionModalState({ mode: 'edit', collectionId: collection.id })
                          }
                          className="rounded-xl p-2 text-[#A09082] transition-colors hover:bg-white hover:text-[#5C4D42]"
                          title={isInterviewMode ? '编辑候选人' : '编辑 Collection'}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteCollection(collection)}
                          className="rounded-xl p-2 text-[#A09082] transition-colors hover:bg-rose-50 hover:text-rose-600"
                          title={isInterviewMode ? '删除候选人' : '删除 Collection'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openCollectionRoute(collection.id)}
                      className="mt-4 block w-full text-left"
                    >
                      <p className="line-clamp-3 min-h-[66px] text-sm leading-6 text-[#746556]">
                        {isInterviewMode
                          ? collection.nextFocus || collection.description || '进入后补充交接摘要和下一轮重点。'
                          : collection.description || '还没有描述，可进入后继续补充这个 Collection 的用途。'}
                      </p>
                      <div className="mt-5 flex flex-wrap items-center gap-2 text-[12px] text-[#8B796A]">
                        <span className="rounded-full bg-white px-3 py-1.5">
                          {isInterviewMode ? '轮次' : '会议'} {meetingCount} 条
                        </span>
                        <span className="rounded-full bg-white px-3 py-1.5">
                          {formatLatestMeeting(latestMeetingAt)}
                        </span>
                      </div>
                      {isInterviewMode ? (
                        <div className="mt-3 text-xs text-[#9D8B7B]">
                          下一位面试官：{collection.nextInterviewer || '待定'}
                          <br />
                          最近一轮：{latestMeeting?.roundLabel || '尚未开始'}
                        </div>
                      ) : null}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : activeTab === 'meetings' ? (
            <MeetingHistory
              hideCollectionFilter={false}
              emptyTitle="这个工作区还没有会议"
              emptyDescription="可以从这里开始录音、导入音频，或者进入 Collection 后继续整理。"
            />
          ) : (
            <AssetLibrary
              workspaceId={workspaceId}
              uploadSignal={assetUploadSignal}
              emptyTitle="这个工作区还没有资料"
              emptyDescription="当前资料库只提供预览和归档。后续接入外部识别能力后，再让资料参与检索。"
            />
          )}
        </section>
      </div>

      <WorkspaceModal
        open={showEditWorkspace}
        mode="edit"
        workspace={workspace}
        onClose={() => setShowEditWorkspace(false)}
        onSubmit={handleSaveWorkspace}
      />

      <CollectionModal
        open={Boolean(collectionModalState)}
        mode={collectionModalState?.mode || 'create'}
        workflowMode={workspace?.workflowMode || 'general'}
        collection={editingCollection}
        onClose={() => setCollectionModalState(null)}
        onSubmit={handleSaveCollection}
      />
    </div>
  );
}

function WorkspaceTab({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-[14px] px-4 py-2 text-sm font-medium transition-all ${
        active
          ? 'bg-[#4A3C31] text-white shadow-sm'
          : 'text-[#8C7A6B] hover:bg-white hover:text-[#4A3C31]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
