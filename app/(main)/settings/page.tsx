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

type SettingsTab = 'recorder' | 'ai' | 'templates' | 'mcp';

const TABS: { id: SettingsTab; label: string; icon: typeof Mic }[] = [
  { id: 'recorder', label: '录音与 ASR', icon: Mic },
  { id: 'ai', label: 'AI 模型', icon: Sparkles },
  { id: 'templates', label: '模板', icon: FileText },
  { id: 'mcp', label: '生态接入', icon: Workflow },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('recorder');

  return (
    <div className="flex h-full flex-col">
      <header className="px-6 py-4 sm:px-8">
        <h1 className="font-song text-lg font-semibold text-[#3A2E25] pl-10 md:pl-0">设置</h1>
      </header>

      {/* Tab bar */}
      <div className="border-b border-[#E3D9CE]/50 px-6 sm:px-8">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'border-b-2 border-[#4A3C31] text-[#3A2E25]'
                  : 'text-[#8C7A6B] hover:text-[#5C4D42]'
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
          {activeTab === 'templates' && <TemplateManagerInline />}
          {activeTab === 'mcp' && <McpSettingsInline />}
        </div>
      </div>
    </div>
  );
}
