import type { Template } from './types';

export const TEMPLATE_CATEGORIES = ['复盘', '记录', '分析', '工具'];

export function normalizeTemplateCommand(input: string): string {
  const raw = input.trim().toLowerCase();
  if (!raw) return '';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

export function filterTemplates(templates: Template[], query: string): Template[] {
  const q = query.trim().toLowerCase();
  if (!q) return templates;
  return templates.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.command.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
  );
}

export function isValidTemplateCategory(category: string): boolean {
  return TEMPLATE_CATEGORIES.includes(category);
}
