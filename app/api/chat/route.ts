import { NextRequest } from 'next/server';
import { generateTextWithFallback, getConfiguredProviders } from '@/lib/llm-provider';

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

export async function POST(req: NextRequest) {
  try {
    const {
      transcript,
      userNotes,
      enhancedNotes,
      chatHistory,
      question,
      templatePrompt,
    } = await req.json();

    if (getConfiguredProviders().length === 0) {
      // Demo 模式
      const demoResponse = getDemoResponse(question);
      const stream = createTextStream(demoResponse);
      return new Response(stream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const systemPrompt =
      templatePrompt ||
      `你是一位智能会议助手。用户会基于一个会议的内容向你提问。

你可以访问以下会议信息：
1. 会议转写记录（含说话人标注）
2. 用户的手写笔记要点
3. AI 生成的结构化会议纪要

请基于这些信息准确回答用户问题。如果信息不足以回答，请诚实说明。使用中文回答。`;

    const contextMessage = `--- 会议转写记录 ---
${transcript || '（无）'}

--- 用户笔记要点 ---
${userNotes || '（无）'}

--- AI 会议纪要 ---
${enhancedNotes || '（无）'}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `以下是会议上下文：\n${contextMessage}` },
      { role: 'assistant', content: '好的，我已了解本次会议的完整内容。请问有什么需要帮您分析或解答的？' },
      ...(chatHistory || []).map(
        (m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })
      ),
      { role: 'user', content: question },
    ];

    const { content, provider } = await generateTextWithFallback({
      messages,
      temperature: 0.5,
      maxTokens: 4096,
    });

    const stream = createTextStream(content);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-LLM-Provider': provider,
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      error instanceof Error ? `AI 服务调用失败：${error.message}` : '服务器内部错误',
      { status: 502 }
    );
  }
}

function getDemoResponse(question: string): string {
  if (question.includes('行动') || question.includes('待办') || question.includes('TODO')) {
    return '根据会议内容，主要的行动项包括：\n\n1. 配置 API 密钥以启用完整 AI 功能\n2. 测试实时语音转写\n3. 完善模版系统\n\n> *当前为 Demo 模式，配置 Gemini 或 MiniMax API 密钥后将基于实际会议内容回答*';
  }
  if (question.includes('总结') || question.includes('摘要')) {
    return '本次会议的核心内容总结如下：\n\n会议讨论了多项议题，各参会者充分表达了意见并达成初步共识。\n\n> *当前为 Demo 模式*';
  }
  return `关于您的问题「${question}」：\n\n基于当前会议记录的分析结果将在此显示。配置 Gemini 或 MiniMax API 密钥后，将使用真实 AI 基于转写和笔记内容回答您的问题。\n\n> *当前为 Demo 模式，请配置 .env.local 中的 API 密钥启用完整功能*`;
}
