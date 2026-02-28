import { Prisma } from '@prisma/client';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { prisma } from '@/lib/db';

const LIST_URI = 'ai-notepad://meetings/list';
const DETAIL_TEMPLATE = 'ai-notepad://meetings/{id}';
const SEARCH_URI = 'ai-notepad://search/meetings';
const SEARCH_TEMPLATE =
  'ai-notepad://search/meetings/{query}/{dateFrom}/{dateTo}/{folderId}/{limit}';

const meetingSummarySelect = {
  id: true,
  title: true,
  date: true,
  status: true,
  duration: true,
  updatedAt: true,
  userNotes: true,
  enhancedNotes: true,
  folderId: true,
  folder: {
    select: {
      id: true,
      name: true,
      color: true,
    },
  },
  segments: {
    select: {
      text: true,
    },
    orderBy: { order: 'asc' as const },
    take: 1,
  },
  _count: {
    select: {
      segments: true,
      chatMessages: true,
    },
  },
} satisfies Prisma.MeetingSelect;

type MeetingSummaryRecord = Prisma.MeetingGetPayload<{
  select: typeof meetingSummarySelect;
}>;

function clipText(input: string, max = 140): string {
  const text = input.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

function safeParseSpeakers(input: string): Record<string, string> {
  try {
    const parsed = JSON.parse(input);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, string>;
    }
  } catch {
    // Ignore invalid speaker JSON and fall back to empty mapping.
  }

  return {};
}

function buildTranscriptText(
  segments: Array<{ speaker: string; text: string; isFinal: boolean }>,
  speakers: Record<string, string>
): string {
  return segments
    .filter((segment) => segment.isFinal)
    .map((segment) => {
      const speakerName = speakers[segment.speaker] || segment.speaker;
      return `[${speakerName}] ${segment.text}`;
    })
    .join('\n');
}

function formatMeetingSummary(meeting: MeetingSummaryRecord) {
  const previewSource =
    meeting.enhancedNotes ||
    meeting.userNotes ||
    meeting.segments[0]?.text ||
    '';

  return {
    id: meeting.id,
    title: meeting.title || '未命名会议',
    date: meeting.date.toISOString(),
    status: meeting.status,
    duration: meeting.duration,
    folderId: meeting.folderId,
    folder: meeting.folder,
    segmentCount: meeting._count.segments,
    chatMessageCount: meeting._count.chatMessages,
    preview: clipText(previewSource),
    updatedAt: meeting.updatedAt.toISOString(),
  };
}

function parseDateBoundary(value?: string | null, endOfDay?: boolean): Date | null {
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

function parseLimit(value?: string | null): number {
  if (!value) return 20;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.min(parsed, 100);
}

function firstTemplateValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] || '';
  }
  return value || '';
}

function decodeTemplateValue(value: string | string[] | undefined): string {
  const raw = firstTemplateValue(value);
  if (!raw || raw === '_') {
    return '';
  }

  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function buildMeetingSearchWhere(filters: {
  query?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  folderId?: string | null;
}): Prisma.MeetingWhereInput {
  const where: Prisma.MeetingWhereInput = {};
  const query = filters.query?.trim();

  if (query) {
    where.OR = [
      { title: { contains: query } },
      { userNotes: { contains: query } },
      { enhancedNotes: { contains: query } },
      {
        segments: {
          some: {
            text: { contains: query },
          },
        },
      },
    ];
  }

  const from = parseDateBoundary(filters.dateFrom, false);
  const to = parseDateBoundary(filters.dateTo, true);
  if (from || to) {
    where.date = {};
    if (from) {
      where.date.gte = from;
    }
    if (to) {
      where.date.lte = to;
    }
  }

  if (filters.folderId) {
    where.folderId = filters.folderId === '__ungrouped' ? null : filters.folderId;
  }

  return where;
}

async function listMeetingSummaries(limit = 50) {
  const meetings = await prisma.meeting.findMany({
    orderBy: { date: 'desc' },
    take: limit,
    select: meetingSummarySelect,
  });

  return meetings.map(formatMeetingSummary);
}

async function getMeetingDetail(meetingId: string) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      folder: true,
      segments: { orderBy: { order: 'asc' } },
      chatMessages: { orderBy: { timestamp: 'asc' } },
    },
  });

  if (!meeting) {
    throw new Error('会议不存在');
  }

  const speakers = safeParseSpeakers(meeting.speakers);
  const transcriptText = buildTranscriptText(meeting.segments, speakers);

  return {
    id: meeting.id,
    title: meeting.title || '未命名会议',
    date: meeting.date.toISOString(),
    status: meeting.status,
    duration: meeting.duration,
    folderId: meeting.folderId,
    folder: meeting.folder,
    userNotes: meeting.userNotes,
    enhancedNotes: meeting.enhancedNotes,
    speakers,
    transcriptText,
    segments: meeting.segments.map((segment) => ({
      id: segment.id,
      speaker: segment.speaker,
      speakerName: speakers[segment.speaker] || segment.speaker,
      text: segment.text,
      startTime: segment.startTime,
      endTime: segment.endTime,
      isFinal: segment.isFinal,
    })),
    chatMessages: meeting.chatMessages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      templateId: message.templateId,
    })),
    createdAt: meeting.createdAt.toISOString(),
    updatedAt: meeting.updatedAt.toISOString(),
  };
}

async function searchMeetings(filters: {
  query?: string;
  dateFrom?: string;
  dateTo?: string;
  folderId?: string;
  limit?: string;
}) {
  const query = filters.query || '';
  const dateFrom = filters.dateFrom || '';
  const dateTo = filters.dateTo || '';
  const folderId = filters.folderId || '';
  const limit = parseLimit(filters.limit);

  const meetings = await prisma.meeting.findMany({
    where: buildMeetingSearchWhere({ query, dateFrom, dateTo, folderId }),
    orderBy: { date: 'desc' },
    take: limit,
    select: meetingSummarySelect,
  });

  return {
    filters: {
      query: query || '',
      dateFrom: dateFrom || '',
      dateTo: dateTo || '',
      folderId: folderId || '',
      limit,
    },
    total: meetings.length,
    results: meetings.map(formatMeetingSummary),
  };
}

function jsonResource(uri: string, payload: unknown) {
  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

export function createMcpServer() {
  const server = new McpServer(
    {
      name: 'ai-notepad-mcp',
      version: '1.0.0',
      title: 'AI Notepad MCP',
    },
    {
      capabilities: {
        resources: {
          listChanged: false,
        },
      },
    }
  );

  server.registerResource(
    'meetings/list',
    LIST_URI,
    {
      title: '会议列表',
      description: '返回最近会议列表及摘要信息',
      mimeType: 'application/json',
    },
    async (uri) => {
      const meetings = await listMeetingSummaries();
      return jsonResource(uri.toString(), {
        type: 'meeting-list',
        total: meetings.length,
        meetings,
      });
    }
  );

  server.registerResource(
    'meetings/search',
    SEARCH_URI,
    {
      title: '会议搜索',
      description: '搜索资源使用说明与 URI 示例',
      mimeType: 'application/json',
    },
    async (uri) => {
      return jsonResource(uri.toString(), {
        type: 'meeting-search-help',
        template: SEARCH_TEMPLATE,
        note: '占位符顺序为 query/dateFrom/dateTo/folderId/limit；缺省值请使用下划线 "_" 占位。',
        examples: [
          'ai-notepad://search/meetings/预算/2026-02-01/2026-02-28/_/10',
          'ai-notepad://search/meetings/_/_/_/__ungrouped/20',
          'ai-notepad://search/meetings/复盘/_/_/_/_',
        ],
      });
    }
  );

  server.registerResource(
    'meetings/search/template',
    new ResourceTemplate(SEARCH_TEMPLATE, {
      list: undefined,
    }),
    {
      title: '会议搜索',
      description: '按关键词、日期和文件夹搜索会议',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const result = await searchMeetings({
        query: decodeTemplateValue(variables.query),
        dateFrom: decodeTemplateValue(variables.dateFrom),
        dateTo: decodeTemplateValue(variables.dateTo),
        folderId: decodeTemplateValue(variables.folderId),
        limit: decodeTemplateValue(variables.limit),
      });
      return jsonResource(uri.toString(), {
        type: 'meeting-search',
        ...result,
      });
    }
  );

  server.registerResource(
    'meetings/{id}',
    new ResourceTemplate(DETAIL_TEMPLATE, {
      list: async () => {
        const meetings = await listMeetingSummaries(100);
        return {
          resources: meetings.map((meeting) => ({
            uri: `ai-notepad://meetings/${meeting.id}`,
            name: meeting.title,
            title: meeting.title,
            description: meeting.preview || '会议详情',
            mimeType: 'application/json',
          })),
        };
      },
    }),
    {
      title: '会议详情',
      description: '读取单个会议详情，包含转写、笔记和聊天记录',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const meetingId = firstTemplateValue(variables.id);
      const detail = await getMeetingDetail(meetingId);
      return jsonResource(uri.toString(), detail);
    }
  );

  return server;
}

export const MCP_RESOURCE_URIS = {
  list: LIST_URI,
  search: SEARCH_URI,
  detailTemplate: DETAIL_TEMPLATE,
  searchTemplate: SEARCH_TEMPLATE,
};
