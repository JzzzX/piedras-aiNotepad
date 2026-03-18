import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { getAsrStatus } from '@/lib/asr';
import type { AsrVocabularySyncStatus, CustomVocabularyScope } from '@/lib/types';

const SLP_ENDPOINT = 'https://nls-slp.cn-shanghai.aliyuncs.com/';
const SLP_API_VERSION = '2018-11-20';
const SLP_REGION_ID = 'cn-shanghai';
const SYNC_STATE_ID = 'effective';
const DEFAULT_HOTWORD_WEIGHT = 2;
export const ASR_VOCAB_MAX_TERMS = 500;
const HOTWORD_TERM_PATTERN = /^[\p{Script=Han}A-Za-z0-9]+(?: [A-Za-z0-9]+)*$/u;

type SyncResult = {
  vocabularyId: string | null;
  effectiveCount: number;
  status: AsrVocabularySyncStatus;
};

function percentEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~');
}

function hasAliyunAkSk() {
  return Boolean(process.env.ALICLOUD_ACCESS_KEY_ID && process.env.ALICLOUD_ACCESS_KEY_SECRET);
}

function getVocabularyCapabilityMessage() {
  const status = getAsrStatus();

  if (status.mode === 'doubao') {
    return {
      supported: false,
      message: '当前使用豆包 ASR 代理；词汇会保存在本地，后续再接入热词同步。',
    };
  }

  if (status.mode !== 'aliyun') {
    return {
      supported: false,
      message: '当前是浏览器 ASR 模式；词汇会保存在本地，但不会参与识别。',
    };
  }

  if (!status.ready) {
    return {
      supported: false,
      message: '阿里云 ASR 配置未完成；词汇会保存在本地，待配置完成后生效。',
    };
  }

  if (!hasAliyunAkSk()) {
    return {
      supported: false,
      message: '当前仅配置了直连 Token；词汇会保存在本地，但需要 AK/SK 才能自动同步热词表。',
    };
  }

  return {
    supported: true,
    message: '下次开始阿里云转写时，Piedras 会自动同步并应用词汇表。',
  };
}

function normalizeTerm(raw: string) {
  return raw.trim().replace(/\s+/g, ' ');
}

function normalizeTerms(terms: string[]) {
  const deduped = new Map<string, string>();

  for (const raw of terms) {
    const term = normalizeTerm(raw);
    if (!term) continue;
    const key = term.toLocaleLowerCase('en-US');
    if (!deduped.has(key)) {
      deduped.set(key, term);
    }
  }

  return [...deduped.values()];
}

function validateSingleTerm(term: string) {
  if (!HOTWORD_TERM_PATTERN.test(term)) {
    throw new Error(`词条「${term}」包含不支持的字符，请只使用中英文、数字和空格。`);
  }

  const chineseCount = (term.match(/\p{Script=Han}/gu) || []).length;
  const asciiLetters = (term.match(/[A-Za-z]/g) || []).length;
  const englishWordCount = term
    .split(/\s+/)
    .filter((part) => /^[A-Za-z0-9]+$/.test(part)).length;

  if (chineseCount > 0 && chineseCount + asciiLetters > 15) {
    throw new Error(`词条「${term}」过长，请控制在 15 个中英文字符以内。`);
  }

  if (chineseCount === 0 && englishWordCount > 7) {
    throw new Error(`词条「${term}」过长，请控制在 7 个英文单词以内。`);
  }
}

async function getGroupedWorkspaceTerms() {
  const rows = await prisma.customVocabularyTerm.findMany({
    where: { scope: 'workspace' },
    orderBy: [{ createdAt: 'asc' }, { term: 'asc' }],
    select: { workspaceId: true, term: true },
  });

  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.workspaceId) continue;
    const list = grouped.get(row.workspaceId) || [];
    list.push(row.term);
    grouped.set(row.workspaceId, list);
  }
  return grouped;
}

export async function listVocabularyTerms(
  scope: CustomVocabularyScope,
  workspaceId?: string | null
) {
  return prisma.customVocabularyTerm.findMany({
    where: {
      scope,
      ...(scope === 'workspace' ? { workspaceId: workspaceId || undefined } : { workspaceId: null }),
    },
    orderBy: [{ createdAt: 'asc' }, { term: 'asc' }],
  });
}

export async function getEffectiveVocabularyTerms(workspaceId?: string | null) {
  const [globalTerms, workspaceTerms] = await Promise.all([
    listVocabularyTerms('global'),
    workspaceId ? listVocabularyTerms('workspace', workspaceId) : Promise.resolve([]),
  ]);

  return normalizeTerms([
    ...globalTerms.map((item) => item.term),
    ...workspaceTerms.map((item) => item.term),
  ]);
}

export async function replaceVocabularyTerms(
  scope: CustomVocabularyScope,
  inputTerms: string[],
  workspaceId?: string | null
) {
  if (scope === 'workspace' && !workspaceId) {
    throw new Error('缺少 workspaceId，无法保存工作区词表。');
  }

  const terms = normalizeTerms(inputTerms);
  for (const term of terms) {
    validateSingleTerm(term);
  }

  if (terms.length > ASR_VOCAB_MAX_TERMS) {
    throw new Error(`单个词表最多保存 ${ASR_VOCAB_MAX_TERMS} 个词条。`);
  }

  const globalTerms =
    scope === 'global'
      ? terms
      : (await listVocabularyTerms('global')).map((item) => item.term);

  if (scope === 'global') {
    const groupedWorkspaceTerms = await getGroupedWorkspaceTerms();

    if (normalizeTerms(globalTerms).length > ASR_VOCAB_MAX_TERMS) {
      throw new Error(`全局词表最多保存 ${ASR_VOCAB_MAX_TERMS} 个词条。`);
    }

    for (const [candidateWorkspaceId, workspaceTerms] of groupedWorkspaceTerms.entries()) {
      const effective = normalizeTerms([...globalTerms, ...workspaceTerms]);
      if (effective.length > ASR_VOCAB_MAX_TERMS) {
        throw new Error(
          `全局词表保存后会让工作区 ${candidateWorkspaceId} 的有效词条超过 ${ASR_VOCAB_MAX_TERMS} 个，请先减少词条数量。`
        );
      }
    }
  } else {
    const effective = normalizeTerms([...globalTerms, ...terms]);
    if (effective.length > ASR_VOCAB_MAX_TERMS) {
      throw new Error(`当前工作区与全局词表合并后，最多只能有 ${ASR_VOCAB_MAX_TERMS} 个有效词条。`);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.customVocabularyTerm.deleteMany({
      where: {
        scope,
        ...(scope === 'workspace' ? { workspaceId } : { workspaceId: null }),
      },
    });

    if (terms.length > 0) {
      await tx.customVocabularyTerm.createMany({
        data: terms.map((term) => ({
          term,
          scope,
          workspaceId: scope === 'workspace' ? workspaceId : null,
        })),
      });
    }
  });

  return terms;
}

function buildSignedRpcParams(action: string, extraParams: Record<string, string>) {
  const accessKeyId = process.env.ALICLOUD_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALICLOUD_ACCESS_KEY_SECRET;

  if (!accessKeyId || !accessKeySecret) {
    throw new Error('缺少阿里云 AK/SK，无法同步业务热词。');
  }

  const params: Record<string, string> = {
    Action: action,
    AccessKeyId: accessKeyId,
    Format: 'JSON',
    RegionId: SLP_REGION_ID,
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: crypto.randomUUID(),
    SignatureVersion: '1.0',
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    Version: SLP_API_VERSION,
    ...extraParams,
  };

  const canonicalized = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&');

  const stringToSign = `POST&${percentEncode('/')}&${percentEncode(canonicalized)}`;
  const signature = crypto
    .createHmac('sha1', `${accessKeySecret}&`)
    .update(stringToSign)
    .digest('base64');

  return {
    ...params,
    Signature: signature,
  };
}

async function callAliyunVocabularyApi(action: string, params: Record<string, string>) {
  const signedParams = buildSignedRpcParams(action, params);
  const body = new URLSearchParams(signedParams);
  const res = await fetch(SLP_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
    body,
  });
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`${action} 请求失败：${res.status} ${text}`);
  }

  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`${action} 返回了非 JSON 响应`);
  }

  if (typeof data.Message === 'string' && data.Message !== 'success' && data.Message !== 'Success') {
    const code = typeof data.Code === 'string' ? data.Code : action;
    throw new Error(`${code}: ${data.Message}`);
  }

  return data;
}

function buildWordWeights(terms: string[]) {
  return JSON.stringify(
    Object.fromEntries(terms.map((term) => [term, DEFAULT_HOTWORD_WEIGHT])),
    null,
    0
  );
}

async function createRemoteVocabulary(terms: string[]) {
  const data = await callAliyunVocabularyApi('CreateAsrVocab', {
    Name: 'PiedrasEffectiveVocabulary',
    Description: 'Piedras effective custom vocabulary',
    WordWeights: buildWordWeights(terms),
  });

  const vocabularyId = data.VocabId;
  if (typeof vocabularyId !== 'string' || !vocabularyId) {
    throw new Error('CreateAsrVocab 返回缺少 VocabId。');
  }

  return vocabularyId;
}

async function updateRemoteVocabulary(vocabularyId: string, terms: string[]) {
  await callAliyunVocabularyApi('UpdateAsrVocab', {
    VocabId: vocabularyId,
    Name: 'PiedrasEffectiveVocabulary',
    Description: 'Piedras effective custom vocabulary',
    WordWeights: buildWordWeights(terms),
  });
}

function buildContentHash(terms: string[]) {
  return crypto.createHash('sha256').update(terms.join('\n')).digest('hex');
}

export async function getVocabularySyncStatus(
  workspaceId?: string | null
): Promise<{
  effectiveCount: number;
  status: AsrVocabularySyncStatus;
}> {
  const asrStatus = getAsrStatus();
  const capability = getVocabularyCapabilityMessage();
  const [terms, syncState] = await Promise.all([
    getEffectiveVocabularyTerms(workspaceId),
    prisma.asrVocabularySyncState.findUnique({ where: { id: SYNC_STATE_ID } }),
  ]);

  return {
    effectiveCount: terms.length,
    status: {
      supported: capability.supported,
      mode: asrStatus.mode,
      ready: asrStatus.ready,
      remoteVocabularyId: syncState?.remoteVocabularyId ?? null,
      lastSyncedAt: syncState?.lastSyncedAt?.toISOString() ?? null,
      lastError: syncState?.lastError || null,
      message: capability.message,
    },
  };
}

export async function syncEffectiveVocabulary(
  workspaceId?: string | null
): Promise<SyncResult> {
  const { effectiveCount, status } = await getVocabularySyncStatus(workspaceId);
  const terms = await getEffectiveVocabularyTerms(workspaceId);

  if (terms.length === 0) {
    return {
      vocabularyId: null,
      effectiveCount,
      status,
    };
  }

  if (!status.supported) {
    return {
      vocabularyId: null,
      effectiveCount,
      status,
    };
  }

  const contentHash = buildContentHash(terms);
  const syncState = await prisma.asrVocabularySyncState.findUnique({
    where: { id: SYNC_STATE_ID },
  });

  if (syncState?.remoteVocabularyId && syncState.contentHash === contentHash) {
    return {
      vocabularyId: syncState.remoteVocabularyId,
      effectiveCount,
      status: {
        ...status,
        remoteVocabularyId: syncState.remoteVocabularyId,
      },
    };
  }

  try {
    let vocabularyId = syncState?.remoteVocabularyId ?? null;

    if (vocabularyId) {
      try {
        await updateRemoteVocabulary(vocabularyId, terms);
      } catch {
        vocabularyId = await createRemoteVocabulary(terms);
      }
    } else {
      vocabularyId = await createRemoteVocabulary(terms);
    }

    await prisma.asrVocabularySyncState.upsert({
      where: { id: SYNC_STATE_ID },
      update: {
        remoteVocabularyId: vocabularyId,
        contentHash,
        lastSyncedAt: new Date(),
        lastError: '',
      },
      create: {
        id: SYNC_STATE_ID,
        remoteVocabularyId: vocabularyId,
        contentHash,
        lastSyncedAt: new Date(),
        lastError: '',
      },
    });

    return {
      vocabularyId,
      effectiveCount,
      status: {
        ...status,
        remoteVocabularyId: vocabularyId,
        lastSyncedAt: new Date().toISOString(),
        lastError: null,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '业务热词同步失败';

    await prisma.asrVocabularySyncState.upsert({
      where: { id: SYNC_STATE_ID },
      update: { lastError: message },
      create: {
        id: SYNC_STATE_ID,
        lastError: message,
      },
    });

    return {
      vocabularyId: null,
      effectiveCount,
      status: {
        ...status,
        lastError: message,
      },
    };
  }
}
