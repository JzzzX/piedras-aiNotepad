'use client';

import { useState, useEffect } from 'react';
import { BookOpenText, Sparkles, Mic, Monitor, FileAudio, SlidersHorizontal } from 'lucide-react';
import { useMeetingStore } from '@/lib/store';
import type { AsrStatus } from '@/lib/asr';
import AsrVocabularySettings from '@/components/settings/AsrVocabularySettings';

const AUTO_STOP_MINUTE_OPTIONS = [5, 10, 15, 30];
type RecorderSubTab = 'base' | 'vocabulary';

export default function RecorderSettingsInline() {
  const { recordingOptions, setRecordingOptions } = useMeetingStore();
  const [asrStatus, setAsrStatus] = useState<AsrStatus | null>(null);
  const [activeTab, setActiveTab] = useState<RecorderSubTab>('base');

  useEffect(() => {
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
  }, []);

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-none border-2 border-[#111] bg-[#F4F0E6] p-1 shadow-[2px_2px_0px_#111]">
        <button
          onClick={() => setActiveTab('base')}
          className={`rounded-none px-4 py-2 text-sm font-medium transition-all ${
            activeTab === 'base'
              ? 'bg-[#111] text-[#F4F0E6] shadow-none'
              : 'text-[#8A8578] hover:bg-[#EAE3D2] hover:text-[#111]'
          }`}
        >
          基础设置
        </button>
        <button
          onClick={() => setActiveTab('vocabulary')}
          className={`inline-flex items-center gap-1.5 rounded-none px-4 py-2 text-sm font-medium transition-all ${
            activeTab === 'vocabulary'
              ? 'bg-[#111] text-[#F4F0E6] shadow-none'
              : 'text-[#8A8578] hover:bg-[#EAE3D2] hover:text-[#111]'
          }`}
        >
          <BookOpenText size={14} />
          自定义词汇
        </button>
      </div>

      {activeTab === 'base' && (
        <>
          <div className="space-y-4 rounded-none border-2 border-[#111] bg-[#F4F0E6] p-5 shadow-[4px_4px_0px_#111]">
            <h4 className="flex items-center gap-2 text-[14px] font-semibold text-[#111]">
              <Sparkles size={16} className="text-[#D9423E]" />
              隐私录制说明
            </h4>
            {asrStatus && (
              <div className="rounded-none bg-[#EAE3D2] px-4 py-3 text-[12px] leading-relaxed text-[#8A8578] border-2 border-[#111]">
                {asrStatus.message}
              </div>
            )}
            <div className="space-y-3">
              <div className="rounded-none border-2 border-[#111] bg-[#F4F0E6] p-4 shadow-[2px_2px_0px_#111] transition-all hover:bg-[#EAE3D2]">
                <div className="flex items-center gap-2.5 font-medium text-[#111] text-[13px]">
                  <div className="flex h-6 w-6 items-center justify-center rounded-none bg-[#D9423E]/10 text-[#D9423E] border border-[#111]">
                    <Mic size={14} />
                  </div>
                  1. 采集你的声音
                </div>
                <p className="mt-1.5 pl-[34px] text-[11px] text-[#8A8578]">点击允许麦克风权限</p>
              </div>
              <div className="rounded-none border-2 border-[#111] bg-[#F4F0E6] p-4 shadow-[2px_2px_0px_#111] transition-all hover:bg-[#EAE3D2]">
                <div className="flex items-center gap-2.5 font-medium text-[#111] text-[13px]">
                  <div className="flex h-6 w-6 items-center justify-center rounded-none bg-teal-50 text-teal-500 border border-[#111]">
                    <Monitor size={14} />
                  </div>
                  2. 采集对方的声音
                </div>
                <p className="mt-1.5 pl-[34px] text-[11px] text-[#8A8578]">选择会议标签页并勾选「共享音频」</p>
              </div>
              <div className="rounded-none border-2 border-[#111] bg-[#F4F0E6] p-4 shadow-[2px_2px_0px_#111] transition-all hover:bg-[#EAE3D2]">
                <div className="flex items-center gap-2.5 font-medium text-[#111] text-[13px]">
                  <div className="flex h-6 w-6 items-center justify-center rounded-none bg-[#D9423E]/10 text-[#D9423E] border border-[#111]">
                    <FileAudio size={14} />
                  </div>
                  3. 导入已有录音
                </div>
                <p className="mt-1.5 pl-[34px] text-[11px] text-[#8A8578]">支持上传音频文件并直接转写</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-none border-2 border-[#111] bg-[#F4F0E6] p-5 shadow-[4px_4px_0px_#111]">
            <h4 className="flex items-center gap-2 text-[14px] font-semibold text-[#111]">
              <SlidersHorizontal size={16} className="text-[#8A8578]" />
              自动结束录音
            </h4>
            <div className="space-y-4">
              <label className="flex cursor-pointer items-start gap-3 rounded-none border-2 border-[#111] bg-[#F4F0E6] p-4 shadow-[2px_2px_0px_#111] transition-colors hover:bg-[#EAE3D2]">
                <input
                  type="checkbox"
                  checked={recordingOptions.autoStopEnabled}
                  onChange={(e) => setRecordingOptions({ autoStopEnabled: e.target.checked })}
                  className="mt-0.5 h-4 w-4 cursor-pointer rounded-none border-2 border-[#111] accent-[#111]"
                />
                <div>
                  <p className="text-[13px] font-medium text-[#111]">启用自动结束检测</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#8A8578]">
                    连续一段时间无新转写时提示。
                  </p>
                </div>
              </label>

              <label className="block space-y-1.5">
                <span className="text-[12px] font-medium text-[#8A8578]">静默超时时长</span>
                <select
                  value={recordingOptions.autoStopMinutes}
                  disabled={!recordingOptions.autoStopEnabled}
                  onChange={(e) => setRecordingOptions({ autoStopMinutes: Number(e.target.value) })}
                  className="w-full rounded-none border-2 border-[#111] bg-[#F4F0E6] px-3 py-2 text-[13px] text-[#111] focus:outline-none disabled:cursor-not-allowed disabled:bg-[#EAE3D2] disabled:text-[#8A8578]"
                >
                  {AUTO_STOP_MINUTE_OPTIONS.map((minutes) => (
                    <option key={minutes} value={minutes}>{minutes} 分钟</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </>
      )}

      {activeTab === 'vocabulary' && <AsrVocabularySettings />}
    </div>
  );
}
