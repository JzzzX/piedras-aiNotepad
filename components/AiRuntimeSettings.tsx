'use client';

import { useEffect, useState } from 'react';
import { KeyRound, Link2, RotateCcw, Sparkles } from 'lucide-react';
import { useMeetingStore } from '@/lib/store';
import {
  applyOpenAIPreset,
  DEFAULT_LLM_SETTINGS,
  getOpenAIPresetConfig,
  normalizeLlmSettings,
} from '@/lib/llm-config';
import type { OpenAICompatiblePreset } from '@/lib/types';

const STORAGE_KEY = 'ai-notepad-llm-settings-v2';

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

      const parsed = normalizeLlmSettings(JSON.parse(raw) as Partial<typeof llmSettings>);
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
    const next = DEFAULT_LLM_SETTINGS;
    setLlmSettings(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const providerLabel =
    llmSettings.provider === 'auto'
      ? '服务端默认 LLM（当前项目环境）'
      : llmSettings.provider === 'minimax'
        ? 'MiniMax（本地 API Key）'
        : `${getOpenAIPresetConfig(llmSettings.openaiPreset).label} / OpenAI 兼容`;

  const selectedPreset = getOpenAIPresetConfig(llmSettings.openaiPreset);
  const requestUrlPreview = `${llmSettings.openaiBaseUrl.replace(/\/+$/, '')}${llmSettings.openaiPath}`;

  const handlePresetChange = (preset: OpenAICompatiblePreset) => {
    setLlmSettings(applyOpenAIPreset(preset, llmSettings.openaiApiKey));
  };

  return (
    <div className="space-y-4 rounded-2xl border border-[#E3D9CE] bg-[#FCFAF8] p-5">
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
          <option value="auto">使用项目默认模型</option>
          <option value="minimax">MiniMax（自己填写 API Key）</option>
          <option value="openai">OpenAI 兼容 / AiHubMix（自己填写）</option>
        </select>
      </label>

      <div className="rounded-xl bg-[#F7F3EE] px-3 py-2 text-[11px] leading-relaxed text-[#8C7A6B]">
        当前模式：{providerLabel}
        <br />
        `auto` 会直接使用项目环境里配置好的默认 LLM。若你想临时切到自己的聚合网关或兼容接口，可以在下面填写 API Key、Base URL、请求路径和模型名；配置仅保存在当前浏览器。
      </div>

      {llmSettings.provider === 'minimax' && (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 md:col-span-2">
            <span className="inline-flex items-center gap-1 text-xs text-[#8C7A6B]">
              <KeyRound size={12} />
              MiniMax API Key
            </span>
            <input
              type="password"
              value={llmSettings.minimaxApiKey}
              onChange={(event) => setLlmSettings({ minimaxApiKey: event.target.value })}
              placeholder="填写 MiniMax API Key"
              className="w-full rounded-xl border border-[#D8CEC4] bg-white px-3 py-2 text-sm text-[#4A3C31] placeholder:text-[#C4B6A9] focus:border-[#BFAE9E] focus:outline-none"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-[#8C7A6B]">Group ID</span>
            <input
              value={llmSettings.minimaxGroupId}
              onChange={(event) => setLlmSettings({ minimaxGroupId: event.target.value })}
              placeholder="填写 Group ID"
              className="w-full rounded-xl border border-[#D8CEC4] bg-white px-3 py-2 text-sm text-[#4A3C31] placeholder:text-[#C4B6A9] focus:border-[#BFAE9E] focus:outline-none"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-[#8C7A6B]">模型名称</span>
            <input
              value={llmSettings.minimaxModel}
              onChange={(event) => setLlmSettings({ minimaxModel: event.target.value })}
              placeholder="MiniMax-Text-01"
              className="w-full rounded-xl border border-[#D8CEC4] bg-white px-3 py-2 text-sm text-[#4A3C31] placeholder:text-[#C4B6A9] focus:border-[#BFAE9E] focus:outline-none"
            />
          </label>
        </div>
      )}

      {llmSettings.provider === 'openai' && (
        <div className="space-y-3">
          <div className="grid gap-2 md:grid-cols-3">
            {(['aihubmix', 'openai', 'custom'] as OpenAICompatiblePreset[]).map((preset) => {
              const config = getOpenAIPresetConfig(preset);
              const isActive = llmSettings.openaiPreset === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetChange(preset)}
                  className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                    isActive
                      ? 'border-[#BFAE9E] bg-[#F7F3EE] text-[#4A3C31]'
                      : 'border-[#E3D9CE] bg-white text-[#6B5B4F] hover:border-[#D1C2B5]'
                  }`}
                >
                  <div className="text-sm font-medium">{config.label}</div>
                  <div className="mt-1 text-[11px] leading-relaxed text-[#8C7A6B]">
                    {config.description}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl bg-[#F7F3EE] px-3 py-2 text-[11px] leading-relaxed text-[#8C7A6B]">
            当前预设：{selectedPreset.label}
            <br />
            {llmSettings.openaiPreset === 'aihubmix'
              ? 'AiHubMix 使用 OpenAI 兼容接口，Base URL 建议填 https://aihubmix.com/v1，请求路径通常为 /chat/completions，模型名直接填写模型市场里的 model id。'
              : llmSettings.openaiPreset === 'openai'
                ? 'OpenAI 官方默认也是 /chat/completions。若你切换到其他兼容服务，建议选择“自定义兼容接口”后手动填写。'
                : '自定义兼容接口适用于任意支持 OpenAI Chat Completions 协议的 LLM 网关。'}
          </div>

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
                placeholder={selectedPreset.baseUrl}
                className="w-full rounded-xl border border-[#D8CEC4] bg-white px-3 py-2 text-sm text-[#4A3C31] placeholder:text-[#C4B6A9] focus:border-[#BFAE9E] focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-[#8C7A6B]">请求路径</span>
              <input
                value={llmSettings.openaiPath}
                onChange={(event) => setLlmSettings({ openaiPath: event.target.value })}
                placeholder="/chat/completions"
                className="w-full rounded-xl border border-[#D8CEC4] bg-white px-3 py-2 text-sm text-[#4A3C31] placeholder:text-[#C4B6A9] focus:border-[#BFAE9E] focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-[#8C7A6B]">模型名称</span>
              <input
                value={llmSettings.openaiModel}
                onChange={(event) => setLlmSettings({ openaiModel: event.target.value })}
                placeholder={selectedPreset.defaultModel}
                className="w-full rounded-xl border border-[#D8CEC4] bg-white px-3 py-2 text-sm text-[#4A3C31] placeholder:text-[#C4B6A9] focus:border-[#BFAE9E] focus:outline-none"
              />
            </label>
            <label className="space-y-1">
              <span className="inline-flex items-center gap-1 text-xs text-[#8C7A6B]">
                <Link2 size={12} />
                实际请求地址
              </span>
              <input
                value={requestUrlPreview}
                readOnly
                className="w-full rounded-xl border border-[#E3D9CE] bg-[#F7F3EE] px-3 py-2 text-sm text-[#8C7A6B] focus:outline-none"
              />
            </label>
          </div>

          <div className="rounded-xl border border-dashed border-[#D8CEC4] bg-white px-3 py-2 text-[11px] leading-relaxed text-[#8C7A6B]">
            使用建议：{selectedPreset.modelHint}
            <br />
            如果你接的是自建网关或第三方代理，只要它兼容 OpenAI Chat Completions，这里通常只需要改 `Base URL`、`请求路径`、`模型名称` 和 `API Key`。
          </div>
        </div>
      )}
    </div>
  );
}
