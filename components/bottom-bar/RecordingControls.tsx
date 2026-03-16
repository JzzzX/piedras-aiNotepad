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
    <div className="flex w-full items-center gap-2 rounded-full border border-[#434C35] bg-[#313827] px-2 py-2 text-white shadow-[0_18px_48px_rgba(49,56,39,0.28)] transition-all">
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex items-center gap-2 rounded-full bg-white/8 px-2 py-1.5 text-white transition-colors hover:bg-white/14"
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
        className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
          isPaused
            ? 'bg-[#70804D] text-white hover:bg-[#7d8d58]'
            : 'bg-white/10 text-white hover:bg-white/16'
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
          <p className="font-mono text-[15px] font-semibold tracking-[0.08em] text-white">
            {durationLabel}
          </p>
          <p className="truncate text-[11px] text-white/68">
            {isPaused ? '已暂停' : '正在转写'} · {hasSystemAudio ? 'Mic + System' : 'Mic Only'}
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/78">
          {hasSystemAudio ? '双通道' : '单通道'}
        </span>
      </div>
    </div>
  );
}
