'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  ChevronDown,
  Loader2,
  MoreHorizontal,
  Sparkles,
  User,
  Wand2,
  X,
} from 'lucide-react';
import TemplateManager from '@/components/TemplateManager';
import PromptSettings from '@/components/PromptSettings';
import SpeakerManager from '@/components/SpeakerManager';
import type { MeetingAssistantView } from '@/hooks/useMeetingChat';
import type { ChatMessage, Recipe } from '@/lib/types';

interface BubbleChatProps {
  open: boolean;
  view: MeetingAssistantView;
  recipeQuery: string;
  messages: ChatMessage[];
  isLoading: boolean;
  templates: Recipe[];
  filteredTemplates: Recipe[];
  templatesLoading: boolean;
  templatesError: string;
  selectedTemplateIndex: number;
  onSelectTemplate: (template: Recipe) => void;
  onShowMessages: () => void;
  onReloadTemplates: () => Promise<void>;
  onClose: () => void;
}

type ModalView = 'none' | 'settings' | 'speakers' | 'templates';

export default function BubbleChat({
  open,
  view,
  recipeQuery,
  messages,
  isLoading,
  templates,
  filteredTemplates,
  templatesLoading,
  templatesError,
  selectedTemplateIndex,
  onSelectTemplate,
  onShowMessages,
  onReloadTemplates,
  onClose,
}: BubbleChatProps) {
  const [modalView, setModalView] = useState<ModalView>('none');
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || view !== 'messages') return;

    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, view]);

  const title = useMemo(() => {
    if (view === 'recipes') return '当前会议 Recipes';
    if (messages.length === 0) return '当前会议 AI 助手';
    return '会议助手对话';
  }, [messages.length, view]);

  const headline = view === 'recipes' ? '输入 / 后直接套用会议动作' : '围绕当前会议继续追问';
  const emptyRecipes = templates.slice(0, 3);

  if (!open) {
    return (
      <TemplateManager
        open={modalView === 'templates'}
        templates={templates}
        onClose={() => setModalView('none')}
        onSaved={onReloadTemplates}
      />
    );
  }

  return (
    <>
      {/* ── retro-window chat panel ── */}
      <div className="absolute bottom-[calc(100%+1rem)] right-0 z-50 w-[min(620px,calc(100vw-1rem))] overflow-hidden rounded-none border-2 border-[#111] bg-[#F4F0E6] shadow-[4px_4px_0px_#111]">
        {/* ── title bar ── */}
        <div className="flex items-center justify-between border-b-2 border-[#111] bg-[#111] px-4 py-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-none border border-[#F4F0E6]" />
            <span className="font-[family-name:var(--font-vt323)] text-sm text-[#F4F0E6]">
              Meeting Assistant
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-none border border-[#F4F0E6] text-[#F4F0E6] transition-colors hover:bg-[#F4F0E6] hover:text-[#111]"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── header area ── */}
        <div className="border-b-2 border-[#111] bg-[#F4F0E6] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-vt323)] text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8A8578]">
                Meeting Assistant
              </p>
              <h3 className="mt-1 flex items-center gap-2 font-[family-name:var(--font-vt323)] text-[18px] font-semibold text-[#111]">
                {view === 'recipes' ? (
                  <Wand2 size={17} className="text-[#D9423E]" />
                ) : (
                  <Sparkles size={17} className="text-[#D9423E]" />
                )}
                {title}
              </h3>
              <p className="mt-2 font-[family-name:var(--font-vt323)] text-sm text-[#8A8578]">{headline}</p>
            </div>

            <div className="flex items-center gap-2">
              {view === 'recipes' && (
                <button
                  type="button"
                  onClick={onShowMessages}
                  className="rounded-none border-2 border-[#111] bg-[#F4F0E6] px-3 py-2 font-[family-name:var(--font-vt323)] text-sm font-medium text-[#111] transition-colors hover:bg-[#111] hover:text-[#F4F0E6]"
                >
                  返回对话
                </button>
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((value) => !value)}
                  className="flex h-10 items-center gap-1 rounded-none border-2 border-[#111] bg-[#F4F0E6] px-3 text-[#111] transition-colors hover:bg-[#111] hover:text-[#F4F0E6]"
                >
                  <MoreHorizontal size={16} />
                  <ChevronDown size={15} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.55rem)] z-10 w-40 overflow-hidden rounded-none border-2 border-[#111] bg-[#F4F0E6] p-1.5 shadow-[4px_4px_0px_#111]">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setModalView('settings');
                      }}
                      className="w-full rounded-none px-3 py-2 text-left font-[family-name:var(--font-vt323)] text-sm text-[#111] transition-colors hover:bg-[#111] hover:text-[#F4F0E6]"
                    >
                      AI 设置
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setModalView('speakers');
                      }}
                      className="w-full rounded-none px-3 py-2 text-left font-[family-name:var(--font-vt323)] text-sm text-[#111] transition-colors hover:bg-[#111] hover:text-[#F4F0E6]"
                    >
                      说话人设置
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setModalView('templates');
                      }}
                      className="w-full rounded-none px-3 py-2 text-left font-[family-name:var(--font-vt323)] text-sm text-[#111] transition-colors hover:bg-[#111] hover:text-[#F4F0E6]"
                    >
                      Recipe 管理
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {view === 'recipes' ? (
          <div className="max-h-[min(56vh,480px)] overflow-y-auto px-4 py-4">
            <div className="mb-3 rounded-none border-2 border-[#111] bg-[#F4F0E6] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-[family-name:var(--font-vt323)] text-xs font-semibold uppercase tracking-[0.18em] text-[#8A8578]">
                    Recipes
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-vt323)] text-sm text-[#111]">
                    {recipeQuery
                      ? `筛选关键词：${recipeQuery}`
                      : '选择一个模板，直接让会议助手基于当前转写执行。'}
                  </p>
                </div>
                <span className="rounded-none border-2 border-[#111] bg-[#F4F0E6] px-3 py-1 font-[family-name:var(--font-vt323)] text-xs font-medium text-[#111]">
                  / 调用
                </span>
              </div>
            </div>

            {templatesLoading ? (
              <div className="flex min-h-[180px] items-center justify-center gap-3 rounded-none border-2 border-dashed border-[#111] bg-[#F4F0E6] text-[#8A8578]">
                <Loader2 size={18} className="animate-spin" />
                <span className="font-[family-name:var(--font-vt323)] text-sm">正在加载 Recipes…</span>
              </div>
            ) : templatesError ? (
              <div className="rounded-none border-2 border-[#111] bg-[#F4F0E6] px-5 py-6 font-[family-name:var(--font-vt323)] text-sm text-[#D9423E]">
                {templatesError}
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="rounded-none border-2 border-dashed border-[#111] bg-[#F4F0E6] px-5 py-10 text-center">
                <p className="font-[family-name:var(--font-vt323)] text-base font-semibold text-[#111]">没有匹配的 Recipe</p>
                <p className="mt-2 font-[family-name:var(--font-vt323)] text-sm leading-6 text-[#8A8578]">
                  继续输入更明确的 `/命令`，或者返回对话直接提问。
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTemplates.map((template, index) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => onSelectTemplate(template)}
                    className={`flex w-full items-start gap-3 rounded-none border-2 px-4 py-4 text-left transition-all ${
                      index === selectedTemplateIndex
                        ? 'border-[#111] bg-[#111] text-[#F4F0E6] shadow-[4px_4px_0px_#111]'
                        : 'border-[#111] bg-[#F4F0E6] hover:bg-[#111] hover:text-[#F4F0E6]'
                    }`}
                  >
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-none border-2 text-lg ${
                      index === selectedTemplateIndex
                        ? 'border-[#F4F0E6] bg-[#333]'
                        : 'border-[#111] bg-[#F4F0E6]'
                    }`}>
                      {template.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={`truncate font-[family-name:var(--font-vt323)] text-[15px] font-semibold ${
                          index === selectedTemplateIndex ? 'text-[#F4F0E6]' : 'text-[#111]'
                        }`}>
                          {template.name}
                        </span>
                        <code className={`rounded-none border px-2 py-0.5 font-[family-name:var(--font-vt323)] text-[11px] ${
                          index === selectedTemplateIndex
                            ? 'border-[#F4F0E6] text-[#F4F0E6]'
                            : 'border-[#111] text-[#8A8578]'
                        }`}>
                          {template.command}
                        </code>
                      </span>
                      <span className={`mt-1 block font-[family-name:var(--font-vt323)] text-sm leading-6 ${
                        index === selectedTemplateIndex ? 'text-[#ccc]' : 'text-[#8A8578]'
                      }`}>
                        {template.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            ref={scrollRef}
            className={`max-h-[min(56vh,460px)] px-5 py-5 ${
              messages.length === 0 ? 'overflow-hidden' : 'space-y-4 overflow-y-auto'
            }`}
          >
            {messages.length === 0 ? (
              <div className="rounded-none border-2 border-dashed border-[#111] bg-[#F4F0E6] px-6 py-8">
                <div className="mx-auto flex max-w-[420px] flex-col items-center text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-none border-2 border-[#111] bg-[#F4F0E6] text-[#D9423E]">
                    <Sparkles size={22} />
                  </div>
                  <p className="font-[family-name:var(--font-vt323)] text-[18px] font-semibold text-[#111]">提问、追问，或者直接套用 Recipe</p>
                  <p className="mt-2 font-[family-name:var(--font-vt323)] text-sm leading-6 text-[#8A8578]">
                    会议助手只围绕当前这场录音、转写和笔记回答，不再额外跳出独立模板浮层。
                  </p>

                  {emptyRecipes.length > 0 && (
                    <div className="mt-6 flex w-full flex-wrap justify-center gap-2">
                      {emptyRecipes.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => onSelectTemplate(template)}
                          className="rounded-none border-2 border-[#111] bg-[#F4F0E6] px-3 py-2 font-[family-name:var(--font-vt323)] text-sm text-[#111] transition-colors hover:bg-[#111] hover:text-[#F4F0E6]"
                        >
                          {template.command} {template.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-none border-2 border-[#111] ${
                      message.role === 'user'
                        ? 'bg-[#111] text-[#F4F0E6]'
                        : 'bg-[#F4F0E6] text-[#111]'
                    }`}
                  >
                    {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div
                    className={`max-w-[82%] rounded-none border-2 border-[#111] px-4 py-3 font-[family-name:var(--font-vt323)] text-[14px] leading-6 ${
                      message.role === 'user'
                        ? 'bg-[#111] text-[#F4F0E6]'
                        : 'bg-[#F4F0E6] text-[#111]'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    {message.role === 'assistant' && !message.content && isLoading ? (
                      <div className="flex items-center gap-2 text-[#8A8578]">
                        <Loader2 size={15} className="animate-spin" />
                        <span className="font-[family-name:var(--font-vt323)] text-sm">思考中…</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {modalView !== 'none' && modalView !== 'templates' && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(17,17,17,0.25)] p-4">
          <div className="w-full max-w-[560px] overflow-hidden rounded-none border-2 border-[#111] bg-[#F4F0E6] shadow-[4px_4px_0px_#111]">
            {/* ── modal title bar ── */}
            <div className="flex items-center justify-between border-b-2 border-[#111] bg-[#111] px-4 py-1.5">
              <h3 className="font-[family-name:var(--font-vt323)] text-sm text-[#F4F0E6]">
                {modalView === 'settings' ? 'AI 设置' : '说话人设置'}
              </h3>
              <button
                type="button"
                onClick={() => setModalView('none')}
                className="flex h-6 w-6 items-center justify-center rounded-none border border-[#F4F0E6] text-[#F4F0E6] transition-colors hover:bg-[#F4F0E6] hover:text-[#111]"
              >
                <X size={14} />
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
