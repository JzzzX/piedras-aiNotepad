import { Prisma } from '@prisma/client';
import { prisma } from './db';

export interface GlobalChatFilters {
  titleKeyword?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface GlobalMeetingSource {
  ref: string;
  meetingId: string;
  title: string;
  date: string;
  score: number;
  snippets: string[];
}

export interface GlobalRetrievalResult {
  sources: GlobalMeetingSource[];
  context: string;
}

const STOP_WORDS = new Set([
  '我们',
  '你们',
  '这个',
  '那个',
  '哪些',
  '什么',
  '一下',
  '关于',
  '请问',
  '帮我',
  '会议',
  '总结',
  '分析',
  '问题',
  '情况',
]);

function splitKeywords(question: string): string[] {
  const matched = question
    .toLowerCase()
    .match(/[a-z0-9]{2,}|[\u4e00-\u9fa5]{2,}/g);

  if (!matched) return [];
  return Array.from(
    new Set(
      matched
        .map((w) => w.trim())
        .filter((w) => w.length >= 2 && !STOP_WORDS.has(w))
    )
  );
}

function parseDateBoundary(value?: string, endOfDay?: boolean): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
}

function compactText(input: string, max = 220): string {
  const text = input.replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

function pickSnippets(
  title: string,
  userNotes: string,
  enhancedNotes: string,
  segmentsText: string,
  keywords: string[]
): string[] {
  const lines = [
    ...enhancedNotes.split(/\r?\n/),
    ...userNotes.split(/\r?\n/),
    ...segmentsText.split(/[。！？\n]/),
  ]
    .map((line) => line.trim())
    .filter(Boolean);

  const matched = lines
    .filter((line) => keywords.some((kw) => line.includes(kw)))
    .slice(0, 3)
    .map((line) => compactText(line));

  if (matched.length > 0) return matched;

  const fallback = [
    compactText(title, 80),
    compactText(enhancedNotes, 180),
    compactText(userNotes, 180),
    compactText(segmentsText, 180),
  ].filter((v) => v && v !== '...');

  return fallback.slice(0, 2);
}

function scoreMeeting(
  title: string,
  userNotes: string,
  enhancedNotes: string,
  segmentsText: string,
  keywords: string[]
): number {
  if (keywords.length === 0) {
    return Number(Boolean(enhancedNotes || userNotes || segmentsText));
  }

  const titleText = title.toLowerCase();
  const notesText = userNotes.toLowerCase();
  const enhancedText = enhancedNotes.toLowerCase();
  const transcriptText = segmentsText.toLowerCase();

  let score = 0;
  for (const kw of keywords) {
    if (titleText.includes(kw)) score += 6;
    if (enhancedText.includes(kw)) score += 4;
    if (notesText.includes(kw)) score += 3;
    if (transcriptText.includes(kw)) score += 2;
  }

  return score;
}

function buildWhere(filters: GlobalChatFilters): Prisma.MeetingWhereInput {
  const where: Prisma.MeetingWhereInput = {};

  const titleKeyword = filters.titleKeyword?.trim();
  if (titleKeyword) {
    where.title = { contains: titleKeyword };
  }

  const from = parseDateBoundary(filters.dateFrom, false);
  const to = parseDateBoundary(filters.dateTo, true);
  if (from || to) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (from) dateFilter.gte = from;
    if (to) dateFilter.lte = to;
    where.date = dateFilter;
  }

  return where;
}

export async function retrieveGlobalMeetingContext(
  question: string,
  filters: GlobalChatFilters
): Promise<GlobalRetrievalResult> {
  const keywords = splitKeywords(question);
  const where = buildWhere(filters);

  const meetings = await prisma.meeting.findMany({
    where,
    orderBy: { date: 'desc' },
    take: 80,
    select: {
      id: true,
      title: true,
      date: true,
      userNotes: true,
      enhancedNotes: true,
      segments: {
        orderBy: { order: 'asc' },
        select: { text: true, isFinal: true },
      },
    },
  });

  const ranked = meetings
    .map((meeting) => {
      const title = (meeting.title || '').trim() || '未命名会议';
      const userNotes = (meeting.userNotes || '').trim();
      const enhancedNotes = (meeting.enhancedNotes || '').trim();
      const segmentsText = meeting.segments
        .filter((s) => s.isFinal)
        .map((s) => s.text)
        .join(' ');

      const score = scoreMeeting(title, userNotes, enhancedNotes, segmentsText, keywords);
      const snippets = pickSnippets(title, userNotes, enhancedNotes, segmentsText, keywords);

      return {
        meetingId: meeting.id,
        title,
        date: meeting.date.toISOString(),
        score,
        snippets,
      };
    })
    .sort((a, b) => b.score - a.score || b.date.localeCompare(a.date));

  const selected = ranked.filter((m) => m.score > 0).slice(0, 5);
  const fallback = ranked.slice(0, 3);
  const used = selected.length > 0 ? selected : fallback;

  const sources: GlobalMeetingSource[] = used.map((m, idx) => ({
    ref: `M${idx + 1}`,
    ...m,
  }));

  const context = sources
    .map((s) => {
      const dateText = new Date(s.date).toLocaleString('zh-CN', { hour12: false });
      const snippetText = s.snippets.map((line) => `- ${line}`).join('\n');
      return `[${s.ref}] ${s.title}（${dateText}）\n${snippetText}`;
    })
    .join('\n\n');

  return { sources, context };
}
