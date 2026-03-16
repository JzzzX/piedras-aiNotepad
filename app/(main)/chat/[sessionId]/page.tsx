'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Bot, Loader2, MessageSquareText, Plus, Trash2, User } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import GlobalChatComposer, {
  type GlobalChatSubmitPayload,
} from '@/components/chat/GlobalChatComposer';
import {
  GLOBAL_CHAT_DRAFT_KEY,
  buildGlobalChatRetrievalFilters,
  buildGlobalChatSessionTitle,
  getGlobalChatScopeLabel,
  resolveGlobalChatScope,
  type GlobalChatDraft,
} from '@/lib/global-chat-ui';
import { chatAcrossMeetings } from '@/lib/llm';
import { useMeetingStore } from '@/lib/store';
import type {
  ChatMessage,
  Collection,
  GlobalChatFilters,
  GlobalChatSessionDetail,
  Recipe,
} from '@/lib/types';

export default function GlobalChatSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const routeSessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  const {
    currentWorkspaceId,
    workspaces,
    promptOptions,
    llmSettings,
    loadWorkspaces,
  } = useMeetingStore();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(routeSessionId === 'new' ? null : routeSessionId);
  const [title, setTitle] = useState('新对话');
  const [filters, setFilters] = useState<GlobalChatFilters>({});
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<GlobalChatDraft | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const initialDraftTriggeredRef = useRef(false);
  const hydrateCompleteRef = useRef(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    let active = true;

    const loadRecipes = async () => {
      try {
        const res = await fetch('/api/recipes');
        if (!res.ok || !active) return;
        setRecipes((await res.json()) as Recipe[]);
      } catch (loadError) {
        console.error('Load chat recipes failed:', loadError);
      }
    };

    void loadRecipes();
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
      } catch (loadError) {
        console.error('Load chat collections failed:', loadError);
      }
    };

    void loadScopedCollections();
    return () => {
      active = false;
    };
  }, [selectedWorkspaceId]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      if (routeSessionId === 'new' && hydrateCompleteRef.current) {
        setIsLoadingSession(false);
        return;
      }

      if (routeSessionId !== 'new' && routeSessionId === sessionId && hydrateCompleteRef.current) {
        setIsLoadingSession(false);
        return;
      }

      setError('');
      setIsLoadingSession(true);
      hydrateCompleteRef.current = false;
      initialDraftTriggeredRef.current = false;

      if (routeSessionId === 'new') {
        const raw =
          typeof window !== 'undefined' ? sessionStorage.getItem(GLOBAL_CHAT_DRAFT_KEY) : null;
        if (!raw) {
          router.replace('/chat');
          return;
        }

        sessionStorage.removeItem(GLOBAL_CHAT_DRAFT_KEY);

        try {
          const draft = JSON.parse(raw) as GlobalChatDraft;
          if (!active) return;
          setPendingDraft({
            ...draft,
            recipePrompt: draft.recipePrompt || (draft as GlobalChatDraft & { templatePrompt?: string }).templatePrompt,
            recipeId: draft.recipeId || (draft as GlobalChatDraft & { templateId?: string }).templateId,
          });
          setSessionId(null);
          setMessages([]);
          setInput('');
          setTitle(buildGlobalChatSessionTitle(draft.displayText || draft.question));
          setFilters(draft.filters || {});
          setSelectedWorkspaceId(
            draft.scope === 'my_notes'
              ? draft.workspaceId || currentWorkspaceId || workspaces[0]?.id || null
              : null
          );
          setIsLoadingSession(false);
          hydrateCompleteRef.current = true;
        } catch (parseError) {
          console.error('Parse global chat draft failed:', parseError);
          router.replace('/chat');
        }
        return;
      }

      try {
        const res = await fetch(`/api/chat/sessions/${routeSessionId}`);
        if (!res.ok) {
          throw new Error('聊天会话加载失败');
        }

        const session = (await res.json()) as GlobalChatSessionDetail;
        if (!active) return;

        setPendingDraft(null);
        setSessionId(session.id);
        setTitle(session.title);
        setFilters(session.filters || {});
        setSelectedWorkspaceId(
          session.scope === 'my_notes'
            ? session.workspaceId || currentWorkspaceId || workspaces[0]?.id || null
            : null
        );
        setMessages(session.messages);
      } catch (loadError) {
        console.error(loadError);
        if (active) {
          setError(loadError instanceof Error ? loadError.message : '聊天会话加载失败');
        }
      } finally {
        if (active) {
          setIsLoadingSession(false);
          hydrateCompleteRef.current = true;
        }
      }
    };

    void bootstrap();
    return () => {
      active = false;
    };
  }, [currentWorkspaceId, routeSessionId, router, sessionId, workspaces]);

  const currentWorkspaceName = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspaceId)?.name || null,
    [selectedWorkspaceId, workspaces]
  );

  useEffect(() => {
    if (!sessionId || !hydrateCompleteRef.current || isLoadingSession) return;

    const timer = window.setTimeout(() => {
      void fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          scope: resolveGlobalChatScope(selectedWorkspaceId),
          workspaceId: selectedWorkspaceId,
          filters,
        }),
      }).catch((patchError) => {
        console.error('Patch global chat session failed:', patchError);
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [filters, isLoadingSession, selectedWorkspaceId, sessionId, title]);

  const persistMessage = useCallback(
    async (
      targetSessionId: string,
      payload: {
        role: 'user' | 'assistant';
        content: string;
        timestamp: number;
        recipeId?: string;
        templateId?: string;
      }
    ) => {
      const res = await fetch(`/api/chat/sessions/${targetSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || '消息保存失败');
      }

      return (await res.json()) as ChatMessage;
    },
    []
  );

  const createSessionIfNeeded = useCallback(
    async (titleSeed: string, nextWorkspaceId: string | null) => {
      if (sessionId) return sessionId;

      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleSeed,
          scope: resolveGlobalChatScope(nextWorkspaceId),
          workspaceId: nextWorkspaceId,
          filters,
        }),
      });

      if (!res.ok) {
        throw new Error('创建聊天会话失败');
      }

      const created = (await res.json()) as GlobalChatSessionDetail;
      setSessionId(created.id);
      setTitle(created.title);
      router.replace(`/chat/${created.id}`);
      return created.id;
    },
    [filters, router, sessionId]
  );

  const handleSubmit = useCallback(
    async (payload?: GlobalChatSubmitPayload) => {
      const question = (payload?.question || input).trim();
      if (!question || isSending) return;
      const titleSeed = payload?.displayText || question;
      const nextWorkspaceId =
        payload?.workspaceId !== undefined ? payload.workspaceId : selectedWorkspaceId;
      const nextScope = payload?.nextScope || resolveGlobalChatScope(nextWorkspaceId);

      setError('');
      setIsSending(true);
      setInput('');
      setSelectedWorkspaceId(nextScope === 'my_notes' ? nextWorkspaceId : null);

      const timestamp = Date.now();
      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: question,
        timestamp,
        recipeId: payload?.recipeId,
        templateId: payload?.recipeId,
      };

      const historyWithUser = [...messages, userMessage];
      setMessages((prev) => [...prev, userMessage]);

      const optimisticTitle = messages.length === 0 ? buildGlobalChatSessionTitle(titleSeed) : title;
      if (messages.length === 0) {
        setTitle(optimisticTitle);
      }

      try {
        const actualSessionId = await createSessionIfNeeded(titleSeed, nextScope === 'my_notes' ? nextWorkspaceId : null);
        await persistMessage(actualSessionId, {
          role: 'user',
          content: question,
          timestamp,
          recipeId: payload?.recipeId,
        });

        const assistantId = uuidv4();
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() },
        ]);

        const stream = await chatAcrossMeetings(
          historyWithUser,
          question,
          buildGlobalChatRetrievalFilters({
            scope: nextScope,
            workspaceId: nextScope === 'my_notes' ? nextWorkspaceId : null,
            filters,
          }),
          promptOptions,
          llmSettings,
          payload?.recipePrompt || payload?.templatePrompt
        );

        if (!stream) {
          throw new Error('没有收到模型返回');
        }

        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullContent += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantId ? { ...message, content: fullContent } : message
            )
          );
        }

        await persistMessage(actualSessionId, {
          role: 'assistant',
          content: fullContent.trim() || '抱歉，我这次没有生成有效回答。',
          timestamp: Date.now(),
        });
      } catch (sendError) {
        console.error(sendError);
        const detail = sendError instanceof Error ? sendError.message : '发送失败';
        setError(detail);
        setMessages((prev) => [
          ...prev.filter((message) => message.content !== '' || message.role !== 'assistant'),
          {
            id: uuidv4(),
            role: 'assistant',
            content: `抱歉，这次对话没有成功完成。\n\n${detail}`,
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [
      createSessionIfNeeded,
      filters,
      input,
      isSending,
      llmSettings,
      messages,
      persistMessage,
      promptOptions,
      selectedWorkspaceId,
      title,
    ]
  );

  useEffect(() => {
    if (!pendingDraft || initialDraftTriggeredRef.current || isLoadingSession) return;
    initialDraftTriggeredRef.current = true;
    void handleSubmit({
      displayText: pendingDraft.displayText,
      question: pendingDraft.question,
      recipePrompt: pendingDraft.recipePrompt,
      recipeId: pendingDraft.recipeId,
      nextScope: pendingDraft.scope,
      workspaceId: pendingDraft.workspaceId || null,
    });
    setPendingDraft(null);
  }, [handleSubmit, isLoadingSession, pendingDraft]);

  const currentScopeLabel = useMemo(
    () => getGlobalChatScopeLabel(resolveGlobalChatScope(selectedWorkspaceId), currentWorkspaceName),
    [currentWorkspaceName, selectedWorkspaceId]
  );

  const handleDeleteSession = useCallback(async () => {
    if (!sessionId || isDeleting) return;
    if (!window.confirm(`确认删除对话「${title}」？`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || '删除聊天失败');
      }
      router.replace('/chat/history');
    } catch (deleteError) {
      console.error('Delete global chat failed:', deleteError);
      alert(deleteError instanceof Error ? deleteError.message : '删除聊天失败');
      setIsDeleting(false);
    }
  }, [isDeleting, router, sessionId, title]);

  return (
    <div>
      <div className="mx-auto flex max-w-[1100px] flex-col px-6 pb-10 pt-8 sm:px-8 lg:px-10">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/chat')}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#D8CEC4] bg-white text-[#6B5C50] transition-colors hover:bg-[#FBF8F4]"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="font-song text-[28px] text-[#3A2E25]">{title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-[#8C7A6B]">
                <span className="rounded-full bg-white px-2.5 py-1">{currentScopeLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {sessionId ? (
              <button
                type="button"
                onClick={() => void handleDeleteSession()}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-full border border-[#E6D8CB] bg-white px-4 py-2.5 text-sm font-medium text-[#7A5B57] transition-colors hover:bg-[#FBF8F4] disabled:opacity-60"
              >
                <Trash2 size={15} />
                删除对话
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => router.push('/chat')}
              className="inline-flex items-center gap-2 rounded-full bg-[#3A2E25] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2B2420]"
            >
              <Plus size={16} />
              New chat
            </button>
          </div>
        </header>

        <div className="flex min-h-[540px] flex-1 flex-col overflow-hidden rounded-[32px] border border-[#DED4C9] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(249,245,239,0.94))] shadow-[0_20px_64px_rgba(58,46,37,0.08)]">
          <div
            ref={scrollRef}
            className={`flex-1 overflow-y-auto px-5 py-6 sm:px-8 ${
              messages.length === 0 && !isLoadingSession ? 'flex items-center justify-center' : ''
            }`}
          >
            {isLoadingSession ? (
              <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-sm text-[#7C6B5C] shadow-sm">
                <Loader2 size={16} className="animate-spin" />
                正在加载聊天上下文...
              </div>
            ) : null}

            {!isLoadingSession && error && messages.length === 0 ? (
              <div className="rounded-[24px] border border-[#F0C6C3] bg-[#FFF3F2] px-5 py-4 text-sm text-[#B35454]">
                {error}
              </div>
            ) : null}

            {!isLoadingSession && !error && messages.length === 0 ? (
              <div className="mx-auto max-w-[520px] text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-[#ECD9BC] bg-[#FFF4DE]">
                  <MessageSquareText size={26} className="text-[#D8871F]" />
                </div>
                <h2 className="mt-5 font-song text-[28px] text-[#3A2E25]">新对话已准备好</h2>
                <p className="mt-3 text-[15px] leading-7 text-[#857364]">
                  用下方输入框继续追问会议细节，也可以输入 <code>/</code> 调用 recipe。
                </p>
              </div>
            ) : null}

            {messages.length > 0 ? (
              <div className="mx-auto flex w-full max-w-[860px] flex-col gap-5">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start gap-3 ${
                      message.role === 'user' ? 'justify-end' : ''
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#ECD9BC] bg-[#FFF4DE]">
                        <Bot size={17} className="text-[#D8871F]" />
                      </div>
                    ) : null}

                    <div
                      className={`max-w-[82%] rounded-[24px] px-5 py-4 text-[15px] leading-7 shadow-sm ${
                        message.role === 'user'
                          ? 'rounded-tr-md bg-[#3A2E25] text-white'
                          : 'rounded-tl-md border border-[#E7DDD2] bg-white text-[#3A2E25]'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{message.content}</div>
                      {message.role === 'assistant' && !message.content && isSending ? (
                        <div className="flex items-center gap-2 text-[#D8871F]">
                          <Loader2 size={16} className="animate-spin" />
                          <span className="text-sm">思考中...</span>
                        </div>
                      ) : null}
                    </div>

                    {message.role === 'user' ? (
                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E7DDD2] bg-[#F7F3EE]">
                        <User size={17} className="text-[#8C7A6B]" />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="border-t border-[#E6DDD2] bg-white/90 px-4 py-4 sm:px-6">
            {error && messages.length > 0 ? (
              <div className="mx-auto mb-3 max-w-[860px] rounded-2xl border border-[#F0C6C3] bg-[#FFF3F2] px-4 py-3 text-sm text-[#B35454]">
                {error}
              </div>
            ) : null}
            <div className="mx-auto max-w-[860px]">
              <GlobalChatComposer
                variant="dock"
                input={input}
                onInputChange={setInput}
                onSubmit={handleSubmit}
                selectedWorkspaceId={selectedWorkspaceId}
                onSelectedWorkspaceChange={setSelectedWorkspaceId}
                workspaces={workspaces}
                filters={filters}
                onFiltersChange={setFilters}
                templates={recipes}
                collections={collections}
                disabled={isLoadingSession}
                loading={isSending}
                placeholder="继续追问，或输入 / 命令"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
