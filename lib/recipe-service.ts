import { prisma } from './db';
import { GLOBAL_CHAT_RECIPES } from './global-chat-ui';
import {
  ensureSystemTemplates,
  getNextSortOrder,
  normalizeTemplateInput,
  type TemplateMutationInput,
} from './template-service';
import type { Recipe } from './types';

export type RecipeMutationInput = TemplateMutationInput;

function mapStoredRecipe(
  recipe: {
    id: string;
    name: string;
    command: string;
    icon: string;
    description: string;
    prompt: string;
    category: string;
    isSystem: boolean;
    sortOrder: number;
  }
): Recipe {
  return {
    id: recipe.id,
    name: recipe.name,
    command: recipe.command,
    icon: recipe.icon,
    description: recipe.description,
    prompt: recipe.prompt,
    category: recipe.category,
    kind: 'prompt',
    isSystem: recipe.isSystem,
    sortOrder: recipe.sortOrder,
  };
}

export async function listRecipes(): Promise<Recipe[]> {
  await ensureSystemTemplates();

  const storedRecipes = await prisma.promptTemplate.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  return [...GLOBAL_CHAT_RECIPES, ...storedRecipes.map(mapStoredRecipe)];
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  if (GLOBAL_CHAT_RECIPES.some((recipe) => recipe.id === id)) {
    return GLOBAL_CHAT_RECIPES.find((recipe) => recipe.id === id) || null;
  }

  await ensureSystemTemplates();
  const storedRecipe = await prisma.promptTemplate.findUnique({ where: { id } });
  return storedRecipe ? mapStoredRecipe(storedRecipe) : null;
}

export async function createPromptRecipe(input: RecipeMutationInput): Promise<Recipe> {
  await ensureSystemTemplates();
  const normalized = normalizeTemplateInput(input);
  const storedRecipe = await prisma.promptTemplate.create({
    data: {
      ...normalized,
      isSystem: false,
      sortOrder: await getNextSortOrder(),
    },
  });

  return mapStoredRecipe(storedRecipe);
}

export async function updatePromptRecipe(id: string, input: RecipeMutationInput): Promise<Recipe> {
  await ensureSystemTemplates();
  const existing = await prisma.promptTemplate.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Recipe 不存在');
  }
  if (existing.isSystem) {
    throw new Error('系统 Recipe 不允许修改');
  }

  const normalized = normalizeTemplateInput({
    name: input.name ?? existing.name,
    command: input.command ?? existing.command,
    icon: input.icon ?? existing.icon,
    description: input.description ?? existing.description,
    prompt: input.prompt ?? existing.prompt,
    category: input.category ?? existing.category,
  });

  const storedRecipe = await prisma.promptTemplate.update({
    where: { id },
    data: normalized,
  });
  return mapStoredRecipe(storedRecipe);
}

export async function deletePromptRecipe(id: string) {
  await ensureSystemTemplates();
  const existing = await prisma.promptTemplate.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Recipe 不存在');
  }
  if (existing.isSystem) {
    throw new Error('系统 Recipe 不允许删除');
  }

  await prisma.promptTemplate.delete({ where: { id } });
}

export async function reorderPromptRecipes(orderedIds: string[]) {
  await ensureSystemTemplates();
  const builtInIds = new Set(GLOBAL_CHAT_RECIPES.map((recipe) => recipe.id));
  const storedOrderedIds = orderedIds.filter((id) => !builtInIds.has(id));

  if (storedOrderedIds.length === 0) {
    return listRecipes();
  }

  await prisma.$transaction(
    storedOrderedIds.map((id, index) =>
      prisma.promptTemplate.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  return listRecipes();
}
