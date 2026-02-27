import { NextRequest, NextResponse } from 'next/server';
import { buildUnifiedMeetingMarkdown } from '@/lib/meeting-export';

type WebhookChannel = 'feishu' | 'wecom';

interface WebhookPayload {
  channel?: WebhookChannel;
  meetingTitle?: string;
  meetingDate?: number | string;
  enhancedNotes?: string;
  webhookUrl?: string;
}

function resolveWebhookUrl(channel: WebhookChannel, inputUrl?: string): string {
  if (inputUrl?.trim()) return inputUrl.trim();
  if (channel === 'feishu') return process.env.FEISHU_WEBHOOK_URL || '';
  return process.env.WECOM_WEBHOOK_URL || '';
}

function buildPayload(channel: WebhookChannel, content: string) {
  if (channel === 'feishu') {
    return {
      msg_type: 'text',
      content: { text: content },
    };
  }
  return {
    msgtype: 'markdown',
    markdown: { content },
  };
}

function normalizeChannel(input?: string): WebhookChannel | null {
  if (input === 'feishu' || input === 'wecom') return input;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as WebhookPayload;
    const channel = normalizeChannel(body.channel);
    if (!channel) {
      return NextResponse.json({ error: 'channel 仅支持 feishu / wecom' }, { status: 400 });
    }

    const enhancedNotes = body.enhancedNotes?.trim() || '';
    if (!enhancedNotes) {
      return NextResponse.json({ error: '缺少 enhancedNotes，无法推送' }, { status: 400 });
    }

    const webhookUrl = resolveWebhookUrl(channel, body.webhookUrl);
    if (!webhookUrl) {
      const envHint = channel === 'feishu' ? 'FEISHU_WEBHOOK_URL' : 'WECOM_WEBHOOK_URL';
      return NextResponse.json(
        { error: `未配置 webhook 地址，请设置 ${envHint}` },
        { status: 400 }
      );
    }

    const markdown = buildUnifiedMeetingMarkdown({
      meetingTitle: body.meetingTitle,
      meetingDate: body.meetingDate,
      enhancedNotes,
    });

    const payload = buildPayload(channel, markdown);
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseText = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: `Webhook 推送失败：HTTP ${res.status}`, detail: responseText },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      channel,
      response: responseText,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook 推送失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

