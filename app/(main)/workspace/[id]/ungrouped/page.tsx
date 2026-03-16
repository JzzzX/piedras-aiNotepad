'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, FileAudio, FolderClosed, Mic } from 'lucide-react';
import MeetingHistory from '@/components/MeetingHistory';
import { useMeetingStore } from '@/lib/store';

export default function UngroupedMeetingPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const {
    workspaces,
    currentWorkspaceId,
    setCurrentWorkspaceId,
    loadWorkspaces,
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

  const workspace = useMemo(
    () => workspaces.find((item) => item.id === workspaceId) || null,
    [workspaceId, workspaces]
  );

  const handleNewMeeting = () => {
    const { reset, setCurrentCollectionId } = useMeetingStore.getState();
    reset();
    setCurrentCollectionId(null);
    const newId = useMeetingStore.getState().meetingId;
    router.push(
      `/meeting/${newId}?returnTo=${encodeURIComponent(`/workspace/${workspaceId}/ungrouped`)}`
    );
  };

  const handleImportAudio = () => {
    const { reset, setCurrentCollectionId } = useMeetingStore.getState();
    reset();
    setCurrentCollectionId(null);
    const newId = useMeetingStore.getState().meetingId;
    router.push(
      `/meeting/${newId}?intent=upload&returnTo=${encodeURIComponent(
        `/workspace/${workspaceId}/ungrouped`
      )}`
    );
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-6 pb-10 pt-8 sm:px-8 lg:px-10">
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
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E3D9CE] bg-white text-[#8C7A6B]">
                  <FolderClosed size={20} />
                </span>
                <span>未归类</span>
              </h1>
              <p className="mt-3 max-w-[720px] text-[15px] leading-7 text-[#7C6B5C]">
                查看 {workspace?.name || '当前工作区'} 下尚未归入任何 Collection 的会议。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
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
            </div>
          </div>
        </section>

        <section className="flex-1 rounded-[30px] border border-[#DED4C9] bg-white/90 p-5 shadow-[0_18px_48px_rgba(58,46,37,0.08)]">
          <div className="mb-4">
            <h2 className="font-song text-[26px] text-[#3A2E25]">会议与笔记历史</h2>
            <p className="mt-1 text-sm text-[#8B796A]">
              当前只显示未归类会议。整理后可以直接把它们移动到具体 Collection。
            </p>
          </div>
          <MeetingHistory
            fixedCollectionId={null}
            hideCollectionFilter
            emptyTitle="目前没有未归类会议"
            emptyDescription="新的会议默认会先落在未归类，你也可以之后再移动到具体 Collection。"
          />
        </section>
      </div>
    </div>
  );
}
