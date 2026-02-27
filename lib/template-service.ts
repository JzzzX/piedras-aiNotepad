import { prisma } from './db';
import { SYSTEM_TEMPLATE_PRESETS } from './template-presets';
import { isValidTemplateCategory, normalizeTemplateCommand } from './templates';

const globalForTemplateSeed = globalThis as unknown as {
  promptTemplatesSeeded?: boolean;
};

export interface TemplateMutationInput {
  name?: string;
  command?: string;
  icon?: string;
  description?: string;
  prompt?: string;
  category?: string;
}

export interface NormalizedTemplateInput {
  name: string;
  command: string;
  icon: string;
  description: string;
  prompt: string;
  category: string;
}

export function normalizeTemplateInput(input: TemplateMutationInput): NormalizedTemplateInput {
  const name = input.name?.trim() || '';
  const command = normalizeTemplateCommand(input.command || '');
  const prompt = input.prompt?.trim() || '';
  const description = input.description?.trim() || '';
  const icon = input.icon?.trim() || '📝';
  const category = input.category?.trim() || '记录';

  if (!name) {
    throw new Error('模板名称不能为空');
  }
  if (!command) {
    throw new Error('模板命令不能为空');
  }
  if (!prompt) {
    throw new Error('模板提示词不能为空');
  }
  if (!description) {
    throw new Error('模板描述不能为空');
  }
  if (!isValidTemplateCategory(category)) {
    throw new Error('模板分类不合法');
  }

  return {
    name,
    command,
    icon,
    description,
    prompt,
    category,
  };
}

export async function ensureSystemTemplates() {
  if (globalForTemplateSeed.promptTemplatesSeeded) return;

  await prisma.$transaction(
    SYSTEM_TEMPLATE_PRESETS.map((template) =>
      prisma.promptTemplate.upsert({
        where: { id: template.id },
        create: {
          id: template.id,
          name: template.name,
          command: normalizeTemplateCommand(template.command),
          icon: template.icon,
          description: template.description,
          prompt: template.prompt,
          category: template.category,
          isSystem: true,
          sortOrder: template.sortOrder || 0,
        },
        update: {
          isSystem: true,
        },
      })
    )
  );

  globalForTemplateSeed.promptTemplatesSeeded = true;
}

export async function getNextSortOrder(): Promise<number> {
  const last = await prisma.promptTemplate.findFirst({
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });
  return (last?.sortOrder ?? -1) + 1;
}
