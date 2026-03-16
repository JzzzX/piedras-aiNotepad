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
import FloatingChat from '@/components/FloatingChat';
import FloatingKnowledgeBase from '@/components/FloatingKnowledgeBase';
import MeetingNotesWorkspace from '@/components/MeetingNotesWorkspace';
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
    currentWorkspaceId,
    currentCollectionId,
    userNotes,
    enhancedNotes,
    chatMessages,
  } = useMeetingStore();

  const prevStatusRef = useRef(status);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasLoadedRef = useRef(false);
  const uploadIntentHandledRef = useRef(false);
  const noteAutoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(false);

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
    if (prevStatusRef.current === 'recording' && status === 'ended') {
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
    if (status === 'recording') {
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
  }, [status, saveMeeting]);

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
          {hasContent && status !== 'recording' && (
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
      <main className="flex-1 overflow-y-auto pb-32 custom-scrollbar">
        <div className="mx-auto flex min-h-full max-w-4xl flex-col px-2 py-6 sm:my-6 sm:px-0 sm:py-2">
          <MeetingNotesWorkspace />
        </div>
      </main>

      {/* Floating panels */}
      <FloatingTranscript
        isOpen={isTranscriptOpen}
        onClose={() => setIsTranscriptOpen(false)}
      />

      <FloatingChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      <FloatingKnowledgeBase
        isOpen={isKnowledgeBaseOpen}
        onClose={() => setIsKnowledgeBaseOpen(false)}
      />

      <FloatingBottomBar
        onToggleTranscript={() => setIsTranscriptOpen(!isTranscriptOpen)}
        isTranscriptOpen={isTranscriptOpen}
        onToggleChat={() => {
          const next = !isChatOpen;
          setIsChatOpen(next);
          if (next) {
            setIsKnowledgeBaseOpen(false);
          }
        }}
        isChatOpen={isChatOpen}
        onToggleKnowledgeBase={() => {
          const next = !isKnowledgeBaseOpen;
          setIsKnowledgeBaseOpen(next);
          if (next) {
            setIsChatOpen(false);
          }
        }}
        isKnowledgeBaseOpen={isKnowledgeBaseOpen}
      />
    </div>
  );
}
