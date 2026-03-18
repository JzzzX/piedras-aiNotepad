export type AsrMode = 'browser' | 'aliyun' | 'doubao';

export interface AsrStatus {
  mode: AsrMode;
  provider: 'web-speech' | 'aliyun' | 'doubao-proxy';
  ready: boolean;
  missing: string[];
  message: string;
}

export function getAsrMode(): AsrMode {
  const mode = process.env.ASR_MODE?.toLowerCase();
  if (mode === 'aliyun') return 'aliyun';
  if (mode === 'doubao') return 'doubao';
  return 'browser';
}

export function getAsrStatus(): AsrStatus {
  const mode = getAsrMode();

  if (mode === 'browser') {
    return {
      mode,
      provider: 'web-speech',
      ready: true,
      missing: [],
      message: '使用浏览器 Web Speech API（Demo 模式）',
    };
  }

  if (mode === 'doubao') {
    const hasAppId = Boolean(process.env.DOUBAO_ASR_APP_ID);
    const hasAccessToken = Boolean(process.env.DOUBAO_ASR_ACCESS_TOKEN);
    const hasResourceId = Boolean(process.env.DOUBAO_ASR_RESOURCE_ID);
    const hasProxySecret = Boolean(process.env.ASR_PROXY_SESSION_SECRET);

    const missing: string[] = [];
    if (!hasAppId) {
      missing.push('DOUBAO_ASR_APP_ID');
    }
    if (!hasAccessToken) {
      missing.push('DOUBAO_ASR_ACCESS_TOKEN');
    }
    if (!hasResourceId) {
      missing.push('DOUBAO_ASR_RESOURCE_ID');
    }
    if (!hasProxySecret) {
      missing.push('ASR_PROXY_SESSION_SECRET');
    }

    const ready = missing.length == 0;

    return {
      mode,
      provider: 'doubao-proxy',
      ready,
      missing,
      message: ready ? '豆包 ASR 代理已就绪' : '豆包 ASR 配置不完整，暂不可用',
    };
  }

  const hasAppKey = Boolean(process.env.ALICLOUD_ASR_APP_KEY);
  const hasToken = Boolean(process.env.ALICLOUD_ASR_TOKEN);
  const hasAkSk = Boolean(
    process.env.ALICLOUD_ACCESS_KEY_ID && process.env.ALICLOUD_ACCESS_KEY_SECRET
  );

  const missing: string[] = [];
  if (!hasAppKey) {
    missing.push('ALICLOUD_ASR_APP_KEY');
  }
  if (!hasToken && !hasAkSk) {
    missing.push('ALICLOUD_ASR_TOKEN or (ALICLOUD_ACCESS_KEY_ID + ALICLOUD_ACCESS_KEY_SECRET)');
  }

  const ready = missing.length === 0;

  return {
    mode,
    provider: 'aliyun',
    ready,
    missing: [...missing],
    message: ready
      ? hasToken
        ? '已配置阿里云 ASR（直连 Token 模式）'
        : '已配置阿里云 ASR（AK/SK 自动换 Token）'
      : '阿里云 ASR 配置不完整，暂不可用',
  };
}
