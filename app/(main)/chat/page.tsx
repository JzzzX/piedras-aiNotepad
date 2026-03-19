'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Clock3, Sparkles } from 'lucide-react';
import GlobalChatComposer, {
  type GlobalChatSubmitPayload,
} from '@/components/chat/GlobalChatComposer';
import {
  GLOBAL_CHAT_DRAFT_KEY,
  getFeaturedGlobalChatRecipes,
  getGlobalChatScopeLabel,
  resolveGlobalChatScope,
  type GlobalChatDraft,
} from '@/lib/global-chat-ui';
import { useMeetingStore } from '@/lib/store';
import type {
  Collection,
  GlobalChatFilters,
  GlobalChatSessionSummary,
  Recipe,
} from '@/lib/types';

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < hour) {
    return `${Math.max(1, Math.round(diff / minute))} 分钟前`;
  }
  if (diff < day) {
    return `${Math.round(diff / hour)} 小时前`;
  }
  if (diff < day * 7) {
    return `${Math.round(diff / day)} 天前`;
  }

  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

export default function ChatHomePage() {
  const router = useRouter();
  const {
    currentWorkspaceId,
    workspaces,
    loadWorkspaces,
  } = useMeetingStore();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [sessions, setSessions] = useState<GlobalChatSessionSummary[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [input, setInput] = useState('');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [filters, setFilters] = useState<GlobalChatFilters>({});
  const [isBooting, setIsBooting] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);
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

    const bootstrap = async () => {
      try {
        const [recipesRes, sessionsRes] = await Promise.all([
          fetch('/api/recipes'),
          fetch('/api/chat/sessions?limit=5'),
        ]);

        if (!active) return;

        if (recipesRes.ok) {
          setRecipes((await recipesRes.json()) as Recipe[]);
        }

        if (sessionsRes.ok) {
          setSessions((await sessionsRes.json()) as GlobalChatSessionSummary[]);
        }
      } catch (error) {
        console.error('Load chat home failed:', error);
      } finally {
        if (active) {
          setIsBooting(false);
        }
      }
    };

    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadScopedCollections = async () => {
      if (!selectedWorkspaceId) {
        setCollections([]);
        setFilters((prev) => (prev.collectionId ? { ...prev, collectionId: '' } : prev));
        return;
      }

      try {
        const res = await fetch(`/api/collections?workspaceId=${selectedWorkspaceId}`);
        if (!res.ok || !active) return;
        const data = (await res.json()) as Collection[];
        setCollections(data);
        setFilters((prev) =>
          prev.collectionId && !data.some((collection) => collection.id === prev.collectionId)
            ? { ...prev, collectionId: '' }
            : prev
        );
      } catch (error) {
        console.error('Load chat collections failed:', error);
      }
    };

    void loadScopedCollections();
    return () => {
      active = false;
    };
  }, [selectedWorkspaceId]);

  const handleLaunch = useCallback(
    async (payload?: GlobalChatSubmitPayload) => {
      const nextQuestion = (payload?.question || input).trim();
      if (!nextQuestion || isLaunching) return;

      setIsLaunching(true);

      const nextWorkspaceId =
        payload?.workspaceId !== undefined ? payload.workspaceId : selectedWorkspaceId;
      const nextScope = payload?.nextScope || resolveGlobalChatScope(nextWorkspaceId);
      const draft: GlobalChatDraft = {
        displayText: payload?.displayText || nextQuestion,
        question: nextQuestion,
        recipePrompt: payload?.recipePrompt,
        recipeId: payload?.recipeId,
        scope: nextScope,
        workspaceId: nextScope === 'my_notes' ? nextWorkspaceId : null,
        filters,
      };

      sessionStorage.setItem(GLOBAL_CHAT_DRAFT_KEY, JSON.stringify(draft));
      setInput('');
      router.push('/chat/new');
    },
    [filters, input, isLaunching, router, selectedWorkspaceId]
  );

  const featuredRecipes = useMemo(() => getFeaturedGlobalChatRecipes(recipes), [recipes]);

  return (
    <div className="flex-1">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-10 px-6 pb-12 pt-10 sm:px-8 lg:px-10">
        <section className="rounded-none border-2 border-[#111] bg-[#F4F0E6] px-6 py-8 shadow-[4px_4px_0px_#111] sm:px-8 sm:py-10">
          <div className="mx-auto max-w-[760px]">
            <div className="inline-flex items-center gap-2 rounded-none border-2 border-[#111] bg-[#F4F0E6] px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-[#8A8578]">
              <Sparkles size={12} />
              Piedras Chat
            </div>
            <h1 className="mt-5 font-[family-name:var(--font-vt323)] text-[38px] leading-tight text-[#111] sm:text-[52px]">
              Ask anything
            </h1>
            <p className="mt-3 max-w-[560px] text-[15px] leading-7 text-[#8A8578]">
              直接问会议、笔记和行动项。支持 recipes 命令和跨工作区检索。
            </p>

            <div className="mt-8">
              <GlobalChatComposer
                input={input}
                onInputChange={setInput}
                onSubmit={handleLaunch}
                selectedWorkspaceId={selectedWorkspaceId}
                onSelectedWorkspaceChange={setSelectedWorkspaceId}
                workspaces={workspaces}
                filters={filters}
                onFiltersChange={setFilters}
                templates={recipes}
                collections={collections}
                loading={isLaunching}
                placeholder="问昨天聊了什么、哪些决定还没落地，或者输入 / 命令"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="rounded-none border-2 border-[#111] bg-[#F4F0E6] p-6 shadow-[4px_4px_0px_#111]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-[family-name:var(--font-vt323)] text-[24px] text-[#111]">Recipes</h2>
                <p className="mt-1 text-sm text-[#8A8578]">常见问题一键开聊，也支持用命令直接调用。</p>
              </div>
              <Link
                href="/chat/recipes"
                className="inline-flex items-center gap-1 rounded-none border-2 border-[#111] bg-[#F4F0E6] px-3 py-2 text-sm text-[#111] transition-colors hover:bg-[#E8E4DA]"
              >
                See all
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {featuredRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() =>
                    void handleLaunch({
                      displayText: recipe.name,
                      question: recipe.starterQuestion?.trim() || recipe.name,
                      recipePrompt: recipe.prompt,
                      recipeId: recipe.id,
                      nextScope: selectedWorkspaceId ? 'my_notes' : 'all_meetings',
                      workspaceId: selectedWorkspaceId,
                    })
                  }
                  className="group rounded-none border-2 border-[#111] bg-[#F4F0E6] p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#111]"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-2 rounded-none bg-[#111]" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-[15px] font-semibold text-[#111]">{recipe.name}</div>
                        <code className="rounded-none border border-[#111] bg-[#F4F0E6] px-1.5 py-0.5 text-[10px] text-[#8A8578]">
                          {recipe.command}
                        </code>
                      </div>
                      <div className="mt-1 text-[13px] leading-6 text-[#8A8578]">
                        {recipe.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-none border-2 border-[#111] bg-[#F4F0E6] p-6 shadow-[4px_4px_0px_#111]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-vt323)] text-[24px] text-[#111]">Recent Chats</h2>
                <p className="mt-1 text-sm text-[#8A8578]">继续最近的问题，不用重新描述上下文。</p>
              </div>
              <Link
                href="/chat/history"
                className="inline-flex items-center gap-1 rounded-none border-2 border-[#111] bg-[#F4F0E6] px-3 py-2 text-sm text-[#111] transition-colors hover:bg-[#E8E4DA]"
              >
                See all
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => router.push(`/chat/${session.id}`)}
                  className="w-full rounded-none border-2 border-[#111] bg-[#F4F0E6] px-4 py-4 text-left transition-all hover:bg-[#E8E4DA]"
                >
                  <div className="line-clamp-1 text-[15px] font-semibold text-[#111]">
                    {session.title}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-[#8A8578]">
                    <span className="rounded-none border border-[#111] bg-[#F4F0E6] px-2.5 py-1">
                      {getGlobalChatScopeLabel(session.scope, session.workspace?.name)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={12} />
                      {formatRelativeTime(session.updatedAt)}
                    </span>
                  </div>
                </button>
              ))}

              {!isBooting && sessions.length === 0 ? (
                <div className="rounded-none border-2 border-dashed border-[#111] bg-[#F4F0E6] px-4 py-8 text-center text-sm text-[#8A8578]">
                  还没有历史对话。先从上方输入一个问题，或直接点 recipe 开始。
                </div>
              ) : null}

              {isBooting ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((idx) => (
                    <div
                      key={idx}
                      className="h-[84px] animate-pulse rounded-none border-2 border-[#111] bg-[#E8E4DA]"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
