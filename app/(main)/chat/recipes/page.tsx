'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, Search, Sparkles } from 'lucide-react';
import {
  GLOBAL_CHAT_DRAFT_KEY,
  buildGlobalChatCatalogItems,
  resolveGlobalChatScope,
  type GlobalChatDraft,
} from '@/lib/global-chat-ui';
import { useMeetingStore } from '@/lib/store';
import type { Recipe } from '@/lib/types';

function accentClass(accent: 'lime' | 'amber' | 'sky' | 'violet') {
  if (accent === 'lime') return 'bg-lime-400';
  if (accent === 'sky') return 'bg-sky-400';
  if (accent === 'violet') return 'bg-violet-400';
  return 'bg-amber-400';
}

export default function ChatRecipesPage() {
  const router = useRouter();
  const { currentWorkspaceId, workspaces, loadWorkspaces } = useMeetingStore();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [query, setQuery] = useState('');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const selectionInitializedRef = useRef(false);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    if (selectionInitializedRef.current) return;
    if (workspaces.length === 0 && !currentWorkspaceId) return;
    setSelectedWorkspaceId(currentWorkspaceId || workspaces[0]?.id || null);
    selectionInitializedRef.current = true;
  }, [currentWorkspaceId, workspaces]);

  useEffect(() => {
    let active = true;

    const loadRecipes = async () => {
      try {
        const res = await fetch('/api/recipes');
        if (!res.ok || !active) return;
        setRecipes((await res.json()) as Recipe[]);
      } catch (error) {
        console.error('Load chat recipes failed:', error);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadRecipes();
    return () => {
      active = false;
    };
  }, []);

  const items = useMemo(() => {
    const raw = buildGlobalChatCatalogItems(recipes);
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return raw;

    return raw.filter((item) =>
      [item.label, item.description, item.command]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [query, recipes]);

  const launchItem = (item: (typeof items)[number]) => {
    const recipe = item.recipe;
    const workspaceId =
      recipe.kind === 'quick'
        ? recipe.scope === 'my_notes'
          ? selectedWorkspaceId || currentWorkspaceId || workspaces[0]?.id || null
          : null
        : selectedWorkspaceId;
    const scope =
      recipe.kind === 'quick'
        ? recipe.scope === 'my_notes' && workspaceId
          ? 'my_notes'
          : 'all_meetings'
        : resolveGlobalChatScope(workspaceId);

    const draft: GlobalChatDraft =
      recipe.kind === 'quick'
        ? {
            displayText: recipe.name,
            question: recipe.prompt,
            scope,
            workspaceId,
            filters: {},
          }
        : {
            displayText: recipe.name,
            question: recipe.name,
            recipePrompt: recipe.prompt,
            recipeId: recipe.id,
            scope,
            workspaceId,
            filters: {},
          };

    sessionStorage.setItem(GLOBAL_CHAT_DRAFT_KEY, JSON.stringify(draft));
    router.push('/chat/new');
  };

  return (
    <div className="min-h-full bg-[#F6F2EB]">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-8 px-6 pb-12 pt-8 sm:px-8 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#D8CEC4] bg-white text-[#6B5C50] transition-colors hover:bg-[#FBF8F4]"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-[#A08C79]">
                <Sparkles size={12} />
                Recipes Library
              </div>
              <h1 className="mt-3 font-song text-[34px] text-[#3A2E25]">All Recipes</h1>
            </div>
          </div>

          <label className="relative">
            <span className="sr-only">选择调用工作区</span>
            <select
              value={selectedWorkspaceId || '__all__'}
              onChange={(event) =>
                setSelectedWorkspaceId(event.target.value === '__all__' ? null : event.target.value)
              }
              className="appearance-none rounded-full border border-[#D8CEC4] bg-white px-4 py-2.5 pr-10 text-sm text-[#5C4D42] focus:border-[#BFAE9E] focus:outline-none"
            >
              <option value="__all__">全部工作区</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#A08C79]" />
          </label>
        </header>

        <section className="rounded-[30px] border border-[#DED4C9] bg-white/90 p-6 shadow-[0_18px_48px_rgba(58,46,37,0.08)]">
          <div className="flex items-center gap-2 rounded-2xl border border-[#E3D9CE] bg-[#FCFAF7] px-4 py-3">
            <Search size={16} className="text-[#A08C79]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索 recipe、命令或用途"
              className="flex-1 bg-transparent text-sm text-[#3A2E25] placeholder:text-[#B4A79A] focus:outline-none"
            />
          </div>

          {isLoading ? (
            <div className="py-14 text-center text-sm text-[#8C7A6B]">正在加载目录...</div>
          ) : (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-song text-[24px] text-[#3A2E25]">Recipes</h2>
                  <p className="mt-1 text-sm text-[#8C7A6B]">
                    系统 recipes 和自定义 recipes 统一在这里查看与调用。
                  </p>
                </div>
                <div className="rounded-full bg-[#F7F3EE] px-3 py-1.5 text-[12px] text-[#8C7A6B]">
                  {items.length} 项
                </div>
              </div>

              {items.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#DDD2C7] bg-[#FCFAF7] px-4 py-10 text-center text-sm text-[#9A8877]">
                  没有找到匹配的 recipes。
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => launchItem(item)}
                      className="rounded-[24px] border border-[#E9E1D7] bg-[#FCFAF7] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[#D8CEC4] hover:shadow-[0_16px_32px_rgba(58,46,37,0.08)]"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-1 h-10 w-2 rounded-full ${accentClass(item.accent)}`} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-[16px] font-semibold text-[#3A2E25]">{item.label}</div>
                            <span className="rounded-full bg-[#F1EBE3] px-2 py-0.5 text-[10px] text-[#8C7A6B]">
                              {item.sourceLabel}
                            </span>
                            {item.recipe.kind === 'quick' ? (
                              <span className="rounded-full bg-[#FFF5DF] px-2 py-0.5 text-[10px] text-[#AD7A1C]">
                                快捷
                              </span>
                            ) : null}
                            {item.command ? (
                              <code className="rounded-md bg-[#F1EBE3] px-1.5 py-0.5 text-[10px] text-[#8C7A6B]">
                                {item.command}
                              </code>
                            ) : null}
                          </div>
                          <p className="mt-2 text-[13px] leading-6 text-[#8C7A6B]">{item.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
