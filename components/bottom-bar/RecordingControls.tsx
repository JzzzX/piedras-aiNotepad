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
    <div className="flex w-full items-center gap-2 rounded-full bg-white px-2 py-2 shadow-[0_18px_48px_rgba(58,46,37,0.14)] ring-1 ring-[#E9DDD2] transition-all">
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex items-center gap-2 rounded-full bg-[#F7F1EA] px-2 py-1.5 text-[#5C4D42] transition-colors hover:bg-[#F0E5DA]"
      >
        <WaveformIndicator
          micLevel={micLevel}
          systemLevel={systemLevel}
          isActive={!isPaused}
          compact
        />
      </button>

      <button
        type="button"
        onClick={isPaused ? onResume : onPause}
        className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
          isPaused
            ? 'bg-[#3A2E25] text-white hover:bg-[#241b15]'
            : 'bg-[#F7F1EA] text-[#5C4D42] hover:bg-[#EFE3D6]'
        }`}
      >
        {isPaused ? <Play size={18} className="translate-x-[1px]" /> : <Pause size={18} />}
      </button>

      <button
        type="button"
        onClick={onStop}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[#D35D47] text-white transition-colors hover:bg-[#bf4b36]"
      >
        <Square size={16} fill="currentColor" />
      </button>

      <div className="ml-1 flex min-w-0 flex-1 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[15px] font-semibold tracking-[0.08em] text-[#3A2E25]">
            {durationLabel}
          </p>
          <p className="truncate text-[11px] text-[#8B796A]">
            {isPaused ? '已暂停' : '正在转写'} · {hasSystemAudio ? 'Mic + System' : 'Mic Only'}
          </p>
        </div>
        <span className="rounded-full bg-[#F7F1EA] px-2.5 py-1 text-[11px] font-medium text-[#6C5C50]">
          {hasSystemAudio ? '双通道' : '单通道'}
        </span>
      </div>
    </div>
  );
}
