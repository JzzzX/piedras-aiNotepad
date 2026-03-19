'use client';

import { Pause, Play, Square } from 'lucide-react';
import WaveformIndicator from './WaveformIndicator';

interface RecordingControlsProps {
  status: 'recording' | 'paused';
  durationLabel: string;
  micLevel: number;
  systemLevel: number;
  hasSystemAudio: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onOpenMenu: () => void;
}

export default function RecordingControls({
  status,
  durationLabel,
  micLevel,
  systemLevel,
  hasSystemAudio,
  onPause,
  onResume,
  onStop,
  onOpenMenu,
}: RecordingControlsProps) {
  const isPaused = status === 'paused';

  return (
    <div className="flex w-full items-center gap-2 rounded-none border-2 border-[#111] bg-[#111] px-2 py-2 text-[#F4F0E6] shadow-[4px_4px_0px_#111] transition-all">
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex items-center gap-2 rounded-none border-2 border-[#F4F0E6]/20 bg-[#F4F0E6]/8 px-2 py-1.5 text-[#F4F0E6] transition-colors hover:bg-[#F4F0E6]/14"
      >
        <WaveformIndicator
          micLevel={micLevel}
          systemLevel={systemLevel}
          isActive={!isPaused}
          compact
          tone="dark"
        />
      </button>

      <button
        type="button"
        onClick={isPaused ? onResume : onPause}
        className={`flex h-11 w-11 items-center justify-center rounded-none border-2 border-[#F4F0E6]/30 transition-colors active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
          isPaused
            ? 'bg-[#F4F0E6] text-[#111] shadow-[2px_2px_0px_#F4F0E6] hover:bg-[#e8e4da]'
            : 'bg-[#F4F0E6]/10 text-[#F4F0E6] shadow-[2px_2px_0px_rgba(244,240,230,0.3)] hover:bg-[#F4F0E6]/16'
        }`}
      >
        {isPaused ? <Play size={18} className="translate-x-[1px]" /> : <Pause size={18} />}
      </button>

      <button
        type="button"
        onClick={onStop}
        className="flex h-11 w-11 items-center justify-center rounded-none border-2 border-[#111] bg-[#D9423E] text-[#F4F0E6] shadow-[2px_2px_0px_#111] transition-colors hover:bg-[#c13b37] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        <Square size={16} fill="currentColor" />
      </button>

      <div className="ml-1 flex min-w-0 flex-1 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[15px] font-semibold tracking-[0.08em] text-[#F4F0E6]">
            {durationLabel}
          </p>
          <p className="truncate text-[11px] text-[#F4F0E6]/68">
            {isPaused ? '已暂停' : '正在转写'} · {hasSystemAudio ? 'Mic + System' : 'Mic Only'}
          </p>
        </div>
        <span className="rounded-none border-2 border-[#F4F0E6]/20 bg-[#F4F0E6]/10 px-2.5 py-1 text-[11px] font-medium text-[#F4F0E6]/78">
          {hasSystemAudio ? '双通道' : '单通道'}
        </span>
      </div>
    </div>
  );
}
