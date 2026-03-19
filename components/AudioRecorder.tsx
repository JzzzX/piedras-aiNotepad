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
            className="flex h-10 w-10 items-center justify-center rounded-none border-2 border-[#111] bg-[#111] text-white shadow-[4px_4px_0px_#111] transition-colors hover:bg-black"
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
            className="flex h-10 w-10 items-center justify-center rounded-none border-2 border-[#111] text-[#111] transition-colors hover:bg-[#F4F0E6] disabled:opacity-50"
            title="导入音频"
          >
            {isUploadingAudio ? (
              <Loader2 size={18} className="animate-spin text-[#D9423E]" />
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
            className="flex h-10 w-10 items-center justify-center rounded-none border-2 border-[#111] bg-[#D9423E] text-white shadow-[4px_4px_0px_#111] transition-colors hover:bg-[#bf3632]"
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
            className="flex h-10 w-10 items-center justify-center rounded-none border-2 border-[#111] bg-[#F4F0E6] text-[#111] transition-colors hover:bg-[#e8e4da]"
            title={status === 'paused' ? '恢复录音' : '暂停录音'}
          >
            {status === 'paused' ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <span className="font-mono text-sm font-semibold tracking-[0.08em] text-[#111]">
            {formattedDuration}
          </span>
        </>
      )}

      {autoStopPrompt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/20 p-4">
          <div className="w-full max-w-md rounded-none border-2 border-[#111] bg-white p-6 shadow-[4px_4px_0px_#111]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-none border-2 border-[#111] bg-[#F4F0E6] text-[#D9423E]">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h4 className="text-base font-semibold text-[#111]">
                  {autoStopPrompt.title}
                </h4>
                <p className="mt-2 text-sm leading-6 text-[#8A8578]">
                  {autoStopPrompt.description}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={continueRecording}
                className="rounded-none border-2 border-[#111] px-4 py-2 text-sm font-medium text-[#111]"
              >
                继续录音
              </button>
              <button
                type="button"
                onClick={() => {
                  void stopRecording();
                }}
                className="rounded-none border-2 border-[#111] bg-[#111] px-4 py-2 text-sm font-semibold text-white shadow-[4px_4px_0px_#111]"
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
