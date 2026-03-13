import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

interface SegmentPayload {
  id: string;
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  isFinal: boolean;
}

interface ChatMessagePayload {
  id: string;
  role: string;
  content: string;
  timestamp: number;
  templateId?: string;
}

// GET /api/meetings — 获取会议列表
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query')?.trim() || '';
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const folderId = searchParams.get('folderId');
  const workspaceId = searchParams.get('workspaceId');

  const where: Prisma.MeetingWhereInput = {};

  if (workspaceId) {
    where.workspaceId = workspaceId;
  }

  if (query) {
    where.OR = [
      { title: { contains: query } },
      { enhancedNotes: { contains: query } },
    ];
  }

  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) {
      where.date.gte = new Date(`${dateFrom}T00:00:00`);
    }
    if (dateTo) {
      where.date.lte = new Date(`${dateTo}T23:59:59.999`);
    }
  }

  if (folderId) {
    where.folderId = folderId === '__ungrouped' ? null : folderId;
  }

  const meetings = await prisma.meeting.findMany({
    where,
    orderBy: { date: 'desc' },
    select: {
      id: true,
      title: true,
      date: true,
      status: true,
      duration: true,
      createdAt: true,
      folderId: true,
      workspaceId: true,
      folder: true,
      workspace: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      _count: { select: { segments: true, chatMessages: true } },
    },
  });
  return NextResponse.json(meetings);
}

// POST /api/meetings — 创建或保存会议
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    id,
    title,
    date,
    status,
    duration,
    folderId,
    workspaceId,
    userNotes,
    enhancedNotes,
    speakers,
    segments,
    chatMessages,
  } = body;

  const normalizedDate = date ? new Date(date) : new Date();
  const normalizedSegments = (segments || []) as SegmentPayload[];
  const normalizedChatMessages = (chatMessages || []) as ChatMessagePayload[];

  // 每次保存都以最新状态覆盖 segments/chat，避免增量保存时出现旧数据
  const meeting = await prisma.$transaction(async (tx) => {
    const upsertedMeeting = await tx.meeting.upsert({
      where: { id: id || '' },
      create: {
        id: id || undefined,
        title: title || '',
        date: normalizedDate,
        status: status || 'ended',
        duration: duration || 0,
        folderId: folderId || null,
        workspaceId: workspaceId,
        userNotes: userNotes || '',
        enhancedNotes: enhancedNotes || '',
        speakers: JSON.stringify(speakers || {}),
      },
      update: {
        title: title || '',
        date: normalizedDate,
        status: status || 'ended',
        duration: duration || 0,
        folderId: folderId || null,
        workspaceId: workspaceId,
        userNotes: userNotes || '',
        enhancedNotes: enhancedNotes || '',
        speakers: JSON.stringify(speakers || {}),
      },
    });

    await tx.transcriptSegment.deleteMany({
      where: { meetingId: upsertedMeeting.id },
    });

    if (normalizedSegments.length > 0) {
      await tx.transcriptSegment.createMany({
        data: normalizedSegments.map((s, i) => ({
          id: s.id,
          meetingId: upsertedMeeting.id,
          speaker: s.speaker,
          text: s.text,
          startTime: s.startTime,
          endTime: s.endTime,
          isFinal: s.isFinal,
          order: i,
        })),
      });
    }

    await tx.chatMessage.deleteMany({
      where: { meetingId: upsertedMeeting.id },
    });

    if (normalizedChatMessages.length > 0) {
      await tx.chatMessage.createMany({
        data: normalizedChatMessages.map((m) => ({
          id: m.id,
          meetingId: upsertedMeeting.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          templateId: m.templateId || null,
        })),
      });
    }

    return tx.meeting.findUnique({
      where: { id: upsertedMeeting.id },
      include: {
        folder: true,
        segments: { orderBy: { order: 'asc' } },
        chatMessages: { orderBy: { timestamp: 'asc' } },
      },
    });
  });

  return NextResponse.json(meeting);
}
