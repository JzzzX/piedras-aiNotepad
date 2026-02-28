import { TranscriptSegment, ChatMessage } from './types';
import type { LlmRuntimeConfig, LlmSettings, PromptOptions } from './types';

export interface GlobalChatFilters {
  titleKeyword?: string;
  dateFrom?: string;
  dateTo?: string;
  folderId?: string;
}

// 构建转写文本（带说话人标注）
function buildTranscriptText(
  segments: TranscriptSegment[],
  speakers: Record<string, string>
): string {
  return segments
    .filter((s) => s.isFinal)
    .map((s) => {
      const name = speakers[s.speaker] || s.speaker;
      return `[${name}]: ${s.text}`;
    })
    .join('\n');
}

function buildRuntimeConfig(settings?: LlmSettings): LlmRuntimeConfig | undefined {
  if (!settings || settings.provider === 'auto') {
    return { provider: 'auto' };
  }

  if (settings.provider === 'gemini') {
    const apiKey = settings.geminiApiKey.trim();
    if (!apiKey) {
      throw new Error('请先在 AI 设置中填写 Gemini API Key');
    }

    return {
      provider: 'gemini',
      apiKey,
      model: settings.geminiModel.trim() || 'gemini-flash-latest',
    };
  }

  const apiKey = settings.openaiApiKey.trim();
  const model = settings.openaiModel.trim();
  if (!apiKey) {
    throw new Error('请先在 AI 设置中填写 OpenAI 兼容 API Key');
  }
  if (!model) {
    throw new Error('请先在 AI 设置中填写 OpenAI 兼容模型名称');
  }

  return {
    provider: 'openai',
    apiKey,
    model,
    baseUrl: settings.openaiBaseUrl.trim() || 'https://api.openai.com/v1',
  };
}

// AI 融合笔记
export async function enhanceNotes(
  segments: TranscriptSegment[],
  userNotes: string,
  meetingTitle: string,
  speakers: Record<string, string>,
  templatePrompt?: string,
  promptOptions?: PromptOptions,
  llmSettings?: LlmSettings
): Promise<string> {
  const transcript = buildTranscriptText(segments, speakers);

  const res = await fetch('/api/enhance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript,
      userNotes,
      meetingTitle,
      templatePrompt,
      promptOptions,
      llmRuntimeConfig: buildRuntimeConfig(llmSettings),
    }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const errData = await res.json();
      detail = errData?.error || '';
    } catch {
      try {
        detail = await res.text();
      } catch {
        detail = '';
      }
    }
    throw new Error(detail ? `AI 笔记生成失败：${detail}` : 'AI 笔记生成失败');
  }

  const data = await res.json();
  return data.content;
}

// 会议 Chat
export async function chatWithMeeting(
  segments: TranscriptSegment[],
  userNotes: string,
  enhancedNotes: string,
  chatHistory: ChatMessage[],
  question: string,
  speakers: Record<string, string>,
  templatePrompt?: string,
  promptOptions?: PromptOptions,
  llmSettings?: LlmSettings
): Promise<ReadableStream<Uint8Array> | null> {
  const transcript = buildTranscriptText(segments, speakers);

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript,
      userNotes,
      enhancedNotes,
      chatHistory: chatHistory.slice(-10),
      question,
      templatePrompt,
      promptOptions,
      llmRuntimeConfig: buildRuntimeConfig(llmSettings),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail ? `Chat 请求失败：${detail}` : 'Chat 请求失败');
  }

  return res.body;
}

// 跨会议 Chat
export async function chatAcrossMeetings(
  chatHistory: ChatMessage[],
  question: string,
  filters?: GlobalChatFilters,
  promptOptions?: PromptOptions,
  llmSettings?: LlmSettings
): Promise<ReadableStream<Uint8Array> | null> {
  const res = await fetch('/api/chat/global', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatHistory: chatHistory.slice(-10),
      question,
      filters,
      promptOptions,
      llmRuntimeConfig: buildRuntimeConfig(llmSettings),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail ? `跨会议 Chat 请求失败：${detail}` : '跨会议 Chat 请求失败');
  }

  return res.body;
}

export async function generateMeetingTitle(
  segments: TranscriptSegment[],
  speakers: Record<string, string>,
  promptOptions?: PromptOptions,
  llmSettings?: LlmSettings
): Promise<string> {
  const transcript = buildTranscriptText(segments.slice(0, 40), speakers);

  const res = await fetch('/api/meetings/title', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript,
      promptOptions,
      llmRuntimeConfig: buildRuntimeConfig(llmSettings),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail ? `自动标题生成失败：${detail}` : '自动标题生成失败');
  }

  const data = await res.json();
  return data.title || '';
}
