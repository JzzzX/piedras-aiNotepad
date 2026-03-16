'use client';

import { AlertTriangle, FileAudio, Loader2, Mic, Pause, Play, Square } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

export default function AudioRecorder() {
  const {
    status,
    canUploadAudio,
    isUploadingAudio,
    formattedDuration,
    autoStopPrompt,
    audioFileInputRef,
    handleFileSelected,
    triggerUpload,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    continueRecording,
  } = useAudioRecorder();
  const isActive = status === 'recording' || status === 'paused';

  return (
    <div className="relative flex items-center gap-2">
      <input
        ref={audioFileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.aac,.mp4,.webm,.ogg,.flac"
        className="hidden"
        onChange={(event) => {
          void handleFileSelected(event);
        }}
      />

      {!isActive ? (
        <>
          <button
            type="button"
            onClick={() => {
              void startRecording();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2B2420] text-white shadow-md transition-colors hover:bg-black"
            title="开始录音"
          >
            <Mic size={18} />
          </button>
          <button
            type="button"
            onClick={() => {
              void triggerUpload();
            }}
            disabled={!canUploadAudio}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#6B5C51] transition-colors hover:bg-[#F4EEE8] disabled:opacity-50"
            title="导入音频"
          >
            {isUploadingAudio ? (
              <Loader2 size={18} className="animate-spin text-sky-500" />
            ) : (
              <FileAudio size={18} />
            )}
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              void stopRecording();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D35D47] text-white shadow-md transition-colors hover:bg-[#bf4b36]"
            title="停止录音"
          >
            <Square size={14} fill="currentColor" />
          </button>
          <button
            type="button"
            onClick={() => {
              void (
                status === 'paused' ? resumeRecording() : pauseRecording()
              );
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F1EA] text-[#5C4D42] transition-colors hover:bg-[#EEE3D6]"
            title={status === 'paused' ? '恢复录音' : '暂停录音'}
          >
            {status === 'paused' ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <span className="font-mono text-sm font-semibold tracking-[0.08em] text-[#3A2E25]">
            {formattedDuration}
          </span>
        </>
      )}

      {autoStopPrompt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/20 p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFF3E3] text-[#D08727]">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#3A2E25]">
                  {autoStopPrompt.title}
                </h4>
                <p className="mt-2 text-sm leading-6 text-[#7D6D60]">
                  {autoStopPrompt.description}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={continueRecording}
                className="rounded-full border border-[#E5D8CB] px-4 py-2 text-sm font-medium text-[#5C4D42]"
              >
                继续录音
              </button>
              <button
                type="button"
                onClick={() => {
                  void stopRecording();
                }}
                className="rounded-full bg-[#3A2E25] px-4 py-2 text-sm font-semibold text-white"
              >
                停止录音
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
