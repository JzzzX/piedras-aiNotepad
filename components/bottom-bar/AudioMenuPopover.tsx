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
  onClose: () => void;
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
  onClose,
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
    <>
      <button
        type="button"
        aria-label="关闭音频菜单"
        className="fixed inset-0 z-40 bg-transparent"
        onClick={onClose}
      />
      <div className="absolute bottom-[calc(100%+0.75rem)] left-0 z-50 w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[28px] border border-[#E9DDD2] bg-[#FFFDF9] p-3 shadow-[0_28px_70px_rgba(58,46,37,0.16)]">
        <div className="space-y-2 rounded-[22px] bg-[#F9F4EE] p-2">
          {!isActive && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartRecording();
              }}
              className="flex w-full items-center gap-3 rounded-[18px] bg-white px-4 py-3 text-left text-[#3A2E25] shadow-sm transition-colors hover:bg-[#FFF8F1]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3A2E25] text-white">
                <Mic size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">开始录音</span>
                <span className="block text-xs text-[#8B796A]">默认尝试采集麦克风与系统音频</span>
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onClose();
              onTriggerUpload();
            }}
            disabled={!canUploadAudio}
            className="flex w-full items-center gap-3 rounded-[18px] bg-white px-4 py-3 text-left text-[#3A2E25] shadow-sm transition-colors hover:bg-[#FFF8F1] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0E5DA] text-[#5C4D42]">
              <FileAudio size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {isUploadingAudio ? '上传转写中…' : '导入音频'}
              </span>
              <span className="block truncate text-xs text-[#8B796A]">
                {isUploadingAudio && uploadFileName
                  ? `${uploadFileName} · ${Math.round(uploadProgress * 100)}%`
                  : '仅已配置好的阿里云 ASR 支持导入转写'}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onToggleTranscript();
            }}
            className="flex w-full items-center gap-3 rounded-[18px] bg-white px-4 py-3 text-left text-[#3A2E25] shadow-sm transition-colors hover:bg-[#FFF8F1]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0E5DA] text-[#5C4D42]">
              <FileText size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {isTranscriptOpen ? '收起转写面板' : '打开转写面板'}
              </span>
              <span className="block text-xs text-[#8B796A]">
                {hasSystemAudio ? '当前为双通道转写视图' : '当前为麦克风单通道转写视图'}
              </span>
            </span>
          </button>
        </div>

        <div className="mt-3 rounded-[22px] border border-[#EFE5DA] bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A08F80]">
                Auto Stop
              </p>
              <p className="mt-1 text-sm text-[#5C4D42]">
                {recordingOptions.autoStopEnabled
                  ? `${recordingOptions.autoStopMinutes} 分钟无新转写后提醒`
                  : '已关闭自动停止提醒'}
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[#6B5A4D]">
              <input
                type="checkbox"
                checked={recordingOptions.autoStopEnabled}
                onChange={(event) => onSetAutoStopEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-[#CDBEAF]"
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
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  recordingOptions.autoStopMinutes === minute
                    ? 'bg-[#3A2E25] text-white'
                    : 'bg-[#F6EFE7] text-[#6F5F53] hover:bg-[#EDE2D7]'
                }`}
              >
                {minute} min
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-[22px] border border-[#EFE5DA] bg-white px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A08F80]">
              ASR
            </p>
            <p className="mt-1 text-sm text-[#5C4D42]">{asrLabel}</p>
            {asrStatus?.message ? (
              <p className="mt-1 text-xs text-[#8B796A]">{asrStatus.message}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onRefreshAsrStatus}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F6EFE7] text-[#5C4D42] transition-colors hover:bg-[#EDE2D7]"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
