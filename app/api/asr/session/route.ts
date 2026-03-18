import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAsrStatus } from '@/lib/asr';
import { getAliyunToken } from '@/lib/aliyun-token';
import { syncEffectiveVocabulary } from '@/lib/asr-vocabulary';

interface AsrSessionRequest {
  sampleRate?: number;
  channels?: number;
  includeSystemAudio?: boolean;
  workspaceId?: string;
}

const DOUBAO_PACKET_DURATION_MS = 200;
const DOUBAO_SESSION_LIFETIME_MS = 10 * 60 * 1000;

function toBase64URL(value: Buffer | string) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createProxySessionToken(payload: Record<string, unknown>) {
  const secret = process.env.ASR_PROXY_SESSION_SECRET;

  if (!secret) {
    throw new Error('ASR_PROXY_SESSION_SECRET 未配置');
  }

  const encodedPayload = toBase64URL(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest();

  return `${encodedPayload}.${toBase64URL(signature)}`;
}

function resolveProxyWSURL(req: NextRequest, sessionToken: string) {
  const requestURL = new URL(req.url);
  const protocol = requestURL.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = process.env.ASR_PROXY_PUBLIC_HOST?.trim() || requestURL.hostname;
  const port = process.env.ASR_PROXY_PUBLIC_PORT?.trim() || process.env.ASR_PROXY_PORT?.trim() || '3001';

  return `${protocol}//${host}:${port}/ws/asr?session_token=${encodeURIComponent(sessionToken)}`;
}

function buildDoubaoSession(req: NextRequest, payload: AsrSessionRequest) {
  const now = Date.now();
  const sessionToken = createProxySessionToken({
    provider: 'doubao-proxy',
    sampleRate: payload.sampleRate ?? 16_000,
    channels: payload.channels ?? 1,
    workspaceId: payload.workspaceId ?? null,
    issuedAt: now,
    expiresAt: now + DOUBAO_SESSION_LIFETIME_MS,
  });

  return {
    provider: 'doubao-proxy',
    status: getAsrStatus(),
    request: {
      sampleRate: payload.sampleRate ?? 16_000,
      channels: payload.channels ?? 1,
      includeSystemAudio: false,
    },
    session: {
      wsUrl: resolveProxyWSURL(req, sessionToken),
      sampleRate: payload.sampleRate ?? 16_000,
      channels: payload.channels ?? 1,
      codec: 'pcm_s16le',
      packetDurationMs: DOUBAO_PACKET_DURATION_MS,
    },
    message: '豆包 ASR 代理会话已创建',
  };
}

export async function POST(req: NextRequest) {
  const status = getAsrStatus();
  const payload = (await req.json()) as AsrSessionRequest;

  if (!status.ready) {
    return NextResponse.json(
      {
        error: `${status.provider} 配置不完整`,
        status,
      },
      { status: 400 }
    );
  }

  if (status.mode === 'doubao') {
    try {
      return NextResponse.json(buildDoubaoSession(req, payload));
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : '创建豆包 ASR 会话失败',
        },
        { status: 500 }
      );
    }
  }

  if (status.mode !== 'aliyun') {
    return NextResponse.json(
      {
        error: 'ASR_MODE 不是 aliyun 或 doubao，当前无需创建云端会话',
        status,
      },
      { status: 400 }
    );
  }

  try {
    const directToken = process.env.ALICLOUD_ASR_TOKEN;
    const token = directToken ? { value: directToken, expireTime: null } : await getAliyunToken();
    const appKey = process.env.ALICLOUD_ASR_APP_KEY;
    const vocabulary = await syncEffectiveVocabulary(payload.workspaceId);

    if (!appKey) {
      return NextResponse.json(
        {
          error: 'ALICLOUD_ASR_APP_KEY 未配置',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      provider: 'aliyun',
      status,
      request: {
        sampleRate: payload.sampleRate ?? 16000,
        channels: payload.channels ?? 1,
        includeSystemAudio: payload.includeSystemAudio ?? false,
      },
      session: {
        wsUrl: 'wss://nls-gateway-cn-shanghai.aliyuncs.com/ws/v1',
        token: token.value,
        tokenExpireTime: token.expireTime,
        appKey,
        vocabularyId: vocabulary.vocabularyId,
      },
      message: '阿里云 ASR 会话已创建',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '创建阿里云 ASR 会话失败',
      },
      { status: 500 }
    );
  }
}
