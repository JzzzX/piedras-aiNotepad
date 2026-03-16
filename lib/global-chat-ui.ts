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
  accent: 'lime' | 'amber' | 'sky' | 'violet';
  command: string;
  sourceLabel: '系统' | '自定义';
  recipe: Recipe;
}

export const GLOBAL_CHAT_RECIPES: Recipe[] = [
  {
    id: 'recent-todos',
    name: '列出最近待办',
    icon: '✅',
    description: '汇总最近会议里提到的待办、负责人和截止时间。',
    prompt: '请帮我汇总最近会议里提到的待办事项、负责人和截止时间。',
    command: '/todos',
    scope: 'my_notes',
    accent: 'lime',
    category: '快捷分析',
    kind: 'quick',
    isSystem: true,
    sortOrder: 0,
  },
  {
    id: 'weekly-recap',
    name: '生成本周回顾',
    icon: '🗓️',
    description: '概览这周的重要进展、风险和下一步。',
    prompt: '请基于本周的会议，生成一份周回顾，包含进展、风险和下一步。',
    command: '/weekly-recap',
    scope: 'my_notes',
    accent: 'amber',
    category: '快捷分析',
    kind: 'quick',
    isSystem: true,
    sortOrder: 1,
  },
  {
    id: 'calendar-conflicts',
    name: '梳理日程冲突',
    icon: '📅',
    description: '找出最近会议里提到的排期冲突、延期与依赖。',
    prompt: '请帮我梳理最近会议里提到的排期冲突、延期风险和关键依赖。',
    command: '/schedule-conflicts',
    scope: 'all_meetings',
    accent: 'sky',
    category: '快捷分析',
    kind: 'quick',
    isSystem: true,
    sortOrder: 2,
  },
  {
    id: 'blind-spots',
    name: '发现盲点',
    icon: '🧭',
    description: '识别反复出现但尚未解决的问题。',
    prompt: '请帮我识别最近会议中反复出现但仍未解决的问题和潜在盲点。',
    command: '/blind-spots',
    scope: 'all_meetings',
    accent: 'lime',
    category: '快捷分析',
    kind: 'quick',
    isSystem: true,
    sortOrder: 3,
  },
  {
    id: 'decision-scan',
    name: '扫描关键决策',
    icon: '🔍',
    description: '找出最近几场会议里做出的关键决定。',
    prompt: '请帮我整理最近几场会议里做出的关键决策，以及各自依据。',
    command: '/decisions',
    scope: 'all_meetings',
    accent: 'violet',
    category: '快捷分析',
    kind: 'quick',
    isSystem: true,
    sortOrder: 4,
  },
];

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

export function getFeaturedGlobalChatRecipes() {
  return GLOBAL_CHAT_RECIPES.slice(0, 5);
}

export function buildGlobalChatCatalogItems(recipes: Recipe[]): GlobalChatCatalogItem[] {
  return recipes.map((recipe) => ({
    id: recipe.id,
    label: recipe.name,
    description: recipe.description,
    type: 'recipe' as const,
    accent: recipe.accent || 'amber',
    command: recipe.command,
    sourceLabel: recipe.isSystem ? '系统' : '自定义',
    recipe,
  }));
}

export function buildRecipeCommandItems(recipes: Recipe[]) {
  return buildGlobalChatCatalogItems(recipes);
}
