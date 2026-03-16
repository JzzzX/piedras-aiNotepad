'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Loader2,
  MessageSquare,
  Mic,
  Send,
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
    templatesLoading,
    templatesError,
    assistantView,
    recipeQuery,
    selectedTemplateIndex,
    canAsk,
    inputRef,
    sendMessage,
    selectTemplate,
    handleKeyDown,
    handleInputChange,
    showMessages,
    reloadTemplates,
  } = useMeetingChat();

  const isRecordingActive = status === 'recording' || status === 'paused';
  const chatPanelOpen = isChatOpen || assistantView === 'recipes';
  const hasOverlay = isAudioMenuOpen || chatPanelOpen;

  const handlePrimaryAction = async () => {
    setIsAudioMenuOpen(false);
    setIsChatOpen(true);
    if (assistantView === 'recipes') {
      const selectedTemplate = filteredTemplates[selectedTemplateIndex];
      if (selectedTemplate) {
        selectTemplate(selectedTemplate);
      }
      return;
    }

    await sendMessage();
  };

  const handleChatActivate = () => {
    if (!canAsk) return;
    setIsAudioMenuOpen(false);
    setIsChatOpen(true);
    inputRef.current?.focus();
  };

  const handleToggleAudioMenu = () => {
    if (assistantView === 'recipes') {
      showMessages();
    }
    setIsChatOpen(false);
    setIsAudioMenuOpen((value) => !value);
  };

  const closeChat = () => {
    if (assistantView === 'recipes') {
      showMessages();
    }
    setIsChatOpen(false);
  };

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-50">
        {hasOverlay && (
          <button
            type="button"
            aria-label="关闭底部浮层"
            onClick={() => {
              setIsAudioMenuOpen(false);
              closeChat();
            }}
            className="pointer-events-auto absolute inset-0 bg-transparent"
          />
        )}

        <div
          className="absolute inset-x-0 bottom-0 flex justify-center px-3 pb-3 sm:px-5 sm:pb-5"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="pointer-events-auto relative w-full max-w-[980px]">
            <BubbleChat
              key={chatPanelOpen ? 'assistant-open' : 'assistant-closed'}
              open={chatPanelOpen}
              view={assistantView}
              recipeQuery={recipeQuery}
              messages={messages}
              isLoading={isLoading}
              templates={templates}
              filteredTemplates={filteredTemplates}
              templatesLoading={templatesLoading}
              templatesError={templatesError}
              selectedTemplateIndex={selectedTemplateIndex}
              onSelectTemplate={selectTemplate}
              onShowMessages={showMessages}
              onReloadTemplates={reloadTemplates}
              onClose={closeChat}
            />

            <div className="flex items-end gap-3 md:gap-4">
              <div className={`relative shrink-0 ${isRecordingActive ? 'w-full max-w-[330px] sm:w-[330px]' : ''}`}>
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
                    onOpenMenu={handleToggleAudioMenu}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={handleToggleAudioMenu}
                    className="flex h-16 items-center gap-3 rounded-full border border-[#434C35] bg-[#313827] px-3 pr-4 text-white shadow-[0_18px_48px_rgba(49,56,39,0.28)] transition-colors hover:bg-[#28301f]"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10">
                      <Mic size={18} />
                    </span>
                    <WaveformIndicator
                      micLevel={micLevel}
                      systemLevel={systemLevel}
                      isActive={false}
                      compact
                      tone="dark"
                    />
                    <ChevronDown size={16} className="text-white/70" />
                  </button>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div
                  onClick={handleChatActivate}
                  className="flex min-h-[74px] items-end gap-3 rounded-[38px] border border-[#D8DEC8] bg-[#FFFDF9] p-3 shadow-[0_18px_48px_rgba(59,64,46,0.12)] transition-shadow hover:shadow-[0_22px_56px_rgba(59,64,46,0.14)]"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F4F7EC] text-[#647344]">
                    <MessageSquare size={18} />
                  </span>

                  <textarea
                    ref={inputRef}
                    value={input}
                    onFocus={() => {
                      setIsAudioMenuOpen(false);
                      setIsChatOpen(true);
                    }}
                    onChange={(event) => {
                      handleInputChange(event.target.value);
                      if (event.target.value.startsWith('/')) {
                        setIsAudioMenuOpen(false);
                      }
                      setIsChatOpen(true);
                    }}
                    onKeyDown={(event) => {
                      handleKeyDown(event);
                      if (event.key === 'Enter' && !event.shiftKey) {
                        setIsChatOpen(true);
                      }
                    }}
                    rows={1}
                    disabled={!canAsk || isLoading}
                    placeholder={
                      canAsk
                        ? '输入问题，或输入 / 调用 Recipe…'
                        : '开始录音后可提问…'
                    }
                    style={{ minHeight: '44px', maxHeight: '136px' }}
                    className="max-h-[136px] min-h-[44px] flex-1 resize-none self-center bg-transparent py-2 text-[15px] leading-7 text-[#2F3526] outline-none placeholder:text-[#A0A68F] disabled:cursor-not-allowed disabled:opacity-55"
                  />

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handlePrimaryAction();
                    }}
                    disabled={
                      assistantView === 'recipes'
                        ? filteredTemplates.length === 0 || isLoading || !canAsk
                        : !input.trim() || isLoading || !canAsk
                    }
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors ${
                      (assistantView === 'recipes'
                        ? filteredTemplates.length > 0
                        : input.trim()) &&
                      !isLoading &&
                      canAsk
                        ? 'bg-[#5B6B3B] text-white hover:bg-[#4d5a33]'
                        : 'bg-[#EEF2E3] text-[#AAB39A]'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={17} className="translate-x-[1px]" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {autoStopPrompt && (
          <div className="pointer-events-auto absolute inset-0 z-[70] flex items-center justify-center bg-[rgba(47,53,38,0.14)] p-4">
            <div className="w-full max-w-md rounded-[30px] border border-[#DCE3CE] bg-white p-6 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF4E8] text-[#D08727]">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-[#2F3526]">
                    {autoStopPrompt.title}
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-[#72785F]">
                    {autoStopPrompt.description}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={continueRecording}
                  className="rounded-full border border-[#DCE3CE] px-4 py-2 text-sm font-medium text-[#526038] transition-colors hover:bg-[#F5F7EE]"
                >
                  继续录音
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void stopRecording();
                  }}
                  className="rounded-full bg-[#4E5E34] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#44512d]"
                >
                  停止录音
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
