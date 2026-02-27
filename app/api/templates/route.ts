import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  ensureSystemTemplates,
  getNextSortOrder,
  normalizeTemplateInput,
  type TemplateMutationInput,
} from '@/lib/template-service';

function toApiError(error: unknown, fallback: string): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return '模板命令已存在，请更换后重试';
  }
  return error instanceof Error ? error.message : fallback;
}

// GET /api/templates — 获取模板列表
export async function GET() {
  await ensureSystemTemplates();

  const templates = await prisma.promptTemplate.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json(templates);
}

// POST /api/templates — 创建用户模板
export async function POST(req: NextRequest) {
  try {
    await ensureSystemTemplates();

    const input = (await req.json()) as TemplateMutationInput;
    const normalized = normalizeTemplateInput(input);

    const template = await prisma.promptTemplate.create({
      data: {
        ...normalized,
        isSystem: false,
        sortOrder: await getNextSortOrder(),
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    const message = toApiError(error, '创建模板失败');
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// PATCH /api/templates — 排序模板
export async function PATCH(req: NextRequest) {
  try {
    await ensureSystemTemplates();

    const { orderedIds } = (await req.json()) as { orderedIds?: string[] };

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: 'orderedIds 不能为空' }, { status: 400 });
    }

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.promptTemplate.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    const templates = await prisma.promptTemplate.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json(templates);
  } catch (error) {
    const message = toApiError(error, '模板排序失败');
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
