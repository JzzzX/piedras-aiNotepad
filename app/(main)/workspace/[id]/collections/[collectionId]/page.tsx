'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Edit3,
  FileAudio,
  FileText,
  Loader2,
  Mic,
  Sparkles,
} from 'lucide-react';
import AssetLibrary from '@/components/AssetLibrary';
import CollectionModal from '@/components/CollectionModal';
import MeetingHistory from '@/components/MeetingHistory';
import WorkspaceIconBadge from '@/components/WorkspaceIconBadge';
import { getCandidateStatusMeta, getRecommendationMeta } from '@/lib/interview';
import { useMeetingStore } from '@/lib/store';
import { getWorkspaceModeConfig, getWorkspaceModeLabel } from '@/lib/workspace-mode';

export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const collectionId = params.collectionId as string;
  const [activeTab, setActiveTab] = useState<'meetings' | 'assets'>('meetings');
  const [assetUploadSignal, setAssetUploadSignal] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [handoffDraft, setHandoffDraft] = useState('');
  const [handoffSaving, setHandoffSaving] = useState(false);
  const [handoffGenerating, setHandoffGenerating] = useState(false);
  const [handoffMessage, setHandoffMessage] = useState('');
  const {
    workspaces,
    collections,
    meetingList,
    currentWorkspaceId,
    setCurrentWorkspaceId,
    loadWorkspaces,
    loadCollections,
    loadMeetingList,
    updateCollection,
  } = useMeetingStore();

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
    void Promise.all([
      loadCollections(),
      loadMeetingList({ workspaceScope: 'current', collectionId }),
    ]);
  }, [collectionId, currentWorkspaceId, loadCollections, loadMeetingList, workspaceId]);

  const workspace = useMemo(
    () => workspaces.find((item) => item.id === workspaceId) || null,
    [workspaceId, workspaces]
  );
  const collection = useMemo(
    () => collections.find((item) => item.id === collectionId) || null,
    [collectionId, collections]
  );

  useEffect(() => {
    if (collection) {
      setHandoffDraft(collection.handoffSummary || '');
    }
  }, [collection]);

  useEffect(() => {
    if (collections.length > 0 && !collection) {
      router.replace(`/workspace/${workspaceId}`);
    }
  }, [collection, collections.length, router, workspaceId]);

  const isInterviewMode = workspace?.workflowMode === 'interview';
  const modeConfig = workspace ? getWorkspaceModeConfig(workspace.workflowMode) : null;
  const timelineMeetings = useMemo(
    () =>
      [...meetingList].sort(
        (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
      ),
    [meetingList]
  );

  const handleNewMeeting = useCallback(() => {
    const { reset, setCurrentCollectionId } = useMeetingStore.getState();
    reset();
    setCurrentCollectionId(collectionId);
    const newId = useMeetingStore.getState().meetingId;
    router.push(
      `/meeting/${newId}?returnTo=${encodeURIComponent(
        `/workspace/${workspaceId}/collections/${collectionId}`
      )}`
    );
  }, [collectionId, router, workspaceId]);

  const handleImportAudio = useCallback(() => {
    const { reset, setCurrentCollectionId } = useMeetingStore.getState();
    reset();
    setCurrentCollectionId(collectionId);
    const newId = useMeetingStore.getState().meetingId;
    router.push(
      `/meeting/${newId}?intent=upload&returnTo=${encodeURIComponent(
        `/workspace/${workspaceId}/collections/${collectionId}`
      )}`
    );
  }, [collectionId, router, workspaceId]);

  const handleSaveCollection = useCallback(
    async (input: {
      name: string;
      description: string;
      color: string;
      icon: string;
      candidateStatus: NonNullable<typeof collection>['candidateStatus'];
      nextInterviewer: string;
      nextFocus: string;
    }) => {
      if (!collection) return;
      await updateCollection(collection.id, input);
      setShowEditModal(false);
    },
    [collection, updateCollection]
  );

  const handleSaveHandoff = useCallback(async () => {
    if (!collection || handoffSaving) return;
    setHandoffSaving(true);
    setHandoffMessage('');
    try {
      await updateCollection(collection.id, { handoffSummary: handoffDraft });
      setHandoffMessage('交接摘要已保存');
    } catch (error) {
      setHandoffMessage(error instanceof Error ? error.message : '保存交接摘要失败');
    } finally {
      setHandoffSaving(false);
    }
  }, [collection, handoffDraft, handoffSaving, updateCollection]);

  const handleGenerateHandoff = useCallback(async () => {
    if (!collection || handoffGenerating) return;
    setHandoffGenerating(true);
    setHandoffMessage('');
    try {
      const res = await fetch(`/api/collections/${collection.id}/handoff`, {
        method: 'POST',
      });
      const data = (await res.json().catch(() => null)) as { content?: string; error?: string } | null;
      if (!res.ok || !data?.content) {
        throw new Error(data?.error || '生成交接摘要失败');
      }
      setHandoffDraft(data.content);
      setHandoffMessage('已基于历史面试生成新的交接摘要，请确认后保存');
    } catch (error) {
      setHandoffMessage(error instanceof Error ? error.message : '生成交接摘要失败');
    } finally {
      setHandoffGenerating(false);
    }
  }, [collection, handoffGenerating]);

  return (
    <div className="min-h-full shrink-0">
      <div
        className={`mx-auto grid min-h-full w-full max-w-[1180px] gap-6 px-6 pb-10 pt-8 sm:px-8 lg:px-10 ${
          isInterviewMode
            ? 'grid-rows-[auto_auto_minmax(0,1fr)]'
            : 'grid-rows-[auto_minmax(0,1fr)]'
        }`}
      >
        <section className="rounded-none border-2 border-[#111] bg-[#F4F0E6] px-6 py-7 shadow-[4px_4px_0px_#111] sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <Link
                href={`/workspace/${workspaceId}`}
                className="inline-flex items-center gap-2 rounded-none border-2 border-[#111] bg-[#F4F0E6] px-4 py-2 text-sm text-[#111] transition-colors hover:bg-[#E8E4DA]"
              >
                <ChevronLeft size={14} />
                返回工作区
              </Link>
              {workspace ? (
                <div
                  className={`mt-4 inline-flex items-center gap-3 rounded-none border-2 border-[#111] px-4 py-2 text-sm ${
                    modeConfig?.accentSurface || 'bg-[#F4F0E6]'
                  } ${modeConfig?.accentText || 'text-[#8A8578]'}`}
                >
                  <WorkspaceIconBadge icon={workspace.icon} color={workspace.color} size="sm" />
                  <span>{getWorkspaceModeLabel(workspace)}</span>
                </div>
              ) : null}
              <h1 className="mt-4 flex items-center gap-3 font-[family-name:var(--font-vt323)] text-[34px] leading-tight text-[#111] sm:text-[42px]">
                {collection ? (
                  <WorkspaceIconBadge icon={collection.icon} color={collection.color} size="lg" />
                ) : null}
                <span>{collection?.name || (isInterviewMode ? '候选人' : 'Collection')}</span>
              </h1>
              <p className="mt-3 max-w-[720px] text-[15px] leading-7 text-[#8A8578]">
                {isInterviewMode
                  ? collection?.description || '在这里查看候选人的多轮面试记录和交接摘要。'
                  : collection?.description || `查看 ${workspace?.name || '当前工作区'} 下这组会议与笔记历史。`}
              </p>
              {isInterviewMode && collection ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`rounded-none border-2 border-[#111] px-3 py-1.5 ${getCandidateStatusMeta(collection.candidateStatus).tone}`}
                  >
                    {getCandidateStatusMeta(collection.candidateStatus).label}
                  </span>
                  <span className="rounded-none border-2 border-[#111] bg-[#F4F0E6] px-3 py-1.5 text-[#8A8578]">
                    下一位面试官：{collection.nextInterviewer || '待定'}
                  </span>
                  <span className="rounded-none border-2 border-[#111] bg-[#F4F0E6] px-3 py-1.5 text-[#8A8578]">
                    下一轮重点：{collection.nextFocus || '待补充'}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleNewMeeting}
                className="inline-flex items-center gap-2 rounded-none border-2 border-[#111] bg-[#111] px-4 py-2.5 text-sm font-medium text-[#F4F0E6] shadow-[4px_4px_0px_#111] transition-colors hover:bg-[#333]"
              >
                <Mic size={16} />
                {isInterviewMode ? '发起这一轮' : '在此录音'}
              </button>
              <button
                type="button"
                onClick={handleImportAudio}
                className="inline-flex items-center gap-2 rounded-none border-2 border-[#111] bg-[#F4F0E6] px-4 py-2.5 text-sm font-medium text-[#111] shadow-[4px_4px_0px_#111] transition-colors hover:bg-[#E8E4DA]"
              >
                <FileAudio size={16} />
                {isInterviewMode ? '导入这一轮录音' : '导入音频'}
              </button>
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="inline-flex items-center gap-2 rounded-none border-2 border-[#111] bg-[#F4F0E6] px-4 py-2.5 text-sm font-medium text-[#111] shadow-[4px_4px_0px_#111] transition-colors hover:bg-[#E8E4DA]"
              >
                <Edit3 size={16} />
                {isInterviewMode ? '编辑候选人' : '编辑 Collection'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('assets');
                  setAssetUploadSignal((value) => value + 1);
                }}
                className="inline-flex items-center gap-2 rounded-none border-2 border-[#111] bg-[#F4F0E6] px-4 py-2.5 text-sm font-medium text-[#111] shadow-[4px_4px_0px_#111] transition-colors hover:bg-[#E8E4DA]"
              >
                <FileText size={16} />
                导入资料
              </button>
            </div>
          </div>
        </section>

        {isInterviewMode ? (
          <section className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="rounded-none border-2 border-[#111] bg-[#F4F0E6] p-5 shadow-[4px_4px_0px_#111]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-[family-name:var(--font-vt323)] text-[26px] text-[#111]">交接摘要</h2>
                  <p className="mt-1 text-sm text-[#8A8578]">
                    给下一位面试官一个能快速接手的候选人概览。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleGenerateHandoff()}
                  disabled={handoffGenerating}
                  className="inline-flex items-center gap-2 rounded-none border-2 border-[#111] bg-[#F4F0E6] px-3 py-2 text-sm font-medium text-[#111] shadow-[4px_4px_0px_#111] transition-colors hover:bg-[#E8E4DA] disabled:opacity-60"
                >
                  {handoffGenerating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  AI 更新摘要
                </button>
              </div>

              <textarea
                value={handoffDraft}
                onChange={(event) => setHandoffDraft(event.target.value)}
                placeholder="在这里记录给下一轮面试官的背景、风险点和建议关注项。"
                rows={10}
                className="mt-5 w-full resize-none rounded-none border-2 border-[#111] bg-[#F4F0E6] px-4 py-4 text-sm leading-7 text-[#111] placeholder:text-[#8A8578] focus:border-[#111] focus:outline-none"
              />

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-sm text-[#8A8578]">{handoffMessage || '可手动编辑，也可基于历史面试自动生成。'}</div>
                <button
                  type="button"
                  onClick={() => void handleSaveHandoff()}
                  disabled={handoffSaving}
                  className="inline-flex items-center gap-2 rounded-none border-2 border-[#111] bg-[#111] px-4 py-2.5 text-sm font-medium text-[#F4F0E6] shadow-[4px_4px_0px_#111] transition-colors hover:bg-[#333] disabled:opacity-60"
                >
                  {handoffSaving ? <Loader2 size={15} className="animate-spin" /> : null}
                  保存交接摘要
                </button>
              </div>
            </div>

            <div className="rounded-none border-2 border-[#111] bg-[#F4F0E6] p-5 shadow-[4px_4px_0px_#111]">
              <div>
                <h2 className="font-[family-name:var(--font-vt323)] text-[26px] text-[#111]">轮次时间线</h2>
                <p className="mt-1 text-sm text-[#8A8578]">按时间倒序查看这个候选人的每一轮面试和交接判断。</p>
              </div>

              <div className="mt-5 space-y-4">
                {timelineMeetings.length === 0 ? (
                  <div className="rounded-none border-2 border-dashed border-[#111] bg-[#F4F0E6] px-5 py-10 text-center">
                    <p className="text-sm font-medium text-[#111]">还没有面试轮次</p>
                    <p className="mt-2 text-sm leading-6 text-[#8A8578]">从上方发起这一轮或导入录音后，这里会自动形成时间线。</p>
                  </div>
                ) : (
                  timelineMeetings.map((meeting) => {
                    const recommendation = getRecommendationMeta(meeting.recommendation);
                    return (
                      <button
                        key={meeting.id}
                        type="button"
                        onClick={() =>
                          router.push(
                            `/meeting/${meeting.id}?returnTo=${encodeURIComponent(
                              `/workspace/${workspaceId}/collections/${collectionId}`
                            )}`
                          )
                        }
                        className="w-full rounded-none border-2 border-[#111] bg-[#F4F0E6] p-4 text-left shadow-[4px_4px_0px_#111] transition-all hover:shadow-[6px_6px_0px_#111]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-[15px] font-semibold text-[#111]">
                              {meeting.roundLabel || meeting.title || '未命名轮次'}
                            </div>
                            <div className="mt-1 text-xs text-[#8A8578]">
                              {meeting.interviewerName || '面试官待补充'} ·{' '}
                              {new Date(meeting.date).toLocaleString('zh-CN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                          <span className={`rounded-none border-2 border-[#111] px-2.5 py-1 text-xs ${recommendation.tone}`}>
                            {recommendation.label}
                          </span>
                        </div>
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#8A8578]">
                          {meeting.handoffNote ||
                            meeting.enhancedNotes ||
                            meeting.userNotes ||
                            '这轮还没有交接 note，进入会议后补充。'}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-none border-2 border-[#111] bg-[#F4F0E6] p-5 shadow-[4px_4px_0px_#111]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-[family-name:var(--font-vt323)] text-[26px] text-[#111]">
                {activeTab === 'meetings' ? (isInterviewMode ? '全部轮次' : '会议与笔记历史') : '资料库'}
              </h2>
              <p className="mt-1 text-sm text-[#8A8578]">
                {activeTab === 'meetings'
                  ? isInterviewMode
                    ? '这里保留完整的轮次列表，也可以继续把单条会议移到别的 Collection。'
                    : '当前只显示这个 Collection 下的会议。你也可以把单条会议移动到别的 Collection。'
                  : '当前资料库只显示这个 Collection 下的资料，并仅用于预览和归档。'}
              </p>
            </div>
            <div className="inline-flex rounded-none border-2 border-[#111] bg-[#F4F0E6] p-1">
              <WorkspaceTab
                active={activeTab === 'meetings'}
                icon={<Mic size={14} />}
                label={isInterviewMode ? '轮次记录' : '会议记录'}
                onClick={() => setActiveTab('meetings')}
              />
              <WorkspaceTab
                active={activeTab === 'assets'}
                icon={<FileText size={14} />}
                label="资料库"
                onClick={() => setActiveTab('assets')}
              />
            </div>
          </div>
          {activeTab === 'meetings' ? (
            <MeetingHistory
              fixedCollectionId={collectionId}
              hideCollectionFilter
              emptyTitle={isInterviewMode ? '这个候选人还没有面试记录' : '这个 Collection 里还没有会议'}
              emptyDescription={
                isInterviewMode
                  ? '可以直接在这里发起这一轮或导入录音，新的会议会先落到当前候选人下。'
                  : '可以直接在这里开始录音或导入音频，新的会议会先落到当前 Collection。'
              }
            />
          ) : (
            <AssetLibrary
              workspaceId={workspaceId}
              fixedCollectionId={collectionId}
              uploadSignal={assetUploadSignal}
              emptyTitle={isInterviewMode ? '这个候选人还没有资料' : '这个 Collection 里还没有资料'}
              emptyDescription="当前资料库仅提供预览与归档，后续接入外部识别能力后再支持内容检索。"
            />
          )}
        </section>
      </div>

      <CollectionModal
        open={showEditModal}
        mode="edit"
        workflowMode={workspace?.workflowMode || 'general'}
        collection={collection}
        onClose={() => setShowEditModal(false)}
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
      className={`inline-flex items-center gap-2 rounded-none px-4 py-2 text-sm font-medium transition-all ${
        active
          ? 'bg-[#111] text-[#F4F0E6] shadow-none'
          : 'text-[#8A8578] hover:bg-[#F4F0E6] hover:text-[#111]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
