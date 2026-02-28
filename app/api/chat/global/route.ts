import { NextRequest } from 'next/server';
import { generateTextWithFallback, hasAvailableLlm } from '@/lib/llm-provider';
import { retrieveGlobalMeetingContext, type GlobalChatFilters } from '@/lib/global-chat';
import { buildGlossaryPromptBlock } from '@/lib/glossary';
import type { PromptOptions } from '@/lib/types';

type PromptOptionsInput = Partial<PromptOptions> | undefined;

function createTextStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      const chars = text.split('');
      let i = 0;
      const interval = setInterval(() => {
        if (i < chars.length) {
          controller.enqueue(encoder.encode(chars[i]));
          i++;
        } else {
          clearInterval(interval);
          controller.close();
        }
      }, 8);
    },
  });
}

function normalizePromptOptions(input: PromptOptionsInput): PromptOptions {
  return {
    meetingType: input?.meetingType || '通用',
    outputStyle: input?.outputStyle || '平衡',
    includeActionItems: input?.includeActionItems ?? true,
  };
}

function buildGlobalChatSystemPrompt(
  options: PromptOptions,
  glossaryBlock?: string
): string {
  const styleMap: Record<PromptOptions['outputStyle'], string> = {
    简洁: '回答尽量精炼，优先给出结论。',
    平衡: '在完整性与简洁性之间保持平衡。',
    详细: '回答时补充必要背景、原因和前后文。',
    行动导向: '回答优先给出可执行建议和下一步安排。',
  };

  const actionRule = options.includeActionItems
    ? '当问题涉及执行安排时，尽量提炼行动项。'
    : '除非用户明确要求，不主动输出行动项。';

  const basePrompt = `你是一位跨会议知识助手。你会收到多场历史会议的检索结果（带来源编号 M1/M2/...）。

回答要求：
1. 只能使用提供的检索内容回答，不要臆造未出现的信息。
2. ${styleMap[options.outputStyle]}
3. ${actionRule}
4. 回答中尽量在关键结论后标注来源编号（例如：[M1]、[M2]）。
5. 使用中文回答。`;

  return glossaryBlock ? `${basePrompt}\n\n${glossaryBlock}` : basePrompt;
}

function formatSources(sources: Array<{ ref: string; title: string; date: string }>): string {
  if (sources.length === 0) return '参考来源：无';
  const lines = sources.map((s) => {
    const dateText = new Date(s.date).toLocaleString('zh-CN', { hour12: false });
    return `- [${s.ref}] ${s.title}（${dateText}）`;
  });
  return `参考来源：\n${lines.join('\n')}`;
}

function buildNoResultMessage(filters: GlobalChatFilters): string {
  const conditions: string[] = [];
  if (filters.titleKeyword) conditions.push(`标题含“${filters.titleKeyword}”`);
  if (filters.dateFrom) conditions.push(`开始时间 >= ${filters.dateFrom}`);
  if (filters.dateTo) conditions.push(`结束时间 <= ${filters.dateTo}`);
  if (filters.folderId) {
    conditions.push(
      filters.folderId === '__ungrouped'
        ? '仅未分组会议'
        : `文件夹 = ${filters.folderId}`
    );
  }

  if (conditions.length === 0) {
    return '未检索到可用历史会议。请先保存会议记录后再进行跨会议提问。';
  }
  return `在当前筛选条件下未检索到会议：${conditions.join('，')}。请调整筛选条件后重试。`;
}

export async function POST(req: NextRequest) {
  try {
    const { question, chatHistory, filters, promptOptions, llmRuntimeConfig } =
      await req.json();
    const q = (question || '').trim();
    if (!q) {
      return new Response('问题不能为空', { status: 400 });
    }

    const retrieval = await retrieveGlobalMeetingContext(q, (filters || {}) as GlobalChatFilters);
    if (retrieval.sources.length === 0) {
      return new Response(buildNoResultMessage((filters || {}) as GlobalChatFilters), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (!hasAvailableLlm(llmRuntimeConfig)) {
      const demo = `当前为 Demo 模式，已检索到 ${retrieval.sources.length} 场相关会议。\n\n你可以配置 Gemini 或 OpenAI 兼容 API Key 后获得真实模型回答。\n\n${formatSources(retrieval.sources)}`;
      return new Response(createTextStream(demo), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const options = normalizePromptOptions(promptOptions);
    const glossaryBlock = await buildGlossaryPromptBlock();
    const systemPrompt = buildGlobalChatSystemPrompt(options, glossaryBlock);

    const messages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `以下是检索到的历史会议上下文：\n\n${retrieval.context}`,
      },
      {
        role: 'assistant',
        content: '我已读取这些历史会议上下文，请继续提问。',
      },
      ...(chatHistory || []).map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: q },
    ];

    const { content, provider } = await generateTextWithFallback({
      messages,
      temperature: 0.4,
      maxTokens: 4096,
      runtimeConfig: llmRuntimeConfig,
    });

    const fullContent = `${content.trim()}\n\n---\n${formatSources(retrieval.sources)}`;
    const stream = createTextStream(fullContent);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-LLM-Provider': provider,
      },
    });
  } catch (error) {
    console.error('Global chat error:', error);
    return new Response(
      error instanceof Error ? `跨会议 AI 服务调用失败：${error.message}` : '服务器内部错误',
      { status: 502 }
    );
  }
}
