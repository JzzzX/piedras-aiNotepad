import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateTextWithFallback, hasAvailableLlm } from '@/lib/llm-provider';

function buildFallbackSummary(input: {
  collectionName: string;
  nextInterviewer: string;
  nextFocus: string;
  meetings: Array<{
    title: string;
    roundLabel: string;
    interviewerName: string;
    recommendation: string;
    handoffNote: string;
    enhancedNotes: string;
    userNotes: string;
    date: Date;
  }>;
}) {
  const latest = input.meetings[0];
  const lines = [
    `候选人：${input.collectionName}`,
    latest
      ? `最近一轮：${latest.roundLabel || latest.title || '未命名轮次'} / ${latest.interviewerName || '面试官待补充'}`
      : '最近一轮：尚未开始面试',
    `下一位面试官：${input.nextInterviewer || '待定'}`,
    `下一轮重点：${input.nextFocus || '待补充'}`,
  ];

  if (latest?.handoffNote.trim()) {
    lines.push('', '最新交接要点：', latest.handoffNote.trim());
  }

  return lines.join('\n');
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            workflowMode: true,
          },
        },
        meetings: {
          orderBy: { date: 'desc' },
          select: {
            id: true,
            title: true,
            date: true,
            roundLabel: true,
            interviewerName: true,
            recommendation: true,
            handoffNote: true,
            enhancedNotes: true,
            userNotes: true,
          },
        },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Collection 不存在' }, { status: 404 });
    }

    if (collection.workspace.workflowMode !== 'interview') {
      return NextResponse.json({ error: '当前工作区未启用面试交接模式' }, { status: 400 });
    }

    if (collection.meetings.length === 0) {
      return NextResponse.json({ error: '还没有面试记录，暂时无法生成交接摘要' }, { status: 400 });
    }

    if (!hasAvailableLlm()) {
      return NextResponse.json({
        content: buildFallbackSummary({
          collectionName: collection.name,
          nextInterviewer: collection.nextInterviewer,
          nextFocus: collection.nextFocus,
          meetings: collection.meetings,
        }),
        provider: 'fallback',
      });
    }

    const rounds = collection.meetings
      .map((meeting, index) => {
        return `#${collection.meetings.length - index}
日期：${meeting.date.toLocaleString('zh-CN')}
轮次：${meeting.roundLabel || '未填写'}
面试官：${meeting.interviewerName || '未填写'}
推荐结论：${meeting.recommendation || 'pending'}
交接备注：${meeting.handoffNote || '（无）'}
AI 总结：${meeting.enhancedNotes || '（无）'}
用户笔记：${meeting.userNotes || '（无）'}`;
      })
      .join('\n\n');

    const { content, provider } = await generateTextWithFallback({
      messages: [
        {
          role: 'system',
          content: `你是一位招聘面试流程中的交接助手。请基于候选人的多轮面试记录，生成一段简洁、可交接的中文摘要。

输出要求：
1. 先概括当前候选人的整体进展与风险。
2. 明确各轮面试最关键的强项、风险点和待验证问题。
3. 单独给出“下一轮建议重点”，供下一位面试官快速接手。
4. 不要使用 Markdown 标题，直接输出自然段和短列表即可。
5. 不捏造会议里没有的信息。`,
        },
        {
          role: 'user',
          content: `工作区：${collection.workspace.name}
候选人：${collection.name}
当前状态：${collection.candidateStatus}
下一位面试官：${collection.nextInterviewer || '待定'}
下一轮重点：${collection.nextFocus || '待补充'}

以下是该候选人的历史面试记录：

${rounds}`,
        },
      ],
      temperature: 0.3,
      maxTokens: 1200,
    });

    return NextResponse.json({ content, provider });
  } catch (error) {
    const message = error instanceof Error ? error.message : '生成交接摘要失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
