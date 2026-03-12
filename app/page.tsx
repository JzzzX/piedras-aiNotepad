'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  RotateCcw,
  Save,
  Check,
  History,
  X,
  PenLine,
  Blocks,
  ScrollText,
  SlidersHorizontal,
} from 'lucide-react';
import NoteEditor from '@/components/NoteEditor';
import FloatingBottomBar from '@/components/FloatingBottomBar';
import FloatingTranscript from '@/components/FloatingTranscript';
import FloatingChat from '@/components/FloatingChat';
import FloatingKnowledgeBase from '@/components/FloatingKnowledgeBase';
import EnhancedNotes from '@/components/EnhancedNotes';
import MeetingHistory from '@/components/MeetingHistory';
import McpConnectorPanel from '@/components/McpConnectorPanel';
import RecorderSettingsPanel from '@/components/RecorderSettingsPanel';
import PiedrasMark from '@/components/PiedrasMark';
import WorkspaceSwitcher from '@/components/WorkspaceSwitcher';
import { useMeetingStore } from '@/lib/store';
import { generateMeetingTitle } from '@/lib/llm';

export default function Home() {
  const {
    meetingTitle,
    setMeetingTitle,
    status,
    reset,
    segments,
    isSaving,
    saveMeeting,
    loadMeetingList,
    loadWorkspaces,
    loadFolders,
    currentWorkspaceId,
  } = useMeetingStore();

  const prevStatusRef = useRef(status);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showMcpDrawer, setShowMcpDrawer] = useState(false);
  const [mcpBaseUrl, setMcpBaseUrl] = useState('');
  
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isKBOpen, setIsKBOpen] = useState(false);
  const [showRecorderSettings, setShowRecorderSettings] = useState(false);

  // Load workspaces on mount
  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  // Reload folders and meeting list when workspace changes
  useEffect(() => {
    if (currentWorkspaceId) {
      void loadFolders();
      void loadMeetingList();
    }
  }, [currentWorkspaceId, loadFolders, loadMeetingList]);

  const maybeGenerateAutoTitle = useCallback(async () => {
    const state = useMeetingStore.getState();
    if (state.meetingTitle.trim() || state.segments.length === 0) {
      return;
    }

    try {
      const title = await generateMeetingTitle(
        state.segments,
        state.speakers,
        state.promptOptions,
        state.llmSettings
      );
      if (title.trim()) {
        state.setMeetingTitle(title.trim());
      }
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

  useEffect(() => {
    if (status === 'recording') {
      autoSaveTimerRef.current = setInterval(() => {
        saveMeeting();
      }, 30000);
    } else {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    }
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [status, saveMeeting]);

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
    await loadMeetingList();
  }, [saveMeeting, reset, loadMeetingList]);

  const hasContent = segments.length > 0;

  return (
    <div className="relative flex h-screen flex-col bg-[#F9F9F8]">
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2B2420] text-[#F5EEE6] shadow-sm">
            <PiedrasMark className="h-5 w-5" />
          </div>
          <WorkspaceSwitcher />
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
          <div className="hidden sm:flex gap-2">
            <button
              onClick={() => {
                setShowMcpDrawer(false);
                setShowHistoryDrawer(true);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-[#D8CEC4] bg-white px-3 py-1.5 text-xs font-semibold text-[#5C4D42] transition-all hover:bg-[#F7F3EE] hover:shadow-sm"
            >
              <ScrollText size={14} />
              会议记录
            </button>
            <button
              onClick={() => {
                setShowHistoryDrawer(false);
                setMcpBaseUrl(window.location.origin);
                setShowMcpDrawer(true);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-[#D8CEC4] bg-white px-3 py-1.5 text-xs font-semibold text-[#5C4D42] transition-all hover:bg-[#F7F3EE] hover:shadow-sm"
            >
              <Blocks size={14} />
              生态接入
            </button>
          </div>

          {hasContent && status !== 'recording' && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-lg border border-[#D8CEC4] bg-white px-3 py-1.5 text-xs font-medium text-[#5C4D42] transition-all hover:bg-[#F7F3EE] disabled:opacity-50"
            >
              {isSaving ? (
                <Save size={14} className="animate-pulse text-sky-500" />
              ) : (
                <Check size={14} className="text-[#6D8A67]" />
              )}
              {isSaving ? '保存中' : '已保存'}
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
          
          <button
            onClick={() => setShowRecorderSettings(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D8CEC4] bg-white text-[#5C4D42] transition-all hover:bg-[#F7F3EE] hover:shadow-sm"
            title="录音与系统设置"
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-32 custom-scrollbar">
        <div className="mx-auto flex min-h-full max-w-4xl flex-col bg-white px-6 py-8 shadow-sm ring-1 ring-gray-100 sm:my-6 sm:rounded-3xl sm:px-12 sm:py-10">
          <NoteEditor />
          
          {(status === 'ended' || segments.length > 0) && (
            <div className="mt-8 space-y-6 border-t border-gray-100 pt-8">
              <EnhancedNotes />
            </div>
          )}
        </div>
      </main>

      <RecorderSettingsPanel
        open={showRecorderSettings}
        onClose={() => setShowRecorderSettings(false)}
      />

      <div
        className={`fixed inset-0 z-40 transition-opacity ${
          showHistoryDrawer ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <button
          className="absolute inset-0 bg-[#3A2E25]/20 backdrop-blur-sm"
          onClick={() => setShowHistoryDrawer(false)}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-full max-w-[88vw] border-r border-[#D8CEC4] bg-[#F7F3EE] shadow-2xl transition-transform sm:w-80 ${
            showHistoryDrawer ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#D8CEC4]/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <History size={14} className="text-[#8C7A6B]" />
              <h3 className="font-song text-sm font-semibold text-[#5C4D42]">会议记录</h3>
            </div>
            <button
              onClick={() => setShowHistoryDrawer(false)}
              className="rounded-md p-1 text-[#8C7A6B] hover:bg-[#EFE9E2]"
            >
              <X size={14} />
            </button>
          </div>
          <div className="h-[calc(100%-49px)] overflow-y-auto p-2">
            <MeetingHistory onSelectMeeting={() => setShowHistoryDrawer(false)} />
          </div>
        </aside>
      </div>

      <McpConnectorPanel
        open={showMcpDrawer}
        baseUrl={mcpBaseUrl}
        onClose={() => setShowMcpDrawer(false)}
      />

      <FloatingTranscript 
        isOpen={isTranscriptOpen} 
        onClose={() => setIsTranscriptOpen(false)} 
      />
      
      <FloatingChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />

      <FloatingKnowledgeBase
        isOpen={isKBOpen}
        onClose={() => setIsKBOpen(false)}
      />

      <FloatingBottomBar
        onToggleTranscript={() => setIsTranscriptOpen(!isTranscriptOpen)}
        isTranscriptOpen={isTranscriptOpen}
        onToggleChat={() => {
          const next = !isChatOpen;
          setIsChatOpen(next);
          if (next) setIsKBOpen(false); // mobile mutual exclusion
        }}
        isChatOpen={isChatOpen}
        onToggleKnowledgeBase={() => {
          const next = !isKBOpen;
          setIsKBOpen(next);
          if (next) setIsChatOpen(false); // mobile mutual exclusion
        }}
        isKnowledgeBaseOpen={isKBOpen}
      />
    </div>
  );
}
