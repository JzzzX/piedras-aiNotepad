export type LlmProvider = 'gemini' | 'minimax' | 'openai';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmGenerateInput {
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  preferredProvider?: LlmProvider;
}

export interface LlmGenerateOutput {
  provider: LlmProvider;
  content: string;
}

const DEFAULT_TIMEOUT_MS = 25_000;
const DEFAULT_RETRIES = 1;

function parseProviderList(value?: string): LlmProvider[] {
  if (!value) return [];
  const providers = value
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean) as LlmProvider[];
  return Array.from(new Set(providers)).filter((p) =>
    ['gemini', 'minimax', 'openai'].includes(p)
  );
}

function isProviderConfigured(provider: LlmProvider): boolean {
  if (provider === 'gemini') return Boolean(process.env.GEMINI_API_KEY);
  if (provider === 'minimax')
    return Boolean(process.env.MINIMAX_API_KEY && process.env.MINIMAX_GROUP_ID);
  if (provider === 'openai') return Boolean(process.env.OPENAI_API_KEY);
  return false;
}

export function getConfiguredProviders(): LlmProvider[] {
  const explicit = parseProviderList(process.env.LLM_PROVIDER);
  if (explicit.length > 0) {
    return explicit.filter(isProviderConfigured);
  }

  const preferredOrder: LlmProvider[] = ['gemini', 'minimax', 'openai'];
  return preferredOrder.filter(isProviderConfigured);
}

function resolveProviderOrder(preferredProvider?: LlmProvider): LlmProvider[] {
  const configured = getConfiguredProviders();
  if (configured.length === 0) return [];

  const fallbackProviders = parseProviderList(process.env.LLM_FALLBACKS);

  if (preferredProvider && configured.includes(preferredProvider)) {
    const fallback = fallbackProviders.filter(
      (p) => p !== preferredProvider && configured.includes(p)
    );
    const rest = configured.filter(
      (p) => p !== preferredProvider && !fallback.includes(p)
    );
    return [preferredProvider, ...fallback, ...rest];
  }

  if (fallbackProviders.length === 0) return configured;

  const primary = configured[0];
  const fallback = fallbackProviders.filter(
    (p) => p !== primary && configured.includes(p)
  );
  const rest = configured.filter((p) => p !== primary && !fallback.includes(p));
  return [primary, ...fallback, ...rest];
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`请求超时（>${timeoutMs}ms）`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function callGemini(input: LlmGenerateInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY 未配置');

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite';
  const system = input.messages.find((m) => m.role === 'system')?.content;
  const conversation = input.messages.filter((m) => m.role !== 'system');

  const contents =
    conversation.length > 0
      ? conversation.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }))
      : [{ role: 'user', parts: [{ text: '请根据系统指令开始回答。' }] }];

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: input.temperature ?? 0.5,
      maxOutputTokens: input.maxTokens ?? 4096,
    },
  };

  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API 调用失败: ${errorText}`);
  }

  const data = await res.json();
  const content = (data.candidates?.[0]?.content?.parts || [])
    .map((p: { text?: string }) => p.text || '')
    .join('')
    .trim();

  if (!content) {
    throw new Error('Gemini 返回为空');
  }

  return content;
}

async function callMiniMax(input: LlmGenerateInput): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY;
  const groupId = process.env.MINIMAX_GROUP_ID;
  if (!apiKey || !groupId) {
    throw new Error('MiniMax 凭证未配置');
  }

  const model = process.env.MINIMAX_MODEL || 'MiniMax-Text-01';
  const res = await fetch(
    `https://api.minimax.chat/v1/text/chatcompletion_v2?GroupId=${groupId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: input.messages,
        temperature: input.temperature ?? 0.5,
        max_tokens: input.maxTokens ?? 4096,
      }),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`MiniMax API 调用失败: ${errorText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('MiniMax 返回为空');
  return content;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateTextWithFallback(
  input: LlmGenerateInput
): Promise<LlmGenerateOutput> {
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const retries = Number(process.env.LLM_RETRIES || DEFAULT_RETRIES);
  const providers = resolveProviderOrder(input.preferredProvider);

  if (providers.length === 0) {
    throw new Error('未配置可用 LLM Provider');
  }

  const errors: string[] = [];

  for (const provider of providers) {
    const attempts = Math.max(1, retries + 1);
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const content = await withTimeout(
          provider === 'gemini'
            ? callGemini(input)
            : provider === 'minimax'
              ? callMiniMax(input)
              : Promise.reject(new Error('OpenAI provider 尚未启用')),
          timeoutMs
        );

        return { provider, content };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${provider}#${attempt}: ${message}`);
        if (attempt < attempts) {
          await sleep(300 * attempt);
        }
      }
    }
  }

  throw new Error(`全部 Provider 调用失败：${errors.join(' | ')}`);
}

