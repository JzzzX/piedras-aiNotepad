'use client';

import { Mic, RotateCcw } from 'lucide-react';
import AudioRecorder from '@/components/AudioRecorder';
import TranscriptPanel from '@/components/TranscriptPanel';
import NoteEditor from '@/components/NoteEditor';
import ChatPanel from '@/components/ChatPanel';
import EnhancedNotes from '@/components/EnhancedNotes';
import SpeakerManager from '@/components/SpeakerManager';
import { useMeetingStore } from '@/lib/store';

export default function Home() {
  const { meetingTitle, setMeetingTitle, status, reset, segments } =
    useMeetingStore();

  return (
    <div className="flex h-screen flex-col bg-zinc-50">
      {/* 顶栏 */}
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
            <Mic size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-zinc-800">AI Notepad</h1>
            <p className="text-xs text-zinc-400">智能会议笔记助手</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* 会议标题 */}
          <input
            value={meetingTitle}
            onChange={(e) => setMeetingTitle(e.target.value)}
            placeholder="输入会议标题..."
            className="w-64 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-700 placeholder:text-zinc-300 focus:border-zinc-400 focus:outline-none transition-colors"
          />

          <AudioRecorder />

          {status === 'ended' && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700"
            >
              <RotateCcw size={12} />
              新会议
            </button>
          )}
        </div>
      </header>

      {/* 主体三栏 */}
      <main className="flex flex-1 overflow-hidden">
        {/* 左栏 - 实时转写 */}
        <div className="flex w-1/3 flex-col border-r border-zinc-200 bg-white">
          <TranscriptPanel />
        </div>

        {/* 中栏 - 笔记编辑器 + AI 笔记 */}
        <div className="flex w-1/3 flex-col border-r border-zinc-200 bg-white">
          <div className="flex-1 overflow-y-auto">
            <NoteEditor />
          </div>

          {/* 说话人管理 + AI 融合笔记 区域 */}
          {(status === 'ended' || segments.length > 0) && (
            <div className="border-t border-zinc-200 bg-zinc-50 p-4 space-y-4 max-h-[50%] overflow-y-auto">
              <SpeakerManager />
              <EnhancedNotes />
            </div>
          )}
        </div>

        {/* 右栏 - Chat */}
        <div className="flex w-1/3 flex-col bg-white">
          <ChatPanel />
        </div>
      </main>

      {/* 底栏状态 */}
      <footer className="flex items-center justify-between border-t border-zinc-200 bg-white px-5 py-2">
        <div className="flex items-center gap-4 text-xs text-zinc-400">
          <span>
            {status === 'idle' && '准备就绪 — Botless 双通道采集'}
            {status === 'recording' && '正在录音 — 无 Bot 进入会议'}
            {status === 'ended' && '录音已结束'}
          </span>
          {segments.length > 0 && (
            <span>{segments.length} 条转写</span>
          )}
        </div>
        <div className="text-xs text-zinc-300">
          Botless 模式 · 麦克风 + 系统音频 · 阿里云 ASR + MiniMax
        </div>
      </footer>
    </div>
  );
}
