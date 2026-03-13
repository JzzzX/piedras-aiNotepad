import { NextRequest, NextResponse } from 'next/server';
import {
  getVocabularySyncStatus,
  listVocabularyTerms,
  replaceVocabularyTerms,
} from '@/lib/asr-vocabulary';
import type { CustomVocabularyScope } from '@/lib/types';

function parseScope(value: string | null): CustomVocabularyScope | null {
  if (value === 'global' || value === 'workspace') {
    return value;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scope = parseScope(searchParams.get('scope'));
  const workspaceId = searchParams.get('workspaceId');

  if (!scope) {
    return NextResponse.json({ error: 'scope 必须是 global 或 workspace' }, { status: 400 });
  }

  if (scope === 'workspace' && !workspaceId) {
    return NextResponse.json({ error: 'workspace scope 缺少 workspaceId' }, { status: 400 });
  }

  try {
    const [rows, sync] = await Promise.all([
      listVocabularyTerms(scope, workspaceId),
      getVocabularySyncStatus(workspaceId),
    ]);

    return NextResponse.json({
      scope,
      workspaceId: workspaceId || null,
      terms: rows.map((row) => row.term),
      effectiveCount: sync.effectiveCount,
      syncStatus: sync.status,
      limits: {
        maxTerms: 500,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '加载自定义词汇失败',
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as {
    scope?: CustomVocabularyScope;
    workspaceId?: string;
    terms?: string[];
  };

  if (body.scope !== 'global' && body.scope !== 'workspace') {
    return NextResponse.json({ error: 'scope 必须是 global 或 workspace' }, { status: 400 });
  }

  if (body.scope === 'workspace' && !body.workspaceId) {
    return NextResponse.json({ error: 'workspace scope 缺少 workspaceId' }, { status: 400 });
  }

  if (!Array.isArray(body.terms)) {
    return NextResponse.json({ error: 'terms 必须是字符串数组' }, { status: 400 });
  }

  try {
    const terms = await replaceVocabularyTerms(body.scope, body.terms, body.workspaceId);
    const sync = await getVocabularySyncStatus(body.workspaceId);

    return NextResponse.json({
      scope: body.scope,
      workspaceId: body.workspaceId || null,
      terms,
      effectiveCount: sync.effectiveCount,
      syncStatus: sync.status,
      message: '自定义词汇已保存，下次阿里云转写开始时会自动同步。',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '保存自定义词汇失败',
      },
      { status: 400 }
    );
  }
}
