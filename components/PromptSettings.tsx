'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useMeetingStore } from '@/lib/store';
import type { MeetingType, OutputStyle } from '@/lib/types';
import AiRuntimeSettings from './AiRuntimeSettings';

const MEETING_TYPES: MeetingType[] = ['通用', '项目周会', '需求评审', '销售沟通', '面试复盘'];
const OUTPUT_STYLES: OutputStyle[] = ['简洁', '平衡', '详细', '行动导向'];

export default function PromptSettings() {
  const { promptOptions, setPromptOptions } = useMeetingStore();

  return (
    <div className="space-y-4 rounded-2xl border border-[#D8CEC4] bg-[#FCFAF8] p-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#5C4D42]">
        <SlidersHorizontal size={13} className="text-[#8C7A6B]" />
        AI 输出设置
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs text-[#8C7A6B]">会议类型</span>
          <select
            value={promptOptions.meetingType}
            onChange={(e) =>
              setPromptOptions({ meetingType: e.target.value as MeetingType })
            }
            className="w-full rounded-xl border border-[#D8CEC4] bg-white px-3 py-2 text-sm text-[#4A3C31] focus:border-[#BFAE9E] focus:outline-none"
          >
            {MEETING_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-[#8C7A6B]">输出风格</span>
          <select
            value={promptOptions.outputStyle}
            onChange={(e) =>
              setPromptOptions({ outputStyle: e.target.value as OutputStyle })
            }
            className="w-full rounded-xl border border-[#D8CEC4] bg-white px-3 py-2 text-sm text-[#4A3C31] focus:border-[#BFAE9E] focus:outline-none"
          >
            {OUTPUT_STYLES.map((style) => (
              <option key={style} value={style}>
                {style}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-xs text-[#5C4D42]">
        <input
          type="checkbox"
          checked={promptOptions.includeActionItems}
          onChange={(e) => setPromptOptions({ includeActionItems: e.target.checked })}
          className="h-3.5 w-3.5 rounded border-[#C4B6A9]"
        />
        输出行动项（负责人 + 截止日期）
      </label>

      <AiRuntimeSettings />
    </div>
  );
}
