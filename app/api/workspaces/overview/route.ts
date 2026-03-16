import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { WorkspaceOverviewItem } from '@/lib/types';

export async function GET() {
  try {
    const workspaces = await prisma.workspace.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: {
          select: { meetings: true },
        },
        meetings: {
          orderBy: { date: 'desc' },
          take: 1,
          select: { date: true },
        },
      },
    });

    const overview: WorkspaceOverviewItem[] = workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      icon: workspace.icon,
      color: workspace.color,
      workflowMode: workspace.workflowMode as 'general' | 'interview',
      sortOrder: workspace.sortOrder,
      meetingCount: workspace._count.meetings,
      latestMeetingAt: workspace.meetings[0]?.date.toISOString() ?? null,
    }));

    return NextResponse.json(overview);
  } catch (error) {
    const message = error instanceof Error ? error.message : '加载工作区总览失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
