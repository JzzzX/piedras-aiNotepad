'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Mic, RotateCcw, Save, Check, History, X } from 'lucide-react';
import AudioRecorder from '@/components/AudioRecorder';
import TranscriptPanel from '@/components/TranscriptPanel';
import NoteEditor from '@/components/NoteEditor';
import ChatPanel from '@/components/ChatPanel';
import EnhancedNotes from '@/components/EnhancedNotes';
import SpeakerManager from '@/components/SpeakerManager';
import MeetingHistory from '@/components/MeetingHistory';
import PromptSettings from '@/components/PromptSettings';
import { useMeetingStore } from '@/lib/store';

const PANEL_MIN_WIDTH = {
  transcript: 280,
  notes: 320,
  chat: 320,
};

const DIVIDER_COUNT = 2;
const DIVIDER_WIDTH = 8;
const WIDTH_STORAGE_KEY = 'ai-notepad-panel-widths-v1';

type ResizablePanel = 'transcript' | 'notes';

interface PanelWidths {
  transcript: number;
  notes: number;
}

const DEFAULT_PANEL_WIDTHS: PanelWidths = {
  transcript: 420,
  notes: 420,
};

function normalizePanelWidths(widths: PanelWidths, mainWidth: number): PanelWidths {
  if (mainWidth <= 0) return widths;

  const panelAreaWidth = mainWidth - DIVIDER_COUNT * DIVIDER_WIDTH;
  let transcript = Math.max(widths.transcript, PANEL_MIN_WIDTH.transcript);
  let notes = Math.max(widths.notes, PANEL_MIN_WIDTH.notes);

  const maxFixed = panelAreaWidth - PANEL_MIN_WIDTH.chat;
  if (maxFixed <= 0) {
    return {
      transcript: PANEL_MIN_WIDTH.transcript,
      notes: PANEL_MIN_WIDTH.notes,
    };
  }

  let fixedTotal = transcript + notes;
  if (fixedTotal <= maxFixed) {
    return { transcript, notes };
  }

  let excess = fixedTotal - maxFixed;

  const reduce = (value: number, min: number) => {
    const canReduce = Math.max(value - min, 0);
    const amount = Math.min(canReduce, excess);
    excess -= amount;
    return value - amount;
  };

  notes = reduce(notes, PANEL_MIN_WIDTH.notes);
  transcript = reduce(transcript, PANEL_MIN_WIDTH.transcript);
  fixedTotal = transcript + notes;
  if (fixedTotal > maxFixed) {
    // 极端窄屏下，至少保证不会出现负宽度
    const fallback = Math.max(maxFixed / 2, 120);
    return {
      transcript: Math.max(Math.floor(fallback), 120),
      notes: Math.max(Math.floor(fallback), 120),
    };
  }

  return { transcript, notes };
}

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
  } = useMeetingStore();

  const prevStatusRef = useRef(status);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const [mainWidth, setMainWidth] = useState(0);
  const [panelWidths, setPanelWidths] = useState<PanelWidths>(DEFAULT_PANEL_WIDTHS);
  const [widthsHydrated, setWidthsHydrated] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // 首次挂载后再读取 localStorage，避免 SSR 与客户端首帧不一致导致 hydration 警告
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WIDTH_STORAGE_KEY);
      if (!raw) {
        setWidthsHydrated(true);
        return;
      }
      const parsed = JSON.parse(raw) as Partial<PanelWidths>;
      if (
        typeof parsed.transcript === 'number' &&
        typeof parsed.notes === 'number'
      ) {
        setPanelWidths({
          transcript: parsed.transcript,
          notes: parsed.notes,
        });
      }
    } catch {
      // 忽略损坏的 localStorage 数据
    } finally {
      setWidthsHydrated(true);
    }
  }, []);

  // 录音结束时自动保存
  useEffect(() => {
    if (prevStatusRef.current === 'recording' && status === 'ended') {
      saveMeeting().then(() => loadMeetingList());
    }
    prevStatusRef.current = status;
  }, [status, saveMeeting, loadMeetingList]);

  // 录音中每 30 秒自动保存
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

  // 手动保存
  const handleSave = useCallback(async () => {
    await saveMeeting();
    await loadMeetingList();
  }, [saveMeeting, loadMeetingList]);

  // 新会议
  const handleNewMeeting = useCallback(async () => {
    // 先保存当前会议（如果有内容）
    const state = useMeetingStore.getState();
    if (state.segments.length > 0 || state.userNotes || state.enhancedNotes) {
      await saveMeeting();
    }
    reset();
    await loadMeetingList();
  }, [saveMeeting, reset, loadMeetingList]);

  const hasContent = segments.length > 0;

  // 保存面板宽度
  useEffect(() => {
    if (!widthsHydrated) return;
    window.localStorage.setItem(WIDTH_STORAGE_KEY, JSON.stringify(panelWidths));
  }, [panelWidths, widthsHydrated]);

  // 监听主区域宽度变化
  useEffect(() => {
    if (!mainRef.current) return;
    const element = mainRef.current;
    const observer = new ResizeObserver(([entry]) => {
      setMainWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const effectivePanelWidths = useMemo(
    () => normalizePanelWidths(panelWidths, mainWidth),
    [panelWidths, mainWidth]
  );

  const startResize = useCallback(
    (panel: ResizablePanel, startX: number, startWidth: number) => {
      const onMouseMove = (event: MouseEvent) => {
        const delta = event.clientX - startX;

        setPanelWidths((prev) => {
          const panelAreaWidth = mainWidth - DIVIDER_COUNT * DIVIDER_WIDTH;
          const transcript = prev.transcript;
          const notes = prev.notes;

          if (panelAreaWidth <= 0) return prev;

          if (panel === 'transcript') {
            const max =
              panelAreaWidth -
              notes -
              PANEL_MIN_WIDTH.chat;
            const nextTranscript = Math.min(
              Math.max(startWidth + delta, PANEL_MIN_WIDTH.transcript),
              Math.max(max, PANEL_MIN_WIDTH.transcript)
            );
            return normalizePanelWidths(
              { ...prev, transcript: nextTranscript },
              mainWidth
            );
          }

          const max =
            panelAreaWidth -
            transcript -
            PANEL_MIN_WIDTH.chat;
          const nextNotes = Math.min(
            Math.max(startWidth + delta, PANEL_MIN_WIDTH.notes),
            Math.max(max, PANEL_MIN_WIDTH.notes)
          );
          return normalizePanelWidths({ ...prev, notes: nextNotes }, mainWidth);
        });
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [mainWidth]
  );

  const handleDividerMouseDown = (
    panel: ResizablePanel,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    const startWidth = effectivePanelWidths[panel];
    startResize(panel, event.clientX, startWidth);
  };

  return (
    <div className="flex h-screen flex-col bg-[#EFE9E2]">
      {/* 顶栏 */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-[#EFE9E2]/80 backdrop-blur-md px-4 py-5 md:px-8 border-b border-[#D8CEC4]/50">
        <div className="flex items-center gap-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-500/20">
            <Mic size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-serif font-bold text-[#4A3C31] tracking-tight">AI Notepad</h1>
            <p className="text-[11px] text-[#8C7A6B] font-bold uppercase tracking-widest">Intelligent Assistant</p>
          </div>
          <button
            onClick={() => setShowHistoryDrawer(true)}
            className="ml-4 flex items-center gap-1.5 rounded-xl border border-[#D8CEC4] bg-[#F7F3EE] px-3.5 py-1.5 text-[13px] font-medium text-[#5C4D42] transition-all hover:bg-[#EFE9E2] hover:border-[#C4B6A9] hover:shadow-sm"
            title="打开会议记录"
          >
            <History size={14} />
            会议记录
          </button>
        </div>

        <div className="flex min-w-0 items-center gap-4">
          <input
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            placeholder="无标题文档"
            className="w-36 rounded-xl border-transparent bg-transparent px-3 py-1.5 text-lg font-serif font-semibold text-[#3A2E25] placeholder:text-[#A69B8F] transition-all hover:bg-[#F7F3EE] focus:bg-[#F7F3EE] focus:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D8CEC4] sm:w-52 md:w-64 text-center"
          />

          <AudioRecorder />

          {/* 保存按钮 */}
          {hasContent && status !== 'recording' && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl border border-[#D8CEC4] bg-[#F7F3EE] px-4 py-2 text-[13px] font-medium text-[#5C4D42] transition-all hover:bg-[#EFE9E2] hover:border-[#C4B6A9] hover:shadow-sm disabled:opacity-50"
            >
              {isSaving ? (
                <Save size={14} className="animate-pulse text-sky-500" />
              ) : (
                <Check size={14} className="text-[#6D8A67]" />
              )}
              {isSaving ? '保存中' : '保存'}
            </button>
          )}

          {status === 'ended' && (
            <button
              onClick={handleNewMeeting}
              className="flex items-center gap-2 rounded-xl bg-[#4A3C31] px-4 py-2 text-[13px] font-semibold text-[#F7F3EE] transition-all hover:bg-[#3A2E25] hover:shadow-lg hover:shadow-[#4A3C31]/20"
            >
              <RotateCcw size={14} />
              新会议
            </button>
          )}
        </div>
      </header>

      {/* 会议记录抽屉 */}
      <div
        className={`fixed inset-0 z-40 transition-opacity ${
          showHistoryDrawer ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <button
          className="absolute inset-0 bg-[#3A2E25]/20 backdrop-blur-sm"
          onClick={() => setShowHistoryDrawer(false)}
          aria-label="关闭会议记录抽屉"
        />
        <aside
          className={`absolute left-0 top-0 h-full w-80 border-r border-[#D8CEC4] bg-[#F7F3EE] shadow-2xl transition-transform ${
            showHistoryDrawer ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#D8CEC4]/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <History size={14} className="text-[#8C7A6B]" />
              <h3 className="text-sm font-serif font-semibold text-[#5C4D42]">会议记录</h3>
            </div>
            <button
              onClick={() => setShowHistoryDrawer(false)}
              className="rounded-md p-1 text-[#8C7A6B] transition-colors hover:bg-[#EFE9E2] hover:text-[#4A3C31]"
              title="关闭"
            >
              <X size={14} />
            </button>
          </div>
          <div className="h-[calc(100%-49px)] overflow-y-auto p-2">
            <MeetingHistory onSelectMeeting={() => setShowHistoryDrawer(false)} />
          </div>
        </aside>
      </div>

      {/* 主体 */}
      <main
        ref={mainRef}
        className="flex flex-1 gap-6 overflow-hidden bg-transparent px-8 pb-8 pt-6"
      >
        {/* 左栏 - 实时转写 */}
        <div
          style={{ width: effectivePanelWidths.transcript }}
          className="flex shrink-0 flex-col bg-[#FCFAF8] rounded-3xl border border-[#E3D9CE] shadow-[0_8px_24px_-12px_rgba(74,60,49,0.08)] transition-shadow duration-500 hover:shadow-[0_12px_32px_-12px_rgba(74,60,49,0.12)]"
        >
          <TranscriptPanel />
        </div>

        <div
          onMouseDown={(e) => handleDividerMouseDown('transcript', e)}
          className="group relative w-1 shrink-0 cursor-col-resize bg-transparent"
          title="拖动调整实时转写宽度"
        >
          <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-[#D8CEC4] opacity-0 transition-opacity group-hover:opacity-100" />
        </div>

        {/* 中栏 - 笔记编辑器 + AI 笔记 */}
        <div
          style={{ width: effectivePanelWidths.notes }}
          className="flex shrink-0 flex-col bg-[#FCFAF8] rounded-3xl border border-[#E3D9CE] shadow-[0_8px_24px_-12px_rgba(74,60,49,0.08)] transition-shadow duration-500 hover:shadow-[0_12px_32px_-12px_rgba(74,60,49,0.12)] overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto">
            <NoteEditor />
          </div>

          {(status === 'ended' || segments.length > 0) && (
            <div className="border-t border-[#E3D9CE] bg-[#F7F3EE]/50 p-6 space-y-4 max-h-[50%] overflow-y-auto">
              <PromptSettings />
              <SpeakerManager />
              <EnhancedNotes />
            </div>
          )}
        </div>

        <div
          onMouseDown={(e) => handleDividerMouseDown('notes', e)}
          className="group relative w-1 shrink-0 cursor-col-resize bg-transparent"
          title="拖动调整笔记区宽度"
        >
          <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-[#D8CEC4] opacity-0 transition-opacity group-hover:opacity-100" />
        </div>

        {/* 右栏 - Chat */}
        <div className="flex min-w-0 flex-1 flex-col bg-[#FCFAF8] rounded-3xl border border-[#E3D9CE] shadow-[0_8px_24px_-12px_rgba(74,60,49,0.08)] transition-shadow duration-500 hover:shadow-[0_12px_32px_-12px_rgba(74,60,49,0.12)] relative overflow-hidden">
          <ChatPanel />
        </div>
      </main>

      {/* 底栏状态 */}
      <footer className="flex items-center justify-between bg-transparent px-8 py-4">
        <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-widest text-[#A69B8F]">
          <span className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${status === 'recording' ? 'bg-sky-500 animate-pulse' : 'bg-[#C4B6A9]'}`} />
            {status === 'idle' && 'READY — BOTLESS DUAL CHANNEL'}
            {status === 'recording' && 'RECORDING — AUTO SAVING EVERY 30S'}
            {status === 'ended' && 'SESSION ENDED — AUTO SAVED'}
          </span>
          {segments.length > 0 && (
            <span className="flex items-center gap-1.5 before:block before:w-1 before:h-1 before:rounded-full before:bg-[#C4B6A9]">{segments.length} TRANSCRIPTS</span>
          )}
          {isSaving && (
            <span className="flex items-center gap-1.5 text-sky-500">
              <Save size={12} className="animate-pulse" />
              SAVING...
            </span>
          )}
        </div>
        <div className="text-[10px] font-bold text-[#C4B6A9] tracking-[0.2em] uppercase">
          Botless · SQLite
        </div>
      </footer>
    </div>
  );
}
