import { prisma } from './db';

export async function getGlossaryTerms() {
  return prisma.glossary.findMany({
    orderBy: [{ category: 'asc' }, { term: 'asc' }],
  });
}

export async function buildGlossaryPromptBlock(): Promise<string> {
  const items = await getGlossaryTerms();
  if (items.length === 0) {
    return '';
  }

  const lines = items.map((item) => {
    const parts = [item.term];
    if (item.pronunciation) {
      parts.push(`读音：${item.pronunciation}`);
    }
    if (item.category) {
      parts.push(`分类：${item.category}`);
    }
    return `- ${parts.join('｜')}`;
  });

  return `以下是本项目的术语/热词表，请在回答、总结和标题生成时优先保留这些术语的原始写法，不要随意改写：\n${lines.join('\n')}`;
}
