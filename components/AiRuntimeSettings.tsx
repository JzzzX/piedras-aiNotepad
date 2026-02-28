'use client';

import { useEffect, useState } from 'react';
import { KeyRound, RotateCcw, Sparkles } from 'lucide-react';
import { useMeetingStore } from '@/lib/store';

const STORAGE_KEY = 'ai-notepad-llm-settings-v1';

export default function AiRuntimeSettings() {
  const { llmSettings, setLlmSettings } = useMeetingStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setHydrated(true);
        return;
      }

      const parsed = JSON.parse(raw) as Partial<typeof llmSettings>;
      setLlmSettings(parsed);
    } catch {
      // ignore invalid local storage
    } finally {
      setHydrated(true);
    }
  }, [setLlmSettings]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(llmSettings));
  }, [hydrated, llmSettings]);

  const handleReset = () => {
    const next = {
      provider: 'auto' as const,
      geminiApiKey: '',
      geminiModel: 'gemini-flash-latest',
      openaiApiKey: '',
      openaiModel: 'gpt-4.1-mini',
      openaiBaseUrl: 'https://api.openai.com/v1',
    };
    setLlmSettings(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const providerLabel =
    llmSettings.provider === 'auto'
      ? 'Auto（使用服务端环境变量）'
      : llmSettings.provider === 'gemini'
        ? 'Gemini（本地 API Key）'
        : 'OpenAI 兼容（本地 API Key）';

  return (
    <div className="space-y-3 rounded-2xl border border-[#D8CEC4] bg-[#FCFAF8] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#5C4D42]">
          <Sparkles size={13} className="text-sky-500" />
          LLM 接入设置
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-[#8C7A6B] transition-colors hover:bg-[#F7F3EE] hover:text-[#4A3C31]"
        >
          <RotateCcw size={12} />
          重置
        </button>
      </div>

      <label className="block space-y-1">
        <span className="text-xs text-[#8C7A6B]">模型来源</span>
        <select
          value={llmSettings.provider}
          onChange={(event) =>
            setLlmSettings({ provider: event.target.value as typeof llmSettings.provider })
          }
          className="w-full rounded-xl border border-[#D8CEC4] bg-white px-3 py-2 text-sm text-[#4A3C31] focus:border-[#BFAE9E] focus:outline-none"
        >
          <option value="auto">Auto（服务端已配置模型）</option>
          <option value="gemini">Gemini（自己填写 API Key）</option>
          <option value="openai">OpenAI 兼容（自己填写 API Key）</option>
        </select>
      </label>

      <div className="rounded-xl bg-[#F7F3EE] px-3 py-2 text-[11px] leading-relaxed text-[#8C7A6B]">
        当前模式：{providerLabel}
        <br />
        本地输入的密钥只保存在当前浏览器，不会写入数据库。
      </div>

      {llmSettings.provider === 'gemini' && (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 md:col-span-2">
            <span className="inline-flex items-center gap-1 text-xs text-[#8C7A6B]">
              <KeyRound size={12} />
              Gemini API Key
            </span>
            <input
              type="password"
              value={llmSettings.geminiApiKey}
              onChange={(event) => setLlmSettings({ geminiApiKey: event.target.value })}
              placeholder="AIza..."
              className="w-full rounded-xl border border-[#D8CEC4] bg-white px-3 py-2 text-sm text-[#4A3C31] placeholder:text-[#C4B6A9] focus:border-[#BFAE9E] focus:outline-none"
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs text-[#8C7A6B]">Gemini 模型</span>
            <input
              value={llmSettings.geminiModel}
              onChange={(event) => setLlmSettings({ geminiModel: event.target.value })}
              placeholder="gemini-flash-latest"
              className="w-full rounded-xl border border-[#D8CEC4] bg-white px-3 py-2 text-sm text-[#4A3C31] placeholder:text-[#C4B6A9] focus:border-[#BFAE9E] focus:outline-none"
            />
          </label>
        </div>
      )}

      {llmSettings.provider === 'openai' && (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 md:col-span-2">
            <span className="inline-flex items-center gap-1 text-xs text-[#8C7A6B]">
              <KeyRound size={12} />
              API Key
            </span>
            <input
              type="password"
              value={llmSettings.openaiApiKey}
              onChange={(event) => setLlmSettings({ openaiApiKey: event.target.value })}
              placeholder="sk-..."
              className="w-full rounded-xl border border-[#D8CEC4] bg-white px-3 py-2 text-sm text-[#4A3C31] placeholder:text-[#C4B6A9] focus:border-[#BFAE9E] focus:outline-none"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-[#8C7A6B]">Base URL</span>
            <input
              value={llmSettings.openaiBaseUrl}
              onChange={(event) => setLlmSettings({ openaiBaseUrl: event.target.value })}
              placeholder="https://api.openai.com/v1"
              className="w-full rounded-xl border border-[#D8CEC4] bg-white px-3 py-2 text-sm text-[#4A3C31] placeholder:text-[#C4B6A9] focus:border-[#BFAE9E] focus:outline-none"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-[#8C7A6B]">模型名称</span>
            <input
              value={llmSettings.openaiModel}
              onChange={(event) => setLlmSettings({ openaiModel: event.target.value })}
              placeholder="gpt-4.1-mini"
              className="w-full rounded-xl border border-[#D8CEC4] bg-white px-3 py-2 text-sm text-[#4A3C31] placeholder:text-[#C4B6A9] focus:border-[#BFAE9E] focus:outline-none"
            />
          </label>
        </div>
      )}
    </div>
  );
}
