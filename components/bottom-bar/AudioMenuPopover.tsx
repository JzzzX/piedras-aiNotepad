'use client';

import { FileAudio, FileText, Mic, RefreshCw } from 'lucide-react';
import type { AsrStatus } from '@/lib/asr';
import { AUTO_STOP_MINUTE_OPTIONS } from '@/hooks/useAudioRecorder';

interface AudioMenuPopoverProps {
  open: boolean;
  status: 'idle' | 'ended' | 'recording' | 'paused';
  isTranscriptOpen: boolean;
  hasSystemAudio: boolean;
  canUploadAudio: boolean;
  isUploadingAudio: boolean;
  uploadProgress: number;
  uploadFileName: string;
  recordingOptions: {
    autoStopEnabled: boolean;
    autoStopMinutes: number;
  };
  asrStatus: AsrStatus | null;
  onStartRecording: () => void;
  onTriggerUpload: () => void;
  onToggleTranscript: () => void;
  onSetAutoStopEnabled: (enabled: boolean) => void;
  onSetAutoStopMinutes: (minutes: number) => void;
  onRefreshAsrStatus: () => void;
}

export default function AudioMenuPopover({
  open,
  status,
  isTranscriptOpen,
  hasSystemAudio,
  canUploadAudio,
  isUploadingAudio,
  uploadProgress,
  uploadFileName,
  recordingOptions,
  asrStatus,
  onStartRecording,
  onTriggerUpload,
  onToggleTranscript,
  onSetAutoStopEnabled,
  onSetAutoStopMinutes,
  onRefreshAsrStatus,
}: AudioMenuPopoverProps) {
  if (!open) return null;

  const isActive = status === 'recording' || status === 'paused';
  const asrLabel =
    asrStatus?.mode === 'aliyun'
      ? asrStatus.ready
        ? 'Aliyun ASR 已就绪'
        : 'Aliyun ASR 未就绪'
      : 'Browser ASR';

  return (
    <div className="retro-window absolute bottom-[calc(100%+0.9rem)] left-0 z-50 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-none border-2 border-[#111] bg-[#F4F0E6] p-3 shadow-[4px_4px_0px_#111]">
      <div className="space-y-2 rounded-none bg-[#F4F0E6] p-2">
          {!isActive && (
            <button
              type="button"
              onClick={() => {
                onStartRecording();
              }}
              className="retro-invert-hover flex w-full items-center gap-3 rounded-none border-2 border-[#111] bg-[#F4F0E6] px-4 py-3 text-left text-[#111] transition-colors"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-none border-2 border-[#111] bg-[#111] text-[#F4F0E6]">
                <Mic size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">开始录音</span>
                <span className="block text-xs text-[#8A8578]">默认尝试采集麦克风与系统音频</span>
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onTriggerUpload();
            }}
            disabled={!canUploadAudio}
            className="retro-invert-hover flex w-full items-center gap-3 rounded-none border-2 border-[#111] bg-[#F4F0E6] px-4 py-3 text-left text-[#111] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-none border-2 border-[#111] bg-[#F4F0E6] text-[#111]">
              <FileAudio size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {isUploadingAudio ? '上传转写中…' : '导入音频'}
              </span>
              <span className="block truncate text-xs text-[#8A8578]">
                {isUploadingAudio && uploadFileName
                  ? `${uploadFileName} · ${Math.round(uploadProgress * 100)}%`
                  : '仅已配置好的阿里云 ASR 支持导入转写'}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onToggleTranscript();
            }}
            className="retro-invert-hover flex w-full items-center gap-3 rounded-none border-2 border-[#111] bg-[#F4F0E6] px-4 py-3 text-left text-[#111] transition-colors"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-none border-2 border-[#111] bg-[#F4F0E6] text-[#111]">
              <FileText size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {isTranscriptOpen ? '收起转写面板' : '打开转写面板'}
              </span>
              <span className="block text-xs text-[#8A8578]">
                {hasSystemAudio ? '当前为双通道转写视图' : '当前为麦克风单通道转写视图'}
              </span>
            </span>
          </button>
        </div>

        <div className="mt-3 rounded-none border-2 border-[#111] bg-[#F4F0E6] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8A8578]">
                Auto Stop
              </p>
              <p className="mt-1 text-sm text-[#111]">
                {recordingOptions.autoStopEnabled
                  ? `${recordingOptions.autoStopMinutes} 分钟无新转写后提醒`
                  : '已关闭自动停止提醒'}
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[#111]">
              <input
                type="checkbox"
                checked={recordingOptions.autoStopEnabled}
                onChange={(event) => onSetAutoStopEnabled(event.target.checked)}
                className="h-4 w-4 rounded-none border-2 border-[#111]"
              />
              开启
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {AUTO_STOP_MINUTE_OPTIONS.map((minute) => (
              <button
                key={minute}
                type="button"
                onClick={() => onSetAutoStopMinutes(minute)}
                className={`rounded-none border-2 border-[#111] px-3 py-1.5 text-xs font-medium transition-colors ${
                  recordingOptions.autoStopMinutes === minute
                    ? 'bg-[#111] text-[#F4F0E6]'
                    : 'bg-[#F4F0E6] text-[#111] hover:bg-[#111] hover:text-[#F4F0E6]'
                }`}
              >
                {minute} min
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-none border-2 border-[#111] bg-[#F4F0E6] px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8A8578]">
              ASR
            </p>
            <p className="mt-1 text-sm text-[#111]">{asrLabel}</p>
            {asrStatus?.message ? (
              <p className="mt-1 text-xs text-[#8A8578]">{asrStatus.message}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onRefreshAsrStatus}
            className="flex h-10 w-10 items-center justify-center rounded-none border-2 border-[#111] bg-[#F4F0E6] text-[#111] transition-colors hover:bg-[#111] hover:text-[#F4F0E6]"
          >
            <RefreshCw size={16} />
          </button>
        </div>
    </div>
  );
}
