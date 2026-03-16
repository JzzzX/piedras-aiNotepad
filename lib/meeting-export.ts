export interface EnhancedNotesSection {
  title: string;
  lines: string[];
}

interface BuildMarkdownInput {
  meetingTitle?: string;
  meetingDate?: number | string;
  enhancedNotes: string;
}

function toZhDate(value?: number | string): string {
  if (value === undefined || value === null || value === '') return '未记录';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未记录';
  return date.toLocaleString('zh-CN', { hour12: false });
}

function normalizeSectionTitle(raw: string) {
  return raw.replace(/^#+\s*/, '').trim();
}

export function parseEnhancedNotesSections(enhancedNotes: string): EnhancedNotesSection[] {
  const lines = enhancedNotes.split(/\r?\n/);
  const sections: EnhancedNotesSection[] = [];
  let currentSection: EnhancedNotesSection | null = null;
  const introLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const heading = line.match(/^##\s+(.+)$/);

    if (heading) {
      currentSection = {
        title: normalizeSectionTitle(heading[1]),
        lines: [],
      };
      sections.push(currentSection);
      continue;
    }

    if (!line.trim()) {
      if (currentSection) {
        currentSection.lines.push('');
      } else if (introLines.length > 0) {
        introLines.push('');
      }
      continue;
    }

    if (currentSection) {
      currentSection.lines.push(line);
    } else {
      introLines.push(line);
    }
  }

  const normalizedSections = sections
    .map((section) => ({
      ...section,
      lines: trimSectionLines(section.lines),
    }))
    .filter((section) => section.lines.length > 0);

  if (normalizedSections.length > 0) {
    return normalizedSections;
  }

  const intro = trimSectionLines(introLines);
  if (intro.length > 0) {
    return [{ title: 'AI 总结', lines: intro }];
  }

  return [];
}

function trimSectionLines(lines: string[]) {
  const trimmed = [...lines];
  while (trimmed[0] === '') trimmed.shift();
  while (trimmed[trimmed.length - 1] === '') trimmed.pop();
  return trimmed;
}

export function buildUnifiedMeetingMarkdown(input: BuildMarkdownInput): string {
  const title = input.meetingTitle?.trim() || '未命名会议';
  const date = toZhDate(input.meetingDate);
  const body = input.enhancedNotes?.trim() || '暂无 AI 增强笔记';

  return `# ${title}

- 会议时间：${date}

${body}
`;
}
