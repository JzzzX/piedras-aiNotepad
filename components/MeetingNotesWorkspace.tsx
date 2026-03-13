'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Sparkles, Wand2, X } from 'lucide-react';
import { useMeetingStore } from '@/lib/store';
import { enhanceNotes } from '@/lib/llm';
import NoteEditor from './NoteEditor';
import EnhancedNotes from './EnhancedNotes';

type NotesView = 'notes' | 'ai';

export default function MeetingNotesWorkspace() {
  const {
    meetingId,
    meetingTitle,
    status,
    segments,
    userNotes,
    enhancedNotes,
    isEnhancing,
    speakers,
    promptOptions,
    llmSettings,
    setEnhancedNotes,
    setIsEnhancing,
  } = useMeetingStore();

  const [activeView, setActiveView] = useState<NotesView>('notes');
  const [promptDismissed, setPromptDismissed] = useState(false);
  const prevStatusRef = useRef(status);
  const prevMeetingIdRef = useRef(meetingId);

  useEffect(() => {
    if (prevMeetingIdRef.current !== meetingId) {
      prevMeetingIdRef.current = meetingId;
      setActiveView('notes');
      setPromptDismissed(false);
    }
  }, [meetingId]);

  useEffect(() => {
    if (status === 'recording') {
      setActiveView('notes');
      setPromptDismissed(false);
    }

    if (prevStatusRef.current === 'recording' && status === 'ended' && !enhancedNotes.trim()) {
      setPromptDismissed(false);
    }

    prevStatusRef.current = status;
  }, [enhancedNotes, status]);

  const handleGenerate = useCallback(async () => {
    if (isEnhancing) return;

    setActiveView('ai');
    setPromptDismissed(true);
    setIsEnhancing(true);

    try {
      const result = await enhanceNotes(
        segments,
        userNotes,
        meetingTitle,
        speakers,
        undefined,
        promptOptions,
        llmSettings
      );
      setEnhancedNotes(result);
    } catch (error) {
      console.error('Enhance error:', error);
      const detail = error instanceof Error ? error.message : '未知错误';
      setEnhancedNotes(`生成失败：${detail}`);
    } finally {
      setIsEnhancing(false);
    }
  }, [
    isEnhancing,
    llmSettings,
    meetingTitle,
    promptOptions,
    segments,
    setEnhancedNotes,
    setIsEnhancing,
    speakers,
    userNotes,
  ]);

  const shouldShowEnhancePrompt =
    status === 'ended' &&
    segments.length > 0 &&
    !enhancedNotes.trim() &&
    !isEnhancing &&
    !promptDismissed;

  return (
    <section className="overflow-hidden rounded-[28px] border border-black/[0.05] bg-[#FCFAF8] shadow-sm">
      <div className="border-b border-black/[0.05] px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#A69B8F]">
              Notes Workspace
            </p>
            <h3 className="mt-1 font-song text-[18px] font-semibold text-[#3A2E25]">
              笔记工作台
            </h3>
          </div>
          <div className="inline-flex rounded-2xl border border-[#E3D9CE] bg-white p-1 shadow-sm">
            <WorkspaceTab
              active={activeView === 'notes'}
              icon={<FileText size={14} />}
              label="用户笔记"
              onClick={() => setActiveView('notes')}
            />
            <WorkspaceTab
              active={activeView === 'ai'}
              icon={<Sparkles size={14} />}
              label="AI 总结"
              onClick={() => setActiveView('ai')}
            />
          </div>
        </div>
      </div>

      <div className="relative min-h-[560px] bg-[#FCFAF8]">
        <div className={activeView === 'notes' ? 'block h-full' : 'hidden h-full'}>
          <NoteEditor embedded />
        </div>

        <div className={activeView === 'ai' ? 'block h-full' : 'hidden h-full'}>
          <EnhancedNotes embedded onGenerate={handleGenerate} />
        </div>

        {shouldShowEnhancePrompt && (
          <div className="pointer-events-none sticky bottom-0 z-20 px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="pointer-events-auto ml-auto max-w-xl rounded-[24px] border border-[#D8CEC4] bg-white/95 p-4 shadow-[0_20px_60px_rgba(62,39,26,0.12)] backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-500">
                    <Wand2 size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#3A2E25]">
                      录音已结束，生成 AI 增强笔记
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#8C7A6B]">
                      基于实时转写和你的手写笔记整理结构化总结，并自动切换到 AI
                      总结视图。
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPromptDismissed(true)}
                  className="rounded-lg p-1 text-[#A69B8F] transition-colors hover:bg-[#F7F3EE] hover:text-[#5C4D42]"
                  title="稍后处理"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPromptDismissed(true)}
                  className="rounded-xl border border-[#E3D9CE] px-3 py-2 text-xs font-medium text-[#8C7A6B] transition-colors hover:bg-[#F7F3EE]"
                >
                  稍后
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-400"
                >
                  <Sparkles size={14} />
                  AI 增强笔记
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
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
          : 'text-[#8C7A6B] hover:bg-[#F7F3EE] hover:text-[#4A3C31]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
