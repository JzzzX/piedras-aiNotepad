'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock3, MessageSquareText, Search, Trash2 } from 'lucide-react';
import { getGlobalChatScopeLabel } from '@/lib/global-chat-ui';
import type { GlobalChatSessionSummary } from '@/lib/types';

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

export default function ChatHistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<GlobalChatSessionSummary[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ limit: '100' });
        if (query.trim()) {
          params.set('query', query.trim());
        }

        const res = await fetch(`/api/chat/sessions?${params.toString()}`);
        if (!res.ok || !active) return;
        setSessions((await res.json()) as GlobalChatSessionSummary[]);
      } catch (error) {
        console.error('Load chat history failed:', error);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="min-h-full bg-[#F6F2EB]">
      <div className="mx-auto flex max-w-[980px] flex-col gap-8 px-6 pb-12 pt-8 sm:px-8 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#D8CEC4] bg-white text-[#6B5C50] transition-colors hover:bg-[#FBF8F4]"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="font-song text-[34px] text-[#3A2E25]">All Chats</h1>
              <p className="mt-1 text-sm text-[#8C7A6B]">查看完整历史对话，并按标题快速检索。</p>
            </div>
          </div>
        </header>

        <section className="rounded-[30px] border border-[#DED4C9] bg-white/90 p-6 shadow-[0_18px_48px_rgba(58,46,37,0.08)]">
          <div className="flex items-center gap-2 rounded-2xl border border-[#E3D9CE] bg-[#FCFAF7] px-4 py-3">
            <Search size={16} className="text-[#A08C79]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索聊天标题"
              className="flex-1 bg-transparent text-sm text-[#3A2E25] placeholder:text-[#B4A79A] focus:outline-none"
            />
          </div>

          <div className="mt-6 space-y-3">
            {isLoading ? (
              [0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="h-[92px] animate-pulse rounded-[24px] bg-[#F4EEE7]"
                />
              ))
            ) : sessions.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#DDD2C7] bg-[#FCFAF7] px-4 py-10 text-center text-sm text-[#9A8877]">
                没有找到匹配的对话记录。
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-start justify-between gap-4 rounded-[24px] border border-[#E9E1D7] bg-[#FCFAF7] px-5 py-4 transition-all hover:border-[#D8CEC4] hover:bg-white hover:shadow-[0_14px_30px_rgba(58,46,37,0.08)]"
                >
                  <button
                    type="button"
                    onClick={() => router.push(`/chat/${session.id}`)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="line-clamp-1 text-[16px] font-semibold text-[#3A2E25]">
                      {session.title}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-[#8C7A6B]">
                      <span className="rounded-full bg-[#F1EBE3] px-2.5 py-1">
                        {getGlobalChatScopeLabel(session.scope, session.workspace?.name)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={12} />
                        {formatRelativeTime(session.updatedAt)}
                      </span>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (deletingId) return;
                        if (!window.confirm(`确认删除对话「${session.title}」？`)) return;
                        setDeletingId(session.id);
                        try {
                          const res = await fetch(`/api/chat/sessions/${session.id}`, { method: 'DELETE' });
                          if (!res.ok) {
                            const data = await res.json().catch(() => null);
                            throw new Error(data?.error || '删除聊天失败');
                          }
                          setSessions((current) => current.filter((item) => item.id !== session.id));
                        } catch (error) {
                          console.error('Delete chat session failed:', error);
                          alert(error instanceof Error ? error.message : '删除聊天失败');
                        } finally {
                          setDeletingId(null);
                        }
                      }}
                      disabled={deletingId === session.id}
                      className="rounded-full p-2 text-[#B9A999] transition-colors hover:bg-[#F3ECE4] hover:text-rose-500 disabled:opacity-50"
                      aria-label={`删除对话 ${session.title}`}
                    >
                      <Trash2 size={16} />
                    </button>
                    <MessageSquareText size={18} className="text-[#B9A999]" />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
