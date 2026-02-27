import { NextRequest, NextResponse } from 'next/server';
import { generateTextWithFallback, getConfiguredProviders } from '@/lib/llm-provider';

export async function POST(req: NextRequest) {
  try {
    const { transcript, userNotes, meetingTitle, templatePrompt } =
      await req.json();

    if (getConfiguredProviders().length === 0) {
      // Demo 模式：无 API Key 时返回模拟结果
      return NextResponse.json({
        content: generateDemoEnhancedNotes(transcript, userNotes, meetingTitle),
      });
    }

    const systemPrompt =
      templatePrompt ||
      `你是一位专业的会议记录助手。请根据以下三个输入生成结构化会议纪要：

1. 会议转写记录（含说话人标注）
2. 用户手写的关键要点
3. 会议基本信息

输出格式：
## 会议摘要
（3-5句话概括）

## 关键讨论点
（按主题分点整理）

## 决策事项
（明确达成的决定）

## 行动项
（包含负责人和建议截止日期）

## 待确认事项
（需要后续跟进确认的问题）

要求：以用户手写要点为优先参考，用转写内容补充细节和上下文。使用中文输出。`;

    try {
      const { content, provider } = await generateTextWithFallback({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `会议标题：${meetingTitle || '未命名会议'}

--- 会议转写记录 ---
${transcript || '（无转写内容）'}

--- 用户手写要点 ---
${userNotes || '（用户未记录要点）'}

请根据以上内容生成结构化会议纪要。`,
          },
        ],
        temperature: 0.3,
        maxTokens: 4096,
      });

      return NextResponse.json({ content, provider });
    } catch (llmError) {
      const strictMode = process.env.LLM_STRICT_MODE === 'true';
      const message =
        llmError instanceof Error ? llmError.message : '未知 LLM 错误';

      if (strictMode) {
        throw llmError;
      }

      return NextResponse.json({
        content: `${generateDemoEnhancedNotes(transcript, userNotes, meetingTitle)}\n\n---\n⚠️ LLM 调用失败，已回退到 Demo 内容：${message}`,
        provider: 'demo',
        warning: message,
      });
    }
  } catch (error) {
    console.error('Enhance error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? `AI 服务调用失败：${error.message}` : '服务器内部错误',
      },
      { status: 502 }
    );
  }
}

function generateDemoEnhancedNotes(
  transcript: string,
  userNotes: string,
  meetingTitle: string
): string {
  return `## 会议摘要
本次「${meetingTitle || '未命名会议'}」讨论了多项重要议题。参会者就关键问题进行了深入交流，并达成了初步共识。

## 关键讨论点
${transcript ? '- 基于转写内容的讨论要点（Demo 模式）' : '- 暂无转写内容'}
${userNotes ? '- 基于用户笔记的重点' : ''}

## 决策事项
- 此为 Demo 模式生成的示例内容
- 配置 Gemini 或 MiniMax API Key 后将使用真实 AI 生成

## 行动项
- [ ] 配置 GEMINI_API_KEY 或 MINIMAX_API_KEY + MINIMAX_GROUP_ID
- [ ] 配置阿里云 ASR 相关密钥以启用实时转写

## 待确认事项
- 完整 AI 功能需要配置相应的 API 密钥

> *提示：当前为 Demo 模式。配置 .env.local 中的 API 密钥后可启用完整 AI 能力。*`;
}
