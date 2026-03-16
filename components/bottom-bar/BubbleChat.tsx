'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  ChevronDown,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import TemplateManager from '@/components/TemplateManager';
import PromptSettings from '@/components/PromptSettings';
import SpeakerManager from '@/components/SpeakerManager';
import type { ChatMessage, Recipe } from '@/lib/types';

interface BubbleChatProps {
  open: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  templates: Recipe[];
  onReloadTemplates: () => Promise<void>;
  onClose: () => void;
}

type ModalView = 'none' | 'settings' | 'speakers' | 'templates';

export default function BubbleChat({
  open,
  messages,
  isLoading,
  templates,
  onReloadTemplates,
  onClose,
}: BubbleChatProps) {
  const [modalView, setModalView] = useState<ModalView>('none');
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const title = useMemo(() => {
    if (messages.length === 0) return '当前会议 AI 助手';
    return '会议对话';
  }, [messages.length]);

  if (!open) {
    return (
      <>
        <TemplateManager
          open={modalView === 'templates'}
          templates={templates}
          onClose={() => setModalView('none')}
          onSaved={onReloadTemplates}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="关闭聊天气泡"
        className="fixed inset-0 z-40 bg-transparent"
        onClick={onClose}
      />
      <div className="absolute bottom-[calc(100%+0.9rem)] right-0 z-50 w-[min(560px,calc(100vw-1rem))] overflow-hidden rounded-[32px] border border-[#E7DACD] bg-[#FFFDF9] shadow-[0_28px_80px_rgba(58,46,37,0.18)]">
        <div className="flex items-center justify-between border-b border-[#F1E6DB] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A49486]">
              Meeting Chat
            </p>
            <h3 className="mt-1 flex items-center gap-2 text-[16px] font-semibold text-[#3A2E25]">
              <Sparkles size={16} className="text-[#B88959]" />
              {title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                className="flex h-10 items-center gap-1 rounded-full bg-[#F6EFE7] px-3 text-[#5C4D42] transition-colors hover:bg-[#EEE2D6]"
              >
                <MoreHorizontal size={16} />
                <ChevronDown size={15} />
              </button>
              {open && menuOpen && (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-10 w-40 overflow-hidden rounded-2xl border border-[#E7DACD] bg-white p-1.5 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setModalView('settings');
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#4E4035] transition-colors hover:bg-[#F7F1EA]"
                  >
                    AI 设置
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setModalView('speakers');
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#4E4035] transition-colors hover:bg-[#F7F1EA]"
                  >
                    说话人设置
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setModalView('templates');
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#4E4035] transition-colors hover:bg-[#F7F1EA]"
                  >
                    Recipe 管理
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F6EFE7] text-[#5C4D42] transition-colors hover:bg-[#EEE2D6]"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className={`max-h-[min(52vh,420px)] px-5 py-5 ${
            messages.length === 0 ? 'overflow-hidden' : 'space-y-4 overflow-y-auto'
          }`}
        >
          {messages.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[26px] border border-dashed border-[#E6D8C9] bg-[#FCF8F3] px-8 text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-[#B88959] shadow-sm">
                <MessageSquare size={22} />
              </div>
              <p className="text-[17px] font-semibold text-[#3A2E25]">围绕当前会议提问</p>
              <p className="mt-2 max-w-[280px] text-[13px] leading-6 text-[#8B796A]">
                直接在底栏输入，或者用 `/` 调出 Recipe。这里不会再混入跨会议检索。
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    message.role === 'user'
                      ? 'bg-[#F7EFE6] text-[#7C6A5E]'
                      : 'bg-[#FDF3E5] text-[#B88959]'
                  }`}
                >
                  {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div
                  className={`max-w-[82%] rounded-[22px] px-4 py-3 text-[14px] leading-6 shadow-sm ${
                    message.role === 'user'
                      ? 'rounded-tr-md bg-[#3A2E25] text-white'
                      : 'rounded-tl-md border border-[#EFE2D6] bg-white text-[#4E4035]'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  {message.role === 'assistant' && !message.content && isLoading ? (
                    <div className="flex items-center gap-2 text-[#B88959]">
                      <Loader2 size={15} className="animate-spin" />
                      <span className="text-sm">思考中…</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {modalView !== 'none' && modalView !== 'templates' && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[560px] overflow-hidden rounded-[30px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EFE2D6] px-6 py-4">
              <h3 className="text-base font-semibold text-[#3A2E25]">
                {modalView === 'settings' ? 'AI 设置' : '说话人设置'}
              </h3>
              <button
                type="button"
                onClick={() => setModalView('none')}
                className="rounded-full p-2 text-[#8B796A] transition-colors hover:bg-[#F7F1EA]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-6">
              {modalView === 'settings' ? <PromptSettings /> : <SpeakerManager />}
            </div>
          </div>
        </div>
      )}

      <TemplateManager
        open={modalView === 'templates'}
        templates={templates}
        onClose={() => setModalView('none')}
        onSaved={onReloadTemplates}
      />
    </>
  );
}
