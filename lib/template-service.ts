import { prisma } from './db';
import { SYSTEM_RECIPE_PRESETS } from './template-presets';
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
  starterQuestion?: string;
  surfaces?: string;
  category?: string;
}

export interface NormalizedTemplateInput {
  name: string;
  command: string;
  icon: string;
  description: string;
  prompt: string;
  starterQuestion: string;
  surfaces: string;
  category: string;
}

export function normalizeTemplateInput(input: TemplateMutationInput): NormalizedTemplateInput {
  const name = input.name?.trim() || '';
  const command = normalizeTemplateCommand(input.command || '');
  const prompt = input.prompt?.trim() || '';
  const description = input.description?.trim() || '';
  const icon = input.icon?.trim() || '📝';
  const starterQuestion = input.starterQuestion?.trim() || '';
  const surfaces = (input.surfaces?.trim() || 'both') as 'chat' | 'meeting' | 'both';
  const category = input.category?.trim() || '记录';

  if (!name) {
    throw new Error('Recipe 名称不能为空');
  }
  if (!command) {
    throw new Error('Recipe 命令不能为空');
  }
  if (!prompt) {
    throw new Error('Recipe 提示词不能为空');
  }
  if (!description) {
    throw new Error('Recipe 描述不能为空');
  }
  if (!isValidTemplateCategory(category)) {
    throw new Error('Recipe 分类不合法');
  }
  if (!['chat', 'meeting', 'both'].includes(surfaces)) {
    throw new Error('Recipe 适用入口不合法');
  }

  return {
    name,
    command,
    icon,
    description,
    prompt,
    starterQuestion,
    surfaces,
    category,
  };
}

export async function ensureSystemTemplates() {
  if (globalForTemplateSeed.promptTemplatesSeeded) return;

  await prisma.$transaction(
    SYSTEM_RECIPE_PRESETS.map((template) =>
      prisma.promptTemplate.upsert({
        where: { id: template.id },
        create: {
          id: template.id,
          name: template.name,
          command: normalizeTemplateCommand(template.command),
          icon: template.icon,
          description: template.description,
          prompt: template.prompt,
          starterQuestion: template.starterQuestion || '',
          surfaces: template.surfaces || 'both',
          category: template.category,
          isSystem: true,
          sortOrder: template.sortOrder || 0,
        },
        update: {
          name: template.name,
          command: normalizeTemplateCommand(template.command),
          icon: template.icon,
          description: template.description,
          prompt: template.prompt,
          starterQuestion: template.starterQuestion || '',
          surfaces: template.surfaces || 'both',
          category: template.category,
          isSystem: true,
          sortOrder: template.sortOrder || 0,
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
