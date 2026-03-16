import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getRecipeById, updatePromptRecipe, deletePromptRecipe, type RecipeMutationInput } from '@/lib/recipe-service';

function toApiError(error: unknown, fallback: string): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return 'Recipe 命令已存在，请更换后重试';
  }
  return error instanceof Error ? error.message : fallback;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const recipe = await getRecipeById(id);
  if (!recipe) {
    return NextResponse.json({ error: 'Recipe 不存在' }, { status: 404 });
  }
  return NextResponse.json(recipe);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const input = (await req.json()) as RecipeMutationInput;
    const recipe = await updatePromptRecipe(id, input);
    return NextResponse.json(recipe);
  } catch (error) {
    const message = toApiError(error, '更新 Recipe 失败');
    const status = message.includes('不存在') ? 404 : message.includes('不允许') ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deletePromptRecipe(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = toApiError(error, '删除 Recipe 失败');
    const status = message.includes('不存在') ? 404 : message.includes('不允许') ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
