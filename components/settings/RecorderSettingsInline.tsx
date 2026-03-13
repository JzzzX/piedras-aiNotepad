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
          ready: false,
          missing: [],
          message: 'ASR 状态获取失败，默认使用浏览器转写',
        });
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-2xl border border-[#E3D9CE] bg-white p-1 shadow-sm">
        <button
          onClick={() => setActiveTab('base')}
          className={`rounded-[14px] px-4 py-2 text-sm font-medium transition-all ${
            activeTab === 'base'
              ? 'bg-[#4A3C31] text-white shadow-sm'
              : 'text-[#8C7A6B] hover:bg-[#F7F3EE] hover:text-[#4A3C31]'
          }`}
        >
          基础设置
        </button>
        <button
          onClick={() => setActiveTab('vocabulary')}
          className={`inline-flex items-center gap-1.5 rounded-[14px] px-4 py-2 text-sm font-medium transition-all ${
            activeTab === 'vocabulary'
              ? 'bg-[#4A3C31] text-white shadow-sm'
              : 'text-[#8C7A6B] hover:bg-[#F7F3EE] hover:text-[#4A3C31]'
          }`}
        >
          <BookOpenText size={14} />
          自定义词汇
        </button>
      </div>

      {activeTab === 'base' && (
        <>
          <div className="space-y-4 rounded-2xl border border-[#E3D9CE] bg-[#FCFAF8] p-5">
            <h4 className="flex items-center gap-2 text-[14px] font-semibold text-[#5C4D42]">
              <Sparkles size={16} className="text-sky-500" />
              隐私录制说明
            </h4>
            {asrStatus && (
              <div className="rounded-xl bg-[#F7F3EE] px-4 py-3 text-[12px] leading-relaxed text-[#8C7A6B]">
                {asrStatus.message}
              </div>
            )}
            <div className="space-y-3">
              <div className="rounded-xl border border-[#E3D9CE] bg-white p-4 shadow-sm transition-all hover:border-[#D8CEC4]">
                <div className="flex items-center gap-2.5 font-medium text-[#4A3C31] text-[13px]">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-indigo-500">
                    <Mic size={14} />
                  </div>
                  1. 采集你的声音
                </div>
                <p className="mt-1.5 pl-[34px] text-[11px] text-[#8C7A6B]">点击允许麦克风权限</p>
              </div>
              <div className="rounded-xl border border-[#E3D9CE] bg-white p-4 shadow-sm transition-all hover:border-[#D8CEC4]">
                <div className="flex items-center gap-2.5 font-medium text-[#4A3C31] text-[13px]">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-50 text-teal-500">
                    <Monitor size={14} />
                  </div>
                  2. 采集对方的声音
                </div>
                <p className="mt-1.5 pl-[34px] text-[11px] text-[#8C7A6B]">选择会议标签页并勾选「共享音频」</p>
              </div>
              <div className="rounded-xl border border-[#E3D9CE] bg-white p-4 shadow-sm transition-all hover:border-[#D8CEC4]">
                <div className="flex items-center gap-2.5 font-medium text-[#4A3C31] text-[13px]">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-50 text-sky-500">
                    <FileAudio size={14} />
                  </div>
                  3. 导入已有录音
                </div>
                <p className="mt-1.5 pl-[34px] text-[11px] text-[#8C7A6B]">支持上传音频文件并直接转写</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-[#E3D9CE] bg-[#FCFAF8] p-5">
            <h4 className="flex items-center gap-2 text-[14px] font-semibold text-[#5C4D42]">
              <SlidersHorizontal size={16} className="text-[#8C7A6B]" />
              自动结束录音
            </h4>
            <div className="space-y-4">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E3D9CE] bg-white p-4 shadow-sm transition-colors hover:bg-[#F9F8F6]">
                <input
                  type="checkbox"
                  checked={recordingOptions.autoStopEnabled}
                  onChange={(e) => setRecordingOptions({ autoStopEnabled: e.target.checked })}
                  className="mt-0.5 h-4 w-4 cursor-pointer rounded border-[#D8CEC4] accent-[#4A3C31]"
                />
                <div>
                  <p className="text-[13px] font-medium text-[#4A3C31]">启用自动结束检测</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#8C7A6B]">
                    连续一段时间无新转写时提示。
                  </p>
                </div>
              </label>

              <label className="block space-y-1.5">
                <span className="text-[12px] font-medium text-[#8C7A6B]">静默超时时长</span>
                <select
                  value={recordingOptions.autoStopMinutes}
                  disabled={!recordingOptions.autoStopEnabled}
                  onChange={(e) => setRecordingOptions({ autoStopMinutes: Number(e.target.value) })}
                  className="w-full rounded-xl border border-[#E3D9CE] bg-white px-3 py-2 text-[13px] text-[#4A3C31] focus:border-[#BFAE9E] focus:outline-none disabled:cursor-not-allowed disabled:bg-[#F7F3EE] disabled:text-[#C4B6A9]"
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
