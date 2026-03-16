import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import {
  createPromptRecipe,
  listRecipes,
  reorderPromptRecipes,
  type RecipeMutationInput,
} from '@/lib/recipe-service';

function toApiError(error: unknown, fallback: string): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return 'Recipe 命令已存在，请更换后重试';
  }
  return error instanceof Error ? error.message : fallback;
}

export async function GET() {
  return NextResponse.json(await listRecipes());
}

export async function POST(req: NextRequest) {
  try {
    const input = (await req.json()) as RecipeMutationInput;
    const recipe = await createPromptRecipe(input);
    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    const message = toApiError(error, '创建 Recipe 失败');
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { orderedIds } = (await req.json()) as { orderedIds?: string[] };
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: 'orderedIds 不能为空' }, { status: 400 });
    }
    return NextResponse.json(await reorderPromptRecipes(orderedIds));
  } catch (error) {
    const message = toApiError(error, 'Recipe 排序失败');
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
