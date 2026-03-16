import { NextRequest, NextResponse } from 'next/server';
import { retrieveGlobalMeetingContext, type GlobalChatFilters } from '@/lib/global-chat';

export async function POST(req: NextRequest) {
  try {
    const { query, filters } = await req.json();
    const q = (query || '').trim();

    if (!q) {
      return NextResponse.json({ error: '搜索内容不能为空' }, { status: 400 });
    }

    const result = await retrieveGlobalMeetingContext(q, (filters || {}) as GlobalChatFilters);

    return NextResponse.json({
      sources: result.sources.map((s) => ({
        type: s.type,
        meetingId: s.meetingId,
        assetId: s.assetId,
        title: s.title,
        date: s.date,
        score: s.score,
        snippets: s.snippets,
      })),
    });
  } catch (error) {
    console.error('Knowledge search error:', error);
    const message = error instanceof Error ? error.message : '搜索失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
