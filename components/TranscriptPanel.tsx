'use client';

import { useEffect, useRef } from 'react';
import { useMeetingStore } from '@/lib/store';
import { MessageSquare, Mic, Volume2, User } from 'lucide-react';

// 通过说话人 ID 决定样式
function getSpeakerStyle(speaker: string) {
  if (speaker.includes('麦克风') || speaker === '我（麦克风）') {
    return {
      bg: 'bg-blue-50 border-blue-200 text-blue-900',
      dot: 'bg-blue-400',
      icon: Mic,
      label: '我',
    };
  }
  if (speaker.includes('系统音频') || speaker.includes('对方')) {
    return {
      bg: 'bg-green-50 border-green-200 text-green-900',
      dot: 'bg-green-400',
      icon: Volume2,
      label: '对方',
    };
  }
  // 兼容旧的 Speaker A/B/C
  const colors: Record<string, { bg: string; dot: string }> = {
    'Speaker A': { bg: 'bg-blue-50 border-blue-200 text-blue-900', dot: 'bg-blue-400' },
    'Speaker B': { bg: 'bg-green-50 border-green-200 text-green-900', dot: 'bg-green-400' },
    'Speaker C': { bg: 'bg-purple-50 border-purple-200 text-purple-900', dot: 'bg-purple-400' },
  };
  const c = colors[speaker] || { bg: 'bg-zinc-50 border-zinc-200 text-zinc-900', dot: 'bg-zinc-400' };
  return { ...c, icon: User, label: speaker };
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
      <div className="flex h-full flex-col items-center justify-center px-6 text-zinc-400">
        <MessageSquare size={48} strokeWidth={1} className="mb-4 opacity-50" />
        <p className="text-sm font-medium">实时转写</p>
        <p className="mt-1 text-xs text-center">
          点击「开始录音」后，转写内容将在这里显示
        </p>
        <div className="mt-6 w-full max-w-[220px] space-y-2">
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-600">
            <Mic size={12} />
            <span>麦克风 → 你的声音</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-600">
            <Volume2 size={12} />
            <span>系统音频 → 对方的声音</span>
          </div>
        </div>
        <p className="mt-4 max-w-[200px] text-center text-xs text-zinc-300 leading-relaxed">
          Botless 模式：不会有 Bot 进入你的会议
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2">
        <h3 className="text-sm font-semibold text-zinc-700">实时转写</h3>
        <div className="flex items-center gap-2">
          {/* 实时通道状态 */}
          {status === 'recording' && (
            <div className="flex items-center gap-1.5">
              <div
                className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs ${
                  micActive ? 'bg-blue-100 text-blue-600' : 'bg-zinc-50 text-zinc-300'
                }`}
              >
                <Mic size={10} />
                <span>我</span>
              </div>
              <div
                className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs ${
                  systemAudioActive ? 'bg-green-100 text-green-600' : 'bg-zinc-50 text-zinc-300'
                }`}
              >
                <Volume2 size={10} />
                <span>对方</span>
              </div>
            </div>
          )}
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
            {segments.length} 条
          </span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {segments.map((seg) => {
          const style = getSpeakerStyle(seg.speaker);
          const Icon = style.icon;
          const isSystemPlaceholder = seg.text.startsWith('[对方正在发言');

          return (
            <div
              key={seg.id}
              className={`rounded-lg border p-3 transition-all ${style.bg} ${
                isSystemPlaceholder ? 'opacity-60' : ''
              }`}
            >
              <div className="mb-1 flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${style.dot}`} />
                <Icon size={11} className="opacity-70" />
                <span className="text-xs font-medium">
                  {getSpeakerDisplayName(seg.speaker)}
                </span>
                <span className="text-xs opacity-50">
                  {new Date(seg.startTime).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
              <p
                className={`text-sm leading-relaxed ${
                  isSystemPlaceholder ? 'italic opacity-70' : ''
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
