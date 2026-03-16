import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  buildGlobalChatSessionTitle,
  parseStoredGlobalChatFilters,
  serializeGlobalChatFilters,
} from '@/lib/global-chat-ui';
import type { GlobalChatFilters, GlobalChatScope } from '@/lib/types';

function normalizeScope(value: unknown): GlobalChatScope {
  return value === 'all_meetings' ? 'all_meetings' : 'my_notes';
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await prisma.globalChatSession.findUnique({
    where: { id },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          icon: true,
          color: true,
        },
      },
      messages: {
        orderBy: { timestamp: 'asc' },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: '聊天会话不存在' }, { status: 404 });
  }

  return NextResponse.json({
    id: session.id,
    title: session.title,
    scope: session.scope,
    workspaceId: session.workspaceId,
    workspace: session.workspace,
    filters: parseStoredGlobalChatFilters(session.filters),
    updatedAt: session.updatedAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
    messages: session.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      recipeId: message.templateId || undefined,
      templateId: message.templateId || undefined,
    })),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json()) as {
    title?: string;
    scope?: GlobalChatScope;
    workspaceId?: string | null;
    filters?: GlobalChatFilters;
  };

  const scope = body.scope ? normalizeScope(body.scope) : undefined;
  const updated = await prisma.globalChatSession.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: buildGlobalChatSessionTitle(body.title) } : {}),
      ...(scope ? { scope } : {}),
      ...(scope
        ? { workspaceId: scope === 'my_notes' ? body.workspaceId || null : null }
        : {}),
      ...(body.filters ? { filters: serializeGlobalChatFilters(body.filters) } : {}),
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          icon: true,
          color: true,
        },
      },
    },
  });

  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    scope: updated.scope,
    workspaceId: updated.workspaceId,
    workspace: updated.workspace,
    filters: parseStoredGlobalChatFilters(updated.filters),
    updatedAt: updated.updatedAt.toISOString(),
    createdAt: updated.createdAt.toISOString(),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await prisma.globalChatSession.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: '聊天会话不存在' }, { status: 404 });
  }

  await prisma.globalChatSession.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
