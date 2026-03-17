import { NextResponse } from 'next/server';
import { inferOpenAIPreset } from '@/lib/llm-config';
import { getConfiguredProviders, hasAvailableLlm, type LlmProvider } from '@/lib/llm-provider';

function resolveModel(provider: LlmProvider): string | null {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_MODEL || 'gpt-4o-mini';
    case 'gemini':
      return process.env.GEMINI_MODEL || 'gemini-flash-latest';
    case 'minimax':
      return process.env.MINIMAX_MODEL || 'MiniMax-Text-01';
  }
}

function resolveMessage(provider: LlmProvider, preset: string | null): string {
  switch (provider) {
    case 'openai':
      if (preset === 'aihubmix') return 'AiHubMix 已配置';
      if (preset === 'openai') return 'OpenAI 兼容接口已配置';
      return '自定义 OpenAI 兼容接口已配置';
    case 'gemini':
      return 'Gemini 已配置';
    case 'minimax':
      return 'MiniMax 已配置';
  }
}

export function GET() {
  if (!hasAvailableLlm()) {
    return NextResponse.json({
      ready: false,
      provider: 'none',
      model: null,
      preset: null,
      message: '未配置可用 LLM',
    });
  }

  const provider = getConfiguredProviders()[0] ?? 'openai';
  const preset = provider === 'openai' ? inferOpenAIPreset(process.env.OPENAI_BASE_URL) : null;

  return NextResponse.json({
    ready: true,
    provider,
    model: resolveModel(provider),
    preset,
    message: resolveMessage(provider, preset),
  });
}
