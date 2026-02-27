'use client';

import { useEffect, useRef } from 'react';
import { useMeetingStore } from '@/lib/store';
import { MessageSquare, Mic, Volume2, User } from 'lucide-react';

// 通过说话人 ID 决定样式
function getSpeakerStyle(speaker: string) {
  if (speaker.includes('麦克风') || speaker === '我（麦克风）') {
    return {
      bg: 'bg-white',
      dot: 'bg-indigo-400',
      icon: Mic,
      label: 'ME',
    };
  }
  if (speaker.includes('系统音频') || speaker.includes('对方')) {
    return {
      bg: 'bg-white',
      dot: 'bg-teal-400',
      icon: Volume2,
      label: 'OTHER',
    };
  }
  // 兼容旧的 Speaker A/B/C
  const colors: Record<string, { bg: string; dot: string }> = {
    'Speaker A': { bg: 'bg-white', dot: 'bg-indigo-400' },
    'Speaker B': { bg: 'bg-white', dot: 'bg-teal-400' },
    'Speaker C': { bg: 'bg-white', dot: 'bg-purple-400' },
  };
  const c = colors[speaker] || { bg: 'bg-white', dot: 'bg-gray-400' };
  return { ...c, icon: User, label: speaker.toUpperCase() };
}

export default function TranscriptPanel() {
  const { segments, currentPartial, status, speakers, systemAudioActive, micActive } =
    useMeetingStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments, currentPartial]);

  const getSpeakerDisplayName = (speaker: string) => {
    return speakers[speaker] || speaker;
  };

  if (status === 'idle') {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 bg-white text-gray-400">
        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-6">
          <MessageSquare size={24} className="text-gray-300" strokeWidth={1.5} />
        </div>
        <p className="text-base font-medium text-gray-600">准备聆听...</p>
        <p className="mt-2 text-sm text-center text-gray-400 max-w-[240px] leading-relaxed">
          保持安静，或者点击顶部按钮开始记录您的会议对话
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-black/5 px-6 py-4">
        <h3 className="text-base font-semibold text-gray-900">实时转写</h3>
        <div className="flex items-center gap-3">
          {/* 实时通道状态 */}
          {status === 'recording' && (
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium tracking-wider uppercase ${
                  micActive ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-400'
                }`}
              >
                <Mic size={10} />
                <span>ME</span>
              </div>
              <div
                className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium tracking-wider uppercase ${
                  systemAudioActive ? 'bg-teal-50 text-teal-600' : 'bg-gray-50 text-gray-400'
                }`}
              >
                <Volume2 size={10} />
                <span>OTHER</span>
              </div>
            </div>
          )}
          <span className="rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500">
            {segments.length} 条
          </span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {segments.map((seg) => {
          const style = getSpeakerStyle(seg.speaker);
          const isSystemPlaceholder = seg.text.startsWith('[对方正在发言');

          return (
            <div
              key={seg.id}
              className={`rounded-2xl p-4 transition-all ${style.bg} ${
                isSystemPlaceholder ? 'opacity-60' : ''
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[11px] font-semibold text-gray-400 tracking-widest uppercase">
                  {style.label || getSpeakerDisplayName(seg.speaker)}
                </span>
                <span className="text-[11px] text-gray-300">
                  {new Date(seg.startTime).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p
                className={`text-[15px] text-gray-800 leading-[1.8] ${
                  isSystemPlaceholder ? 'italic opacity-70 text-gray-500' : ''
                }`}
              >
                {seg.text}
              </p>
            </div>
          );
        })}

        {/* 正在说的临时文字 */}
        {currentPartial && status === 'recording' && (
          <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/50 p-3">
            <div className="mb-1 flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
              <Mic size={11} className="text-blue-400" />
              <span className="text-xs font-medium text-blue-500">识别中...</span>
            </div>
            <p className="text-sm italic text-blue-500/80">{currentPartial}</p>
          </div>
        )}

        {/* 系统音频正在说话的实时提示 */}
        {systemAudioActive && status === 'recording' && (
          <div className="rounded-lg border border-dashed border-green-200 bg-green-50/50 p-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              <Volume2 size={11} className="text-green-400" />
              <span className="text-xs font-medium text-green-500">
                对方正在发言...
              </span>
            </div>
          </div>
        )}

        {/* 录音中但无内容时的提示 */}
        {segments.length === 0 && !currentPartial && status === 'recording' && (
          <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
            <div className="mb-3 flex gap-1">
              <div className="h-3 w-1 animate-pulse rounded bg-red-300" style={{ animationDelay: '0ms' }} />
              <div className="h-4 w-1 animate-pulse rounded bg-red-400" style={{ animationDelay: '150ms' }} />
              <div className="h-5 w-1 animate-pulse rounded bg-red-500" style={{ animationDelay: '300ms' }} />
              <div className="h-4 w-1 animate-pulse rounded bg-red-400" style={{ animationDelay: '150ms' }} />
              <div className="h-3 w-1 animate-pulse rounded bg-red-300" style={{ animationDelay: '0ms' }} />
            </div>
            <p className="text-xs">正在聆听...</p>
          </div>
        )}
      </div>

      {/* 底部图例 */}
      {segments.length > 0 && (
        <div className="border-t border-zinc-100 px-4 py-2">
          <div className="flex flex-wrap gap-3">
            {Array.from(new Set(segments.map((s) => s.speaker))).map((speaker) => {
              const style = getSpeakerStyle(speaker);
              const Icon = style.icon;
              return (
                <div key={speaker} className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <div className={`h-2 w-2 rounded-full ${style.dot}`} />
                  <Icon size={10} />
                  <span>{getSpeakerDisplayName(speaker)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
