'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Check,
  PenLine,
  RotateCcw,
  CircleDot,
} from 'lucide-react';
import FloatingBottomBar from '@/components/FloatingBottomBar';
import FloatingTranscript from '@/components/FloatingTranscript';
import MeetingNotesWorkspace from '@/components/MeetingNotesWorkspace';
import { INTERVIEW_RECOMMENDATION_OPTIONS } from '@/lib/interview';
import { useMeetingStore } from '@/lib/store';
import { generateMeetingTitle } from '@/lib/llm';

export default function MeetingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const {
    meetingTitle,
    setMeetingTitle,
    status,
    reset,
    segments,
    isSaving,
    meetingDirty,
    lastSavedAt,
    saveMeeting,
    loadMeeting,
    loadMeetingList,
    meetingId,
    workspaces,
    loadWorkspaces,
    currentWorkspaceId,
    currentCollectionId,
    userNotes,
    enhancedNotes,
    chatMessages,
    roundLabel,
    interviewerName,
    recommendation,
    handoffNote,
    setInterviewMeta,
  } = useMeetingStore();

  const prevStatusRef = useRef(status);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasLoadedRef = useRef(false);
  const uploadIntentHandledRef = useRef(false);
  const noteAutoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const isRecordingActive = status === 'recording' || status === 'paused';

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  const returnTo = searchParams.get('returnTo');
  const resolvedReturnTo =
    returnTo && returnTo.startsWith('/')
      ? returnTo
      : currentCollectionId && currentWorkspaceId
        ? `/workspace/${currentWorkspaceId}/collections/${currentCollectionId}`
        : currentWorkspaceId
          ? `/workspace/${currentWorkspaceId}`
          : '/workspace';

  // Load meeting from URL param
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    if (id === 'new') {
      // New meeting — just reset
      reset();
    } else if (id !== meetingId) {
      void loadMeeting(id);
    }
  }, [id, meetingId, loadMeeting, reset]);

  useEffect(() => {
    if (uploadIntentHandledRef.current) return;
    if (searchParams.get('intent') !== 'upload') return;

    uploadIntentHandledRef.current = true;
    const timer = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('piedras:triggerUploadAudio'));
      router.replace(
        `/meeting/${id}?returnTo=${encodeURIComponent(resolvedReturnTo)}`
      );
    }, 240);

    return () => window.clearTimeout(timer);
  }, [id, resolvedReturnTo, router, searchParams]);

  // Auto-generate title when recording ends
  const maybeGenerateAutoTitle = useCallback(async () => {
    const state = useMeetingStore.getState();
    if (state.meetingTitle.trim() || state.segments.length === 0) return;

    try {
      const title = await generateMeetingTitle(
        state.segments,
        state.speakers,
        state.promptOptions,
        state.llmSettings
      );
      if (title.trim()) state.setMeetingTitle(title.trim());
    } catch (error) {
      console.error('自动标题生成失败:', error);
    }
  }, []);

  useEffect(() => {
    if (
      (prevStatusRef.current === 'recording' || prevStatusRef.current === 'paused') &&
      status === 'ended'
    ) {
      void (async () => {
        await maybeGenerateAutoTitle();
        await saveMeeting();
        await loadMeetingList();
      })();
    }
    prevStatusRef.current = status;
  }, [status, saveMeeting, loadMeetingList, maybeGenerateAutoTitle]);

  // Auto-save every 30s during recording
  useEffect(() => {
    if (isRecordingActive) {
      autoSaveTimerRef.current = setInterval(() => { saveMeeting(); }, 30000);
    } else {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    }
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [isRecordingActive, saveMeeting]);

  useEffect(() => {
    if (!meetingDirty) {
      if (noteAutoSaveTimerRef.current) {
        clearTimeout(noteAutoSaveTimerRef.current);
        noteAutoSaveTimerRef.current = null;
      }
      return;
    }

    noteAutoSaveTimerRef.current = setTimeout(() => {
      void saveMeeting({ includeAudio: false });
    }, 1400);

    return () => {
      if (noteAutoSaveTimerRef.current) {
        clearTimeout(noteAutoSaveTimerRef.current);
        noteAutoSaveTimerRef.current = null;
      }
    };
  }, [
    chatMessages.length,
    currentCollectionId,
    enhancedNotes,
    meetingDirty,
    meetingTitle,
    saveMeeting,
    segments.length,
    status,
    userNotes,
  ]);

  useEffect(() => {
    const persistOnLeave = () => {
      if (!useMeetingStore.getState().meetingDirty) return;
      void useMeetingStore.getState().saveMeeting({ includeAudio: false });
    };

    window.addEventListener('pagehide', persistOnLeave);
    window.addEventListener('beforeunload', persistOnLeave);
    return () => {
      window.removeEventListener('pagehide', persistOnLeave);
      window.removeEventListener('beforeunload', persistOnLeave);
      persistOnLeave();
    };
  }, []);

  const handleSave = useCallback(async () => {
    await saveMeeting();
    await loadMeetingList();
  }, [saveMeeting, loadMeetingList]);

  const handleNewMeeting = useCallback(async () => {
    const state = useMeetingStore.getState();
    if (state.segments.length > 0 || state.userNotes || state.enhancedNotes) {
      await saveMeeting();
    }
    reset();
    const newId = useMeetingStore.getState().meetingId;
    await loadMeetingList();
    router.push(`/meeting/${newId}?returnTo=${encodeURIComponent(resolvedReturnTo)}`);
  }, [loadMeetingList, reset, resolvedReturnTo, router, saveMeeting]);

  const hasContent = segments.length > 0;
  const currentWorkspace =
    workspaces.find((workspace) => workspace.id === currentWorkspaceId) || null;
  const isInterviewMode = currentWorkspace?.workflowMode === 'interview';
  const saveLabel = isSaving
    ? '保存中'
    : meetingDirty
      ? '未保存'
      : lastSavedAt
        ? '已保存'
        : '待保存';

  return (
    <div className="relative flex h-full flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-[#F9F9F8]/80 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(resolvedReturnTo)}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#8C7A6B] transition-colors hover:bg-[#F0EBE6] md:flex"
            title="返回上一级"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="group relative flex min-w-0 items-center rounded-xl transition-all hover:bg-[#F0EBE6] hover:ring-1 hover:ring-[#D8CEC4] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#D8CEC4] focus-within:shadow-sm">
            <span className="pl-3 text-[#A69B8F] transition-colors group-focus-within:text-[#8C7A6B]">
              <PenLine size={14} />
            </span>
            <input
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              placeholder="无标题文档"
              className="font-song w-48 bg-transparent py-1.5 pl-2 pr-3 text-base font-semibold text-[#3A2E25] placeholder:text-[#A69B8F] focus:outline-none sm:w-64"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasContent && !isRecordingActive && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-lg border border-[#D8CEC4] bg-white px-3 py-1.5 text-xs font-medium text-[#5C4D42] transition-all hover:bg-[#F7F3EE] disabled:opacity-50"
            >
              {isSaving ? (
                <Save size={14} className="animate-pulse text-sky-500" />
              ) : meetingDirty ? (
                <CircleDot size={14} className="text-amber-500" />
              ) : (
                <Check size={14} className="text-[#6D8A67]" />
              )}
              {saveLabel}
            </button>
          )}

          {status === 'ended' && (
            <button
              onClick={handleNewMeeting}
              className="flex items-center gap-1.5 rounded-lg bg-[#4A3C31] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[#3A2E25]"
            >
              <RotateCcw size={14} />
              新会议
            </button>
          )}
        </div>
      </header>

      {/* Editor */}
      <main className="flex-1 overflow-y-auto pb-44 custom-scrollbar sm:pb-48">
        <div className="mx-auto flex flex-1 max-w-4xl flex-col px-2 py-6 sm:my-6 sm:px-0 sm:py-2">
          {isInterviewMode ? (
            <section className="mb-5 rounded-[28px] border border-[#E3D9CE] bg-white/88 p-5 shadow-[0_16px_36px_rgba(58,46,37,0.06)]">
              <div className="mb-4">
                <h2 className="font-song text-[24px] text-[#3A2E25]">本轮面试信息</h2>
                <p className="mt-1 text-sm text-[#8B796A]">
                  这些字段会进入候选人时间线和交接摘要，建议在每轮结束后补齐。
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#5C4D42]">轮次</span>
                  <input
                    value={roundLabel}
                    onChange={(event) => setInterviewMeta({ roundLabel: event.target.value })}
                    placeholder="例如：一面 / 技术面 / HR 面"
                    className="w-full rounded-2xl border border-[#D8CEC4] bg-white px-4 py-3 text-sm text-[#3A2E25] placeholder:text-[#AE9D8E] focus:border-[#C2B3A4] focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#5C4D42]">面试官</span>
                  <input
                    value={interviewerName}
                    onChange={(event) =>
                      setInterviewMeta({ interviewerName: event.target.value })
                    }
                    placeholder="例如：技术负责人 / 招聘经理"
                    className="w-full rounded-2xl border border-[#D8CEC4] bg-white px-4 py-3 text-sm text-[#3A2E25] placeholder:text-[#AE9D8E] focus:border-[#C2B3A4] focus:outline-none"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-[#5C4D42]">推荐结论</span>
                  <select
                    value={recommendation}
                    onChange={(event) =>
                      setInterviewMeta({
                        recommendation: event.target.value as typeof recommendation,
                      })
                    }
                    className="w-full rounded-2xl border border-[#D8CEC4] bg-white px-4 py-3 text-sm text-[#3A2E25] focus:border-[#C2B3A4] focus:outline-none"
                  >
                    {INTERVIEW_RECOMMENDATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-[#5C4D42]">交接备注</span>
                  <textarea
                    value={handoffNote}
                    onChange={(event) => setInterviewMeta({ handoffNote: event.target.value })}
                    rows={4}
                    placeholder="告诉下一位面试官：重点追问什么、风险点在哪里、需要继续验证哪些信息。"
                    className="w-full resize-none rounded-2xl border border-[#D8CEC4] bg-white px-4 py-3 text-sm leading-6 text-[#3A2E25] placeholder:text-[#AE9D8E] focus:border-[#C2B3A4] focus:outline-none"
                  />
                </label>
              </div>
            </section>
          ) : null}
          <MeetingNotesWorkspace />
        </div>
      </main>

      {/* Floating panels */}
      <FloatingTranscript
        isOpen={isTranscriptOpen}
        onClose={() => setIsTranscriptOpen(false)}
      />

      <FloatingBottomBar
        onToggleTranscript={() => setIsTranscriptOpen(!isTranscriptOpen)}
        isTranscriptOpen={isTranscriptOpen}
      />
    </div>
  );
}
