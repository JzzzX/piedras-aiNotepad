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

export async function POST(req: NextRequest) {
  const status = getAsrStatus();
  const payload = (await req.json()) as AsrSessionRequest;

  if (status.mode !== 'aliyun') {
    return NextResponse.json(
      {
        error: 'ASR_MODE 不是 aliyun，当前无需创建云端会话',
        status,
      },
      { status: 400 }
    );
  }

  if (!status.ready) {
    return NextResponse.json(
      {
        error: '阿里云 ASR 配置不完整',
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
