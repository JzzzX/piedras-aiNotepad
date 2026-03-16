import type { GlobalChatFilters, GlobalChatScope, Recipe } from './types';

export const GLOBAL_CHAT_DRAFT_KEY = 'piedras_globalChatDraft';

export interface GlobalChatDraft {
  displayText: string;
  question: string;
  recipePrompt?: string;
  recipeId?: string;
  scope: GlobalChatScope;
  workspaceId?: string | null;
  filters: GlobalChatFilters;
}

export interface GlobalChatCatalogItem {
  id: string;
  label: string;
  description: string;
  type: 'recipe';
  accent: 'system' | 'custom';
  command: string;
  sourceLabel: '系统' | '自定义';
  recipe: Recipe;
}

export function buildGlobalChatSessionTitle(input: string) {
  const normalized = input.replace(/\s+/g, ' ').trim();
  if (!normalized) return '未命名对话';
  return normalized.length > 36 ? `${normalized.slice(0, 36)}...` : normalized;
}

export function parseStoredGlobalChatFilters(raw: string | null | undefined): GlobalChatFilters {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as GlobalChatFilters;
    return {
      dateFrom: parsed.dateFrom || '',
      dateTo: parsed.dateTo || '',
      collectionId: parsed.collectionId || '',
    };
  } catch {
    return {};
  }
}

export function serializeGlobalChatFilters(filters: GlobalChatFilters) {
  return JSON.stringify({
    dateFrom: filters.dateFrom || '',
    dateTo: filters.dateTo || '',
    collectionId: filters.collectionId || '',
  });
}

export function buildGlobalChatRetrievalFilters(input: {
  scope: GlobalChatScope;
  workspaceId?: string | null;
  filters?: GlobalChatFilters;
}) {
  return {
    ...(input.filters || {}),
    ...(input.scope === 'my_notes' && input.workspaceId
      ? { workspaceId: input.workspaceId }
      : {}),
  };
}

export function getGlobalChatScopeLabel(scope: GlobalChatScope, workspaceName?: string | null) {
  if (scope === 'all_meetings') return '全部工作区';
  return workspaceName?.trim() || '指定工作区';
}

export function resolveGlobalChatScope(workspaceId?: string | null): GlobalChatScope {
  return workspaceId ? 'my_notes' : 'all_meetings';
}

export function getFeaturedGlobalChatRecipes(recipes: Recipe[]) {
  return recipes
    .filter((recipe) => recipe.surfaces === 'chat' || recipe.surfaces === 'both')
    .filter((recipe) => recipe.isSystem)
    .slice(0, 5);
}

export function buildGlobalChatCatalogItems(recipes: Recipe[]): GlobalChatCatalogItem[] {
  return recipes
    .filter((recipe) => recipe.surfaces === 'chat' || recipe.surfaces === 'both')
    .map((recipe) => ({
    id: recipe.id,
    label: recipe.name,
    description: recipe.description,
    type: 'recipe' as const,
    accent: recipe.isSystem ? 'system' : 'custom',
    command: recipe.command,
    sourceLabel: recipe.isSystem ? '系统' : '自定义',
    recipe,
  }));
}

export function buildRecipeCommandItems(recipes: Recipe[]) {
  return buildGlobalChatCatalogItems(recipes);
}
