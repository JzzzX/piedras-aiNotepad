'use client';

import { useState, useEffect } from 'react';
import { SlidersHorizontal, Sparkles, Mic, Monitor, FileAudio, X } from 'lucide-react';
import { useMeetingStore } from '@/lib/store';
import type { AsrStatus } from '@/lib/asr';

const AUTO_STOP_MINUTE_OPTIONS = [5, 10, 15, 30];

interface RecorderSettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function RecorderSettingsPanel({ open, onClose }: RecorderSettingsPanelProps) {
  const { recordingOptions, setRecordingOptions } = useMeetingStore();
  const [asrStatus, setAsrStatus] = useState<AsrStatus | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch('/api/asr/status')
      .then((res) => res.json())
      .then((data) => setAsrStatus(data))
      .catch(() => {
        setAsrStatus({
          mode: 'browser',
          provider: 'web-speech',
          configured: false,
          reachable: false,
          ready: false,
          missing: [],
          message: 'ASR 状态获取失败，默认使用浏览器转写',
          checkedAt: null,
          lastError: 'ASR 状态获取失败',
        });
      });
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />
      <div className="absolute right-4 top-16 z-[70] w-full max-w-[380px] rounded-none bg-[#F4F0E6] shadow-[4px_4px_0px_#111] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-4 duration-200 border-2 border-[#111] sm:right-6 sm:top-20">
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-[#111]">
          <h3 className="font-semibold text-[15px] text-[#111] flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-[#8A8578]" />
            录音设置
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-none hover:bg-[#EAE3D2] text-[#8A8578] transition-colors border-2 border-[#111]">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[70vh] space-y-6 custom-scrollbar">
          {/* 录音说明 */}
          <div>
            <h4 className="font-[family-name:var(--font-vt323)] mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-[#111]">
              <Sparkles size={14} className="text-[#D9423E]" />
              隐私录制说明
            </h4>
            {asrStatus && (
              <p className="mb-3 rounded-none bg-[#D9423E]/10 px-3 py-2 text-[11px] text-[#D9423E] leading-normal border-2 border-[#111]">
                {asrStatus.message}
              </p>
            )}
            <div className="space-y-2 text-[13px] text-[#8A8578] leading-relaxed">
              <div className="rounded-none bg-[#EAE3D2] p-3 border-2 border-[#111]">
                <div className="mb-1 flex items-center gap-2 font-semibold text-[#111] text-xs">
                  <Mic size={14} className="text-[#D9423E]" />
                  1. 采集你的声音
                </div>
                <p className="pl-5 text-[11px] text-[#8A8578]">点击允许麦克风权限</p>
              </div>
              <div className="rounded-none bg-[#EAE3D2] p-3 border-2 border-[#111]">
                <div className="mb-1 flex items-center gap-2 font-semibold text-[#111] text-xs">
                  <Monitor size={14} className="text-teal-500" />
                  2. 采集对方的声音
                </div>
                <p className="pl-5 text-[11px] text-[#8A8578]">选择会议标签页并勾选「共享音频」</p>
              </div>
              <div className="rounded-none bg-[#EAE3D2] p-3 border-2 border-[#111]">
                <div className="mb-1 flex items-center gap-2 font-semibold text-[#111] text-xs">
                  <FileAudio size={14} className="text-[#D9423E]" />
                  3. 导入已有录音
                </div>
                <p className="pl-5 text-[11px] text-[#8A8578]">支持上传音频文件并直接转写</p>
              </div>
            </div>
          </div>

          <div className="h-px bg-[#111]" />

          {/* 自动结束设置 */}
          <div>
            <h4 className="font-[family-name:var(--font-vt323)] mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-[#111]">
              <SlidersHorizontal size={14} className="text-[#8A8578]" />
              自动结束录音
            </h4>
            <div className="space-y-3">
              <label className="flex items-start gap-3 rounded-none border-2 border-[#111] bg-[#EAE3D2] p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recordingOptions.autoStopEnabled}
                  onChange={(event) =>
                    setRecordingOptions({ autoStopEnabled: event.target.checked })
                  }
                  className="mt-0.5 h-3.5 w-3.5 rounded-none border-2 border-[#111]"
                />
                <div>
                  <p className="text-[13px] font-medium text-[#111]">启用自动结束检测</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#8A8578]">
                    连续一段时间无新转写时提示。
                  </p>
                </div>
              </label>

              <label className="block space-y-1.5">
                <span className="text-[12px] text-[#111] font-medium">静默超时时长</span>
                <select
                  value={recordingOptions.autoStopMinutes}
                  disabled={!recordingOptions.autoStopEnabled}
                  onChange={(event) =>
                    setRecordingOptions({
                      autoStopMinutes: Number(event.target.value),
                    })
                  }
                  className="w-full rounded-none border-2 border-[#111] bg-[#F4F0E6] px-3 py-2 text-[13px] text-[#111] focus:outline-none disabled:cursor-not-allowed disabled:bg-[#EAE3D2] disabled:text-[#8A8578]"
                >
                  {AUTO_STOP_MINUTE_OPTIONS.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} 分钟
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
