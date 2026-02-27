import { NextRequest, NextResponse } from 'next/server';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { parseStructuredMeetingContent } from '@/lib/meeting-export';

interface ExportDocxPayload {
  meetingTitle?: string;
  meetingDate?: number | string;
  enhancedNotes?: string;
}

function toDateText(value?: number | string): string {
  if (value === undefined || value === null || value === '') return '未记录';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未记录';
  return date.toLocaleString('zh-CN', { hour12: false });
}

function createHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 120 },
    children: [new TextRun({ text, bold: true, font: 'Microsoft YaHei' })],
  });
}

function createNormal(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, font: 'Microsoft YaHei' })],
  });
}

function createBullets(items: string[]): Paragraph[] {
  return items.map(
    (item) =>
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [new TextRun({ text: item, font: 'Microsoft YaHei' })],
      })
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ExportDocxPayload;
    const meetingTitle = body.meetingTitle?.trim() || '未命名会议';
    const enhancedNotes = body.enhancedNotes?.trim() || '';

    if (!enhancedNotes) {
      return NextResponse.json({ error: '缺少 enhancedNotes，无法导出 Docx' }, { status: 400 });
    }

    const structured = parseStructuredMeetingContent(enhancedNotes);
    const meetingDate = toDateText(body.meetingDate);

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              heading: HeadingLevel.TITLE,
              spacing: { after: 180 },
              children: [new TextRun({ text: meetingTitle, bold: true, font: 'Microsoft YaHei' })],
            }),
            createNormal(`会议时间：${meetingDate}`),
            createHeading('会议摘要'),
            createNormal(structured.summary),
            createHeading('关键讨论点'),
            ...createBullets(structured.discussionPoints),
            createHeading('决策事项'),
            ...createBullets(structured.decisions),
            createHeading('行动项'),
            ...createBullets(structured.actionItems),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const bytes = new Uint8Array(buffer);
    const filename = encodeURIComponent(`${meetingTitle}_${new Date().toLocaleDateString('zh-CN')}.docx`);

    return new NextResponse(bytes, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Docx 导出失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
