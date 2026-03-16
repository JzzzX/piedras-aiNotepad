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
      <div className="absolute bottom-[calc(100%+1rem)] right-0 z-50 w-[min(620px,calc(100vw-1rem))] overflow-hidden rounded-[34px] border border-[#D8DEC8] bg-[#FFFDF8] shadow-[0_30px_80px_rgba(59,64,46,0.18)]">
        <div className="border-b border-[#E8E4D8] bg-[linear-gradient(180deg,#FFFDF8_0%,#FBF8F0_100%)] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8C9772]">
                Meeting Assistant
              </p>
              <h3 className="mt-1 flex items-center gap-2 text-[18px] font-semibold text-[#2F3526]">
                {view === 'recipes' ? (
                  <Wand2 size={17} className="text-[#647344]" />
                ) : (
                  <Sparkles size={17} className="text-[#647344]" />
                )}
                {title}
              </h3>
              <p className="mt-2 text-sm text-[#7D816C]">{headline}</p>
            </div>

            <div className="flex items-center gap-2">
              {view === 'recipes' && (
                <button
                  type="button"
                  onClick={onShowMessages}
                  className="rounded-full border border-[#D9DEC9] bg-white px-3 py-2 text-sm font-medium text-[#526038] transition-colors hover:bg-[#F5F7EE]"
                >
                  返回对话
                </button>
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((value) => !value)}
                  className="flex h-10 items-center gap-1 rounded-full border border-[#E1E6D5] bg-[#F7F8F1] px-3 text-[#55623D] transition-colors hover:bg-[#EEF2E3]"
                >
                  <MoreHorizontal size={16} />
                  <ChevronDown size={15} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.55rem)] z-10 w-40 overflow-hidden rounded-2xl border border-[#DDE3D0] bg-white p-1.5 shadow-[0_16px_36px_rgba(59,64,46,0.14)]">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setModalView('settings');
                      }}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#445033] transition-colors hover:bg-[#F4F7EC]"
                    >
                      AI 设置
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setModalView('speakers');
                      }}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#445033] transition-colors hover:bg-[#F4F7EC]"
                    >
                      说话人设置
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setModalView('templates');
                      }}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm text-[#445033] transition-colors hover:bg-[#F4F7EC]"
                    >
                      Recipe 管理
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E1E6D5] bg-[#F7F8F1] text-[#55623D] transition-colors hover:bg-[#EEF2E3]"
              >
                <X size={17} />
              </button>
            </div>
          </div>
        </div>

        {view === 'recipes' ? (
          <div className="max-h-[min(56vh,480px)] overflow-y-auto px-4 py-4">
            <div className="mb-3 rounded-[24px] border border-[#E4E9D8] bg-[#F8FAF2] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8C9772]">
                    Recipes
                  </p>
                  <p className="mt-1 text-sm text-[#5B6647]">
                    {recipeQuery
                      ? `筛选关键词：${recipeQuery}`
                      : '选择一个模板，直接让会议助手基于当前转写执行。'}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#6A7650] shadow-sm">
                  / 调用
                </span>
              </div>
            </div>

            {templatesLoading ? (
              <div className="flex min-h-[180px] items-center justify-center gap-3 rounded-[28px] border border-dashed border-[#DCE3CE] bg-[#FBFCF7] text-[#708053]">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">正在加载 Recipes…</span>
              </div>
            ) : templatesError ? (
              <div className="rounded-[28px] border border-[#E7D9CE] bg-[#FFF8F5] px-5 py-6 text-sm text-[#A4583A]">
                {templatesError}
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-[#DCE3CE] bg-[#FBFCF7] px-5 py-10 text-center">
                <p className="text-base font-semibold text-[#2F3526]">没有匹配的 Recipe</p>
                <p className="mt-2 text-sm leading-6 text-[#7D816C]">
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
                    className={`flex w-full items-start gap-3 rounded-[24px] border px-4 py-4 text-left transition-all ${
                      index === selectedTemplateIndex
                        ? 'border-[#C9D5AE] bg-[#F5F8EA] shadow-[0_12px_28px_rgba(100,115,68,0.08)]'
                        : 'border-[#ECEADD] bg-white hover:border-[#D9E0C8] hover:bg-[#FBFCF7]'
                    }`}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-[#EEF3DE] text-lg">
                      {template.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-semibold text-[#2F3526]">
                          {template.name}
                        </span>
                        <code className="rounded-full bg-[#F5F7EE] px-2 py-0.5 text-[11px] text-[#78825E]">
                          {template.command}
                        </code>
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-[#72785F]">
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
              <div className="rounded-[28px] border border-dashed border-[#DCE3CE] bg-[#FBFCF7] px-6 py-8">
                <div className="mx-auto flex max-w-[420px] flex-col items-center text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[22px] bg-white text-[#647344] shadow-sm">
                    <Sparkles size={22} />
                  </div>
                  <p className="text-[18px] font-semibold text-[#2F3526]">提问、追问，或者直接套用 Recipe</p>
                  <p className="mt-2 text-sm leading-6 text-[#7D816C]">
                    会议助手只围绕当前这场录音、转写和笔记回答，不再额外跳出独立模板浮层。
                  </p>

                  {emptyRecipes.length > 0 && (
                    <div className="mt-6 flex w-full flex-wrap justify-center gap-2">
                      {emptyRecipes.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => onSelectTemplate(template)}
                          className="rounded-full border border-[#DCE3CE] bg-white px-3 py-2 text-sm text-[#526038] transition-colors hover:bg-[#F4F7EC]"
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
                    className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      message.role === 'user'
                        ? 'bg-[#EEF2E3] text-[#55623D]'
                        : 'bg-[#F5F0E3] text-[#647344]'
                    }`}
                  >
                    {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div
                    className={`max-w-[82%] rounded-[22px] px-4 py-3 text-[14px] leading-6 shadow-sm ${
                      message.role === 'user'
                        ? 'rounded-tr-md bg-[#4E5E34] text-white'
                        : 'rounded-tl-md border border-[#E4E9D8] bg-white text-[#3E4631]'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    {message.role === 'assistant' && !message.content && isLoading ? (
                      <div className="flex items-center gap-2 text-[#647344]">
                        <Loader2 size={15} className="animate-spin" />
                        <span className="text-sm">思考中…</span>
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(47,53,38,0.14)] p-4 backdrop-blur-sm">
          <div className="w-full max-w-[560px] overflow-hidden rounded-[30px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E4E9D8] px-6 py-4">
              <h3 className="text-base font-semibold text-[#2F3526]">
                {modalView === 'settings' ? 'AI 设置' : '说话人设置'}
              </h3>
              <button
                type="button"
                onClick={() => setModalView('none')}
                className="rounded-full p-2 text-[#7D816C] transition-colors hover:bg-[#F4F7EC]"
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
