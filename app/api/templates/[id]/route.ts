import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  ensureSystemTemplates,
  normalizeTemplateInput,
  type TemplateMutationInput,
} from '@/lib/template-service';
import { normalizeTemplateCommand } from '@/lib/templates';

function toApiError(error: unknown, fallback: string): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return '模板命令已存在，请更换后重试';
  }
  return error instanceof Error ? error.message : fallback;
}

// PUT /api/templates/[id] — 更新模板（仅用户模板）
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSystemTemplates();
    const { id } = await params;

    const existing = await prisma.promptTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: '模板不存在' }, { status: 404 });
    }
    if (existing.isSystem) {
      return NextResponse.json({ error: '系统模板不允许修改' }, { status: 403 });
    }

    const input = (await req.json()) as TemplateMutationInput;
    const normalized = normalizeTemplateInput({
      name: input.name ?? existing.name,
      command: input.command ?? existing.command,
      icon: input.icon ?? existing.icon,
      description: input.description ?? existing.description,
      prompt: input.prompt ?? existing.prompt,
      category: input.category ?? existing.category,
    });

    const template = await prisma.promptTemplate.update({
      where: { id },
      data: normalized,
    });

    return NextResponse.json(template);
  } catch (error) {
    const message = toApiError(error, '更新模板失败');
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE /api/templates/[id] — 删除模板（仅用户模板）
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSystemTemplates();
    const { id } = await params;
    const existing = await prisma.promptTemplate.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: '模板不存在' }, { status: 404 });
    }
    if (existing.isSystem) {
      return NextResponse.json({ error: '系统模板不允许删除' }, { status: 403 });
    }

    await prisma.promptTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = toApiError(error, '删除模板失败');
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// GET /api/templates/[id] — 获取单个模板
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureSystemTemplates();
  const { id } = await params;

  const template = await prisma.promptTemplate.findUnique({ where: { id } });
  if (!template) {
    return NextResponse.json({ error: '模板不存在' }, { status: 404 });
  }

  return NextResponse.json({
    ...template,
    command: normalizeTemplateCommand(template.command),
  });
}
