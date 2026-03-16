import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { buildGlobalChatSessionTitle } from '@/lib/global-chat-ui';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json()) as {
    role?: 'user' | 'assistant';
    content?: string;
    timestamp?: number;
    recipeId?: string;
    templateId?: string;
  };

  if (body.role !== 'user' && body.role !== 'assistant') {
    return NextResponse.json({ error: 'role 必须是 user 或 assistant' }, { status: 400 });
  }
  const role = body.role;

  const content = (body.content || '').trim();
  if (!content) {
    return NextResponse.json({ error: '消息内容不能为空' }, { status: 400 });
  }

  const session = await prisma.globalChatSession.findUnique({
    where: { id },
    select: { id: true, title: true, messages: { take: 1 } },
  });

  if (!session) {
    return NextResponse.json({ error: '聊天会话不存在' }, { status: 404 });
  }

  const timestamp = body.timestamp || Date.now();
  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.globalChatMessage.create({
      data: {
        sessionId: id,
        role,
        content,
        timestamp,
        templateId: body.recipeId || body.templateId || null,
      },
    });

    await tx.globalChatSession.update({
      where: { id },
      data: {
        updatedAt: new Date(timestamp),
        ...(role === 'user' && session.messages.length === 0
          ? { title: buildGlobalChatSessionTitle(content) }
          : {}),
      },
    });

    return created;
  });

  return NextResponse.json({
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp,
    recipeId: message.templateId || undefined,
    templateId: message.templateId || undefined,
  });
}
