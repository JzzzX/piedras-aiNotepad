export interface StructuredMeetingContent {
  summary: string;
  discussionPoints: string[];
  decisions: string[];
  actionItems: string[];
}

interface BuildMarkdownInput {
  meetingTitle?: string;
  meetingDate?: number | string;
  enhancedNotes: string;
}

type SectionKey = keyof StructuredMeetingContent;

function toZhDate(value?: number | string): string {
  if (value === undefined || value === null || value === '') return '未记录';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未记录';
  return date.toLocaleString('zh-CN', { hour12: false });
}

function normalizeLine(line: string): string {
  return line
    .trim()
    .replace(/^[-*+]\s+/, '')
    .replace(/^\d+[\.\)、]\s+/, '')
    .replace(/^\[\s?\]\s+/, '')
    .trim();
}

function toList(lines: string[]): string[] {
  const list = lines.map(normalizeLine).filter(Boolean);
  return list.length > 0 ? list : ['无'];
}

function resolveSectionKey(title: string): SectionKey | null {
  const normalized = title.trim();
  if (normalized.includes('摘要')) return 'summary';
  if (normalized.includes('讨论')) return 'discussionPoints';
  if (normalized.includes('决策')) return 'decisions';
  if (normalized.includes('行动')) return 'actionItems';
  return null;
}

export function parseStructuredMeetingContent(enhancedNotes: string): StructuredMeetingContent {
  const lines = enhancedNotes.split(/\r?\n/);

  const buckets: Record<SectionKey, string[]> = {
    summary: [],
    discussionPoints: [],
    decisions: [],
    actionItems: [],
  };

  let currentSection: SectionKey | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      currentSection = resolveSectionKey(heading[1]);
      continue;
    }
    if (!currentSection || !line.trim()) continue;
    buckets[currentSection].push(line);
  }

  const summaryText = buckets.summary.map(normalizeLine).filter(Boolean).join(' ');

  return {
    summary: summaryText || '无',
    discussionPoints: toList(buckets.discussionPoints),
    decisions: toList(buckets.decisions),
    actionItems: toList(buckets.actionItems),
  };
}

export function buildUnifiedMeetingMarkdown(input: BuildMarkdownInput): string {
  const structured = parseStructuredMeetingContent(input.enhancedNotes || '');
  const title = input.meetingTitle?.trim() || '未命名会议';
  const date = toZhDate(input.meetingDate);

  const listToMarkdown = (items: string[]) => items.map((i) => `- ${i}`).join('\n');

  return `# ${title}

- 会议时间：${date}

## 会议摘要
${structured.summary}

## 关键讨论点
${listToMarkdown(structured.discussionPoints)}

## 决策事项
${listToMarkdown(structured.decisions)}

## 行动项
${listToMarkdown(structured.actionItems)}
`;
}

