'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Loader2,
  MessageSquare,
  Mic,
  Send,
  Sparkles,
} from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useMeetingChat } from '@/hooks/useMeetingChat';
import AudioMenuPopover from '@/components/bottom-bar/AudioMenuPopover';
import BubbleChat from '@/components/bottom-bar/BubbleChat';
import RecordingControls from '@/components/bottom-bar/RecordingControls';
import WaveformIndicator from '@/components/bottom-bar/WaveformIndicator';

interface FloatingBottomBarProps {
  onToggleTranscript: () => void;
  isTranscriptOpen: boolean;
}

export default function FloatingBottomBar({
  onToggleTranscript,
  isTranscriptOpen,
}: FloatingBottomBarProps) {
  const [isAudioMenuOpen, setIsAudioMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const {
    status,
    formattedDuration,
    hasSystemAudio,
    micLevel,
    systemLevel,
    asrStatus,
    isUploadingAudio,
    uploadProgress,
    uploadFileName,
    autoStopPrompt,
    recordingOptions,
    canUploadAudio,
    audioFileInputRef,
    handleFileSelected,
    refreshAsrStatus,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    triggerUpload,
    continueRecording,
    setAutoStopEnabled,
    setAutoStopMinutes,
  } = useAudioRecorder();
  const {
    input,
    messages,
    isLoading,
    templates,
    filteredTemplates,
    selectedTemplateIndex,
    showTemplates,
    canAsk,
    inputRef,
    sendMessage,
    selectTemplate,
    handleKeyDown,
    handleInputChange,
    reloadTemplates,
  } = useMeetingChat();

  const isRecordingActive = status === 'recording' || status === 'paused';

  const handleSend = async () => {
    setIsChatOpen(true);
    await sendMessage();
  };

  return (
    <>
      <div
        className="fixed inset-x-0 z-50 flex justify-center px-2 pb-2 sm:px-4"
        style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="relative w-full max-w-[960px]">
          <BubbleChat
            open={isChatOpen}
            messages={messages}
            isLoading={isLoading}
            templates={templates}
            onReloadTemplates={reloadTemplates}
            onClose={() => setIsChatOpen(false)}
          />

          {showTemplates && filteredTemplates.length > 0 && (
            <div className="absolute bottom-[calc(100%+0.8rem)] left-[88px] right-16 z-[60] max-h-[260px] overflow-y-auto rounded-[28px] border border-[#E7DACD] bg-[#FFFDF9] p-2 shadow-[0_26px_70px_rgba(58,46,37,0.16)]">
              <div className="flex items-center gap-2 border-b border-[#F0E5DA] px-4 py-3">
                <Sparkles size={14} className="text-[#B88959]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A49486]">
                  Recipes
                </span>
              </div>
              <div className="space-y-1.5 p-2">
                {filteredTemplates.map((template, index) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => selectTemplate(template)}
                    className={`flex w-full items-start gap-3 rounded-[20px] px-4 py-3 text-left transition-colors ${
                      index === selectedTemplateIndex
                        ? 'bg-[#F7F1EA]'
                        : 'hover:bg-[#FBF6F0]'
                    }`}
                  >
                    <span className="text-lg leading-none">{template.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[#3A2E25]">
                        {template.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-[#8B796A]">
                        {template.description}
                      </span>
                    </span>
                    <code className="rounded-full bg-white px-2 py-1 text-[10px] text-[#8B796A] shadow-sm">
                      {template.command}
                    </code>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            className={`relative overflow-visible rounded-full border border-[#E9DDD2] bg-white px-2 py-2 shadow-[0_18px_48px_rgba(58,46,37,0.14)] transition-all duration-300 ${
              isRecordingActive ? 'pr-2' : 'pr-3'
            }`}
          >
            <AudioMenuPopover
              open={isAudioMenuOpen}
              status={status}
              isTranscriptOpen={isTranscriptOpen}
              hasSystemAudio={hasSystemAudio}
              canUploadAudio={canUploadAudio}
              isUploadingAudio={isUploadingAudio}
              uploadProgress={uploadProgress}
              uploadFileName={uploadFileName}
              recordingOptions={recordingOptions}
              asrStatus={asrStatus}
              onClose={() => setIsAudioMenuOpen(false)}
              onStartRecording={() => {
                void startRecording();
              }}
              onTriggerUpload={() => {
                void triggerUpload();
              }}
              onToggleTranscript={onToggleTranscript}
              onSetAutoStopEnabled={setAutoStopEnabled}
              onSetAutoStopMinutes={setAutoStopMinutes}
              onRefreshAsrStatus={() => {
                void refreshAsrStatus();
              }}
            />

            <input
              ref={audioFileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.mp4,.webm,.ogg,.flac"
              className="hidden"
              onChange={(event) => {
                void handleFileSelected(event);
              }}
            />

            {isRecordingActive ? (
              <RecordingControls
                status={status}
                durationLabel={formattedDuration}
                micLevel={micLevel}
                systemLevel={systemLevel}
                hasSystemAudio={hasSystemAudio}
                onPause={() => {
                  void pauseRecording();
                }}
                onResume={() => {
                  void resumeRecording();
                }}
                onStop={() => {
                  void stopRecording();
                }}
                onOpenMenu={() => setIsAudioMenuOpen((value) => !value)}
              />
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAudioMenuOpen((value) => !value)}
                  className="flex h-14 shrink-0 items-center gap-2 rounded-full bg-[#3A2E25] px-3 text-white transition-colors hover:bg-[#241b15]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                    <Mic size={18} />
                  </span>
                  <WaveformIndicator
                    micLevel={micLevel}
                    systemLevel={systemLevel}
                    isActive={false}
                    compact
                  />
                  <ChevronDown size={16} />
                </button>

                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-[#FAF5EF] pl-3 pr-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#8B796A]">
                    <MessageSquare size={16} />
                  </div>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onFocus={() => {
                      if (canAsk || messages.length > 0) {
                        setIsChatOpen(true);
                      }
                    }}
                    onChange={(event) => handleInputChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        setIsChatOpen(true);
                      }
                      handleKeyDown(event);
                    }}
                    rows={1}
                    disabled={!canAsk || isLoading}
                    placeholder={
                      canAsk
                        ? '输入问题，或输入 / 调用 Recipe…'
                        : '开始录音后可提问…'
                    }
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                    className="max-h-[120px] min-h-[44px] flex-1 resize-none bg-transparent py-3 text-[14px] leading-6 text-[#3A2E25] outline-none placeholder:text-[#A49486] disabled:opacity-50"
                  />

                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading || !canAsk}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
                      input.trim() && !isLoading && canAsk
                        ? 'bg-[#3A2E25] text-white hover:bg-[#241b15]'
                        : 'bg-white text-[#C6B6A8]'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <Send size={16} className="translate-x-[1px]" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {autoStopPrompt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/20 p-4">
          <div className="w-full max-w-md rounded-[30px] border border-[#E8DCCF] bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF3E3] text-[#D08727]">
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
                className="rounded-full border border-[#E5D8CB] px-4 py-2 text-sm font-medium text-[#5C4D42] transition-colors hover:bg-[#F9F2EA]"
              >
                继续录音
              </button>
              <button
                type="button"
                onClick={() => {
                  void stopRecording();
                }}
                className="rounded-full bg-[#3A2E25] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#241b15]"
              >
                停止录音
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
