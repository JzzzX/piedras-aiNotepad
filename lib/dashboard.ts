import { prisma } from './db';
import type { DashboardActionItem, DashboardResponse } from './types';

function getGreetingByHour(hour: number) {
  if (hour < 6) return '夜深了';
  if (hour < 11) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

function buildDateLabel(date: Date) {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

function normalizeBulletLine(line: string) {
  return line
    .replace(/^\s*[-*+]\s*/, '')
    .replace(/^\s*\d+[.)、]\s*/, '')
    .replace(/^\s*\[[ xX]?\]\s*/, '')
    .trim();
}

function cleanInlineMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .trim();
}

function extractOwner(text: string) {
  const match = text.match(/负责人[:：]\s*([^，。；;（）()]+)/);
  return match?.[1]?.trim() || null;
}

function extractDueDate(text: string) {
  const match = text.match(/(?:截止(?:日期|时间)?|Due)[:：]\s*([^，。；;（）()]+)/i);
  return match?.[1]?.trim() || null;
}

function extractActionSection(enhancedNotes: string) {
  const match = enhancedNotes.match(/##\s*行动项\s*([\s\S]*?)(?:\n##\s*|$)/);
  if (!match?.[1]) return [];

  return match[1]
    .split(/\r?\n/)
    .map((line) => cleanInlineMarkdown(normalizeBulletLine(line)))
    .filter(Boolean)
    .filter((line) => !/^无明确行动项/.test(line));
}

function parseActionItemsFromMeeting(meeting: {
  id: string;
  title: string;
  date: Date;
  workspaceId: string;
  workspace: { id: string; name: string; icon: string; color: string } | null;
  enhancedNotes: string;
}): DashboardActionItem[] {
  return extractActionSection(meeting.enhancedNotes).map((text, index) => ({
    id: `${meeting.id}:${index}`,
    text,
    owner: extractOwner(text),
    dueDate: extractDueDate(text),
    meetingId: meeting.id,
    meetingTitle: meeting.title || '无标题记录',
    meetingDate: meeting.date.toISOString(),
    workspaceId: meeting.workspaceId,
    workspace: meeting.workspace,
  }));
}

export async function getDashboardData(): Promise<DashboardResponse> {
  const now = new Date();
  const recentMeetings = await prisma.meeting.findMany({
    orderBy: { date: 'desc' },
    take: 18,
    select: {
      id: true,
      title: true,
      date: true,
      duration: true,
      folderId: true,
      workspaceId: true,
      folder: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      workspace: {
        select: {
          id: true,
          name: true,
          icon: true,
          color: true,
        },
      },
      _count: {
        select: {
          segments: true,
          chatMessages: true,
        },
      },
      enhancedNotes: true,
    },
  });

  const recentActionItems = recentMeetings
    .flatMap((meeting) =>
      parseActionItemsFromMeeting({
        id: meeting.id,
        title: meeting.title,
        date: meeting.date,
        workspaceId: meeting.workspaceId,
        workspace: meeting.workspace,
        enhancedNotes: meeting.enhancedNotes,
      })
    )
    .slice(0, 12);

  return {
    greeting: getGreetingByHour(now.getHours()),
    dateLabel: buildDateLabel(now),
    recentActionItems,
    recentMeetings: recentMeetings.map((meeting) => ({
      id: meeting.id,
      title: meeting.title,
      date: meeting.date.toISOString(),
      duration: meeting.duration,
      folderId: meeting.folderId,
      folder: meeting.folder,
      workspaceId: meeting.workspaceId,
      workspace: meeting.workspace,
      _count: meeting._count,
    })),
  };
}
