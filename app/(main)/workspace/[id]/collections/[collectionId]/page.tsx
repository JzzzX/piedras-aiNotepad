'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, FileAudio, FileText, Mic } from 'lucide-react';
import AssetLibrary from '@/components/AssetLibrary';
import MeetingHistory from '@/components/MeetingHistory';
import WorkspaceIconBadge from '@/components/WorkspaceIconBadge';
import { useMeetingStore } from '@/lib/store';

export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const collectionId = params.collectionId as string;
  const [activeTab, setActiveTab] = useState<'meetings' | 'assets'>('meetings');
  const [assetUploadSignal, setAssetUploadSignal] = useState(0);
  const {
    workspaces,
    collections,
    currentWorkspaceId,
    setCurrentWorkspaceId,
    loadWorkspaces,
    loadCollections,
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
    void loadCollections();
  }, [currentWorkspaceId, loadCollections, workspaceId]);

  const workspace = useMemo(
    () => workspaces.find((item) => item.id === workspaceId) || null,
    [workspaceId, workspaces]
  );
  const collection = useMemo(
    () => collections.find((item) => item.id === collectionId) || null,
    [collectionId, collections]
  );

  useEffect(() => {
    if (collections.length > 0 && !collection) {
      router.replace(`/workspace/${workspaceId}`);
    }
  }, [collection, collections.length, router, workspaceId]);

  const handleNewMeeting = () => {
    const { reset, setCurrentCollectionId } = useMeetingStore.getState();
    reset();
    setCurrentCollectionId(collectionId);
    const newId = useMeetingStore.getState().meetingId;
    router.push(
      `/meeting/${newId}?returnTo=${encodeURIComponent(
        `/workspace/${workspaceId}/collections/${collectionId}`
      )}`
    );
  };

  const handleImportAudio = () => {
    const { reset, setCurrentCollectionId } = useMeetingStore.getState();
    reset();
    setCurrentCollectionId(collectionId);
    const newId = useMeetingStore.getState().meetingId;
    router.push(
      `/meeting/${newId}?intent=upload&returnTo=${encodeURIComponent(
        `/workspace/${workspaceId}/collections/${collectionId}`
      )}`
    );
  };

  return (
    <div className="min-h-full bg-[#F6F2EB]">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-6 pb-10 pt-8 sm:px-8 lg:px-10">
        <section className="rounded-[30px] border border-[#DED4C9] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.94),_rgba(249,244,237,0.98)_58%,_rgba(239,231,221,1))] px-6 py-7 shadow-[0_24px_72px_rgba(58,46,37,0.08)] sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <Link
                href={`/workspace/${workspaceId}`}
                className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm text-[#6C5D50] transition-colors hover:bg-white"
              >
                <ChevronLeft size={14} />
                返回工作区
              </Link>
              <h1 className="mt-4 flex items-center gap-3 font-song text-[34px] leading-tight text-[#3A2E25] sm:text-[42px]">
                {collection ? (
                  <WorkspaceIconBadge icon={collection.icon} color={collection.color} size="lg" />
                ) : null}
                <span>{collection?.name || 'Collection'}</span>
              </h1>
              <p className="mt-3 max-w-[720px] text-[15px] leading-7 text-[#7C6B5C]">
                {collection?.description || `查看 ${workspace?.name || '当前工作区'} 下这组会议与笔记历史。`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleNewMeeting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#3A2E25] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2B2420]"
              >
                <Mic size={16} />
                在此录音
              </button>
              <button
                type="button"
                onClick={handleImportAudio}
                className="inline-flex items-center gap-2 rounded-xl border border-[#D8CEC4] bg-white px-4 py-2.5 text-sm font-medium text-[#5C4D42] transition-colors hover:bg-[#FBF8F4]"
              >
                <FileAudio size={16} />
                导入音频
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-song text-[26px] text-[#3A2E25]">
                {activeTab === 'meetings' ? '会议与笔记历史' : '资料库'}
              </h2>
              <p className="mt-1 text-sm text-[#8B796A]">
                {activeTab === 'meetings'
                  ? '当前只显示这个 Collection 下的会议。你也可以把单条会议移动到别的 Collection。'
                  : '当前只显示这个 Collection 下的资料，它们会参与后续检索。'}
              </p>
            </div>
            <div className="inline-flex rounded-2xl border border-[#E3D9CE] bg-[#F8F4EF] p-1">
              <WorkspaceTab
                active={activeTab === 'meetings'}
                icon={<Mic size={14} />}
                label="会议记录"
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
              emptyTitle="这个 Collection 里还没有会议"
              emptyDescription="可以直接在这里开始录音或导入音频，新的会议会先落到当前 Collection。"
            />
          ) : (
            <AssetLibrary
              workspaceId={workspaceId}
              fixedCollectionId={collectionId}
              uploadSignal={assetUploadSignal}
              emptyTitle="这个 Collection 里还没有资料"
              emptyDescription="导入 PDF 或图片后，它们会沉淀成这个 Collection 的知识资产。"
            />
          )}
        </section>
      </div>
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
