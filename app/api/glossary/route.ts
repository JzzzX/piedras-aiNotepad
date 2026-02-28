import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface GlossaryInput {
  term: string;
  pronunciation?: string;
  category?: string;
}

function normalizeItem(input: GlossaryInput): GlossaryInput | null {
  const term = input.term?.trim();
  if (!term) return null;

  return {
    term,
    pronunciation: input.pronunciation?.trim() || undefined,
    category: input.category?.trim() || '通用',
  };
}

export async function GET() {
  const items = await prisma.glossary.findMany({
    orderBy: [{ category: 'asc' }, { term: 'asc' }],
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { items?: GlossaryInput[] } | GlossaryInput;
    const rawItems: GlossaryInput[] = Array.isArray((body as { items?: GlossaryInput[] }).items)
      ? ((body as { items?: GlossaryInput[] }).items ?? [])
      : [body as GlossaryInput];
    const items = rawItems
      .map((item: GlossaryInput) => normalizeItem(item))
      .filter(Boolean) as GlossaryInput[];

    if (items.length === 0) {
      return NextResponse.json({ error: '至少需要一个有效术语' }, { status: 400 });
    }

    const created = [];
    for (const item of items) {
      const glossary = await prisma.glossary.upsert({
        where: { term: item.term },
        update: {
          pronunciation: item.pronunciation || null,
          category: item.category || '通用',
        },
        create: {
          term: item.term,
          pronunciation: item.pronunciation || null,
          category: item.category || '通用',
        },
      });
      created.push(glossary);
    }

    return NextResponse.json({ items: created });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '术语保存失败' },
      { status: 500 }
    );
  }
}
