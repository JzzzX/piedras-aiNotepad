'use client';

import { useState } from 'react';
import {
  Mic,
  Sparkles,
  FileText,
  Workflow,
} from 'lucide-react';
import RecorderSettingsInline from '@/components/settings/RecorderSettingsInline';
import AiRuntimeSettings from '@/components/AiRuntimeSettings';
import TemplateManagerInline from '@/components/settings/TemplateManagerInline';
import McpSettingsInline from '@/components/settings/McpSettingsInline';

type SettingsTab = 'recorder' | 'ai' | 'recipes' | 'mcp';

const TABS: { id: SettingsTab; label: string; icon: typeof Mic }[] = [
  { id: 'recorder', label: '录音与 ASR', icon: Mic },
  { id: 'ai', label: 'AI 模型', icon: Sparkles },
  { id: 'recipes', label: 'Recipes', icon: FileText },
  { id: 'mcp', label: '生态接入', icon: Workflow },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('recorder');

  return (
    <div className="flex h-full flex-col bg-[#F4F0E6]">
      <header className="px-6 py-4 sm:px-8">
        <h1 className="font-[family-name:var(--font-vt323)] text-lg font-semibold text-[#111] pl-10 md:pl-0">设置</h1>
      </header>

      {/* Tab bar */}
      <div className="border-b-2 border-[#111] px-6 sm:px-8">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-none px-4 py-2.5 text-sm font-medium font-[family-name:var(--font-vt323)] transition-all border-2 border-[#111] border-b-0 ${
                activeTab === tab.id
                  ? 'bg-[#111] text-[#F4F0E6]'
                  : 'bg-[#F4F0E6] text-[#111] hover:text-[#8A8578]'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
        <div className="mx-auto max-w-4xl">
          {activeTab === 'recorder' && <RecorderSettingsInline />}
          {activeTab === 'ai' && <AiRuntimeSettings />}
          {activeTab === 'recipes' && <TemplateManagerInline />}
          {activeTab === 'mcp' && <McpSettingsInline />}
        </div>
      </div>
    </div>
  );
}
