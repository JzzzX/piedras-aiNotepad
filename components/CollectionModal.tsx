'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Pencil, Plus, WandSparkles, X } from 'lucide-react';
import WorkspaceIconBadge from '@/components/WorkspaceIconBadge';
import {
  getDefaultWorkspaceIconKey,
  suggestWorkspaceIconKey,
  WORKSPACE_ICON_OPTIONS,
  type WorkspaceIconKey,
} from '@/lib/workspace-icons';
import { CANDIDATE_STATUS_OPTIONS } from '@/lib/interview';
import type { CandidateStatus, Collection, WorkspaceWorkflowMode } from '@/lib/types';

const PRESET_COLORS = ['#94a3b8', '#f87171', '#fb923c', '#fbbf24', '#4ade80', '#38bdf8', '#a78bfa', '#f472b6'];
const DEFAULT_COLOR = PRESET_COLORS[0];

interface CollectionDraft {
  name: string;
  description: string;
  color: string;
  icon: WorkspaceIconKey;
  candidateStatus: CandidateStatus;
  nextInterviewer: string;
  nextFocus: string;
}

type CollectionModalMode = 'create' | 'edit';

interface CollectionModalProps {
  open: boolean;
  mode: CollectionModalMode;
  collection?: Collection | null;
  workflowMode?: WorkspaceWorkflowMode;
  onClose: () => void;
  onSubmit: (input: CollectionDraft) => Promise<void>;
}

const DEFAULT_DRAFT: CollectionDraft = {
  name: '',
  description: '',
  color: DEFAULT_COLOR,
  icon: getDefaultWorkspaceIconKey(),
  candidateStatus: 'new',
  nextInterviewer: '',
  nextFocus: '',
};

function normalizeIcon(icon?: string | null): WorkspaceIconKey {
  if (icon && WORKSPACE_ICON_OPTIONS.some((option) => option.key === icon)) {
    return icon as WorkspaceIconKey;
  }
  return getDefaultWorkspaceIconKey();
}

function toDraft(collection?: Collection | null): CollectionDraft {
  if (!collection) return DEFAULT_DRAFT;

  return {
    name: collection.name,
    description: collection.description || '',
    color: collection.color,
    icon: normalizeIcon(collection.icon),
    candidateStatus: collection.candidateStatus || 'new',
    nextInterviewer: collection.nextInterviewer || '',
    nextFocus: collection.nextFocus || '',
  };
}

export default function CollectionModal({
  open,
  mode,
  collection,
  workflowMode = 'general',
  onClose,
  onSubmit,
}: CollectionModalProps) {
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<CollectionDraft>(DEFAULT_DRAFT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [iconTouched, setIconTouched] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setDraft(toDraft(collection));
    setError('');
    setIsSubmitting(false);
    setIconTouched(mode === 'edit');
  }, [collection, mode, open]);

  useEffect(() => {
    if (!open || !mounted) return;
    const frame = window.requestAnimationFrame(() => {
      nameInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mounted, open]);

  useEffect(() => {
    if (!open || mode !== 'create' || iconTouched) return;
    const nextIcon = suggestWorkspaceIconKey(draft.name);
    setDraft((current) => (current.icon === nextIcon ? current : { ...current, icon: nextIcon }));
  }, [draft.name, iconTouched, mode, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose, open]);

  const previewName = useMemo(
    () =>
      draft.name.trim() ||
      (mode === 'create'
        ? workflowMode === 'interview'
          ? '新候选人'
          : '新 Collection'
        : workflowMode === 'interview'
          ? '候选人名称'
          : 'Collection 名称'),
    [draft.name, mode, workflowMode]
  );
  const previewDescription = useMemo(
    () => draft.description.trim() || '用来承接这组会议与笔记',
    [draft.description]
  );
  const suggestedIcon = useMemo(() => suggestWorkspaceIconKey(draft.name), [draft.name]);

  if (!open || !mounted) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!draft.name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    try {
      await onSubmit({
        name: draft.name.trim(),
        description: draft.description.trim(),
        color: draft.color,
        icon: draft.icon,
        candidateStatus: draft.candidateStatus,
        nextInterviewer: draft.nextInterviewer.trim(),
        nextFocus: draft.nextFocus.trim(),
      });
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '保存失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const noun = workflowMode === 'interview' ? '候选人' : 'Collection';
  const title = mode === 'create' ? `创建${noun}` : `编辑${noun}`;
  const subtitle =
    workflowMode === 'interview'
      ? mode === 'create'
        ? '为这个候选人建立多轮面试与交接档案'
        : '更新候选人信息和交接上下文'
      : mode === 'create'
        ? '把同类会议收进一个二级空间'
        : '更新名称、图标和颜色';
  const submitLabel = mode === 'create' ? '创建' : '保存';

  return createPortal(
    <div className="fixed inset-0 z-[115] flex items-center justify-center bg-[#2B2420]/26 p-4 backdrop-blur-sm sm:p-6">
      <button
        type="button"
        aria-label="关闭 Collection 弹窗"
        className="absolute inset-0 cursor-default"
        onClick={handleClose}
      />

      <div className="relative z-10 flex w-full max-h-[90vh] max-w-[720px] flex-col overflow-hidden rounded-[32px] border border-[#E3D9CE]/70 bg-[#FCF9F5] shadow-[0_30px_80px_rgba(58,46,37,0.18)]">
        <div className="shrink-0 flex items-start justify-between border-b border-[#E8DED3] px-6 py-5 sm:px-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#B29F8B]">
              {workflowMode === 'interview' ? 'Candidate' : 'Collection'}
            </p>
            <h2 className="mt-2 font-song text-[24px] font-semibold text-[#3A2E25]">{title}</h2>
            <p className="mt-2 text-sm text-[#7B6A5B]">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 text-[#9D8B7B] transition-colors hover:bg-white/80 hover:text-[#5C4D42]"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-6 px-6 py-6 sm:px-7 lg:grid-cols-[minmax(0,1.2fr)_280px]">
            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#5C4D42]">名称</span>
                <input
                  ref={nameInputRef}
                  value={draft.name}
                  onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void handleSubmit();
                    }
                  }}
                  placeholder={workflowMode === 'interview' ? '例如：王小明' : '例如：销售、政策研究'}
                  className="w-full rounded-2xl border border-[#D8CEC4] bg-white px-4 py-3 text-sm text-[#3A2E25] placeholder:text-[#AE9D8E] focus:border-[#C2B3A4] focus:outline-none focus:ring-4 focus:ring-[#EADFD3]/70"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#5C4D42]">描述</span>
                <textarea
                  value={draft.description}
                  onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="一句话说明这组会议的用途，可选"
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-[#D8CEC4] bg-white px-4 py-3 text-sm leading-6 text-[#3A2E25] placeholder:text-[#AE9D8E] focus:border-[#C2B3A4] focus:outline-none focus:ring-4 focus:ring-[#EADFD3]/70"
                />
              </label>

              {workflowMode === 'interview' ? (
                <>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#5C4D42]">当前状态</span>
                    <select
                      value={draft.candidateStatus}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          candidateStatus: event.target.value as CandidateStatus,
                        }))
                      }
                      className="w-full rounded-2xl border border-[#D8CEC4] bg-white px-4 py-3 text-sm text-[#3A2E25] focus:border-[#C2B3A4] focus:outline-none focus:ring-4 focus:ring-[#EADFD3]/70"
                    >
                      {CANDIDATE_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#5C4D42]">下一位面试官</span>
                    <input
                      value={draft.nextInterviewer}
                      onChange={(event) =>
                        setDraft((prev) => ({ ...prev, nextInterviewer: event.target.value }))
                      }
                      placeholder="例如：技术负责人 / HRBP"
                      className="w-full rounded-2xl border border-[#D8CEC4] bg-white px-4 py-3 text-sm text-[#3A2E25] placeholder:text-[#AE9D8E] focus:border-[#C2B3A4] focus:outline-none focus:ring-4 focus:ring-[#EADFD3]/70"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#5C4D42]">下一轮重点</span>
                    <textarea
                      value={draft.nextFocus}
                      onChange={(event) =>
                        setDraft((prev) => ({ ...prev, nextFocus: event.target.value }))
                      }
                      placeholder="例如：深挖系统设计、文化匹配和沟通方式"
                      rows={3}
                      className="w-full resize-none rounded-2xl border border-[#D8CEC4] bg-white px-4 py-3 text-sm leading-6 text-[#3A2E25] placeholder:text-[#AE9D8E] focus:border-[#C2B3A4] focus:outline-none focus:ring-4 focus:ring-[#EADFD3]/70"
                    />
                  </label>
                </>
              ) : null}

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="block text-sm font-medium text-[#5C4D42]">图标</span>
                  {mode === 'create' ? (
                    <span className="inline-flex items-center gap-1 text-xs text-[#9D8B7B]">
                      <WandSparkles size={12} />
                      自动推荐
                    </span>
                  ) : null}
                </div>
                <div className="grid grid-cols-5 gap-2.5">
                  {WORKSPACE_ICON_OPTIONS.map((option) => {
                    const selected = draft.icon === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => {
                          setIconTouched(true);
                          setDraft((prev) => ({ ...prev, icon: option.key }));
                        }}
                        className={`rounded-2xl border px-3 py-2.5 transition-all ${
                          selected
                            ? 'border-[#5C4D42] bg-white shadow-sm ring-2 ring-[#E8DED3]'
                            : 'border-transparent bg-white/70 hover:border-[#D8CEC4] hover:bg-white'
                        }`}
                        aria-label={`选择图标 ${option.label}`}
                      >
                        <div className="flex items-center justify-center">
                          <WorkspaceIconBadge icon={option.key} color={draft.color} size="sm" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="mb-3 block text-sm font-medium text-[#5C4D42]">颜色</span>
                <div className="flex flex-wrap gap-3">
                  {PRESET_COLORS.map((color) => {
                    const selected = draft.color === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setDraft((prev) => ({ ...prev, color }))}
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all ${
                          selected
                            ? 'border-[#5C4D42] bg-white shadow-sm ring-2 ring-[#E8DED3]'
                            : 'border-transparent bg-white/70 hover:border-[#D8CEC4] hover:bg-white'
                        }`}
                        aria-label={`选择颜色 ${color}`}
                      >
                        <span className="h-7 w-7 rounded-full" style={{ backgroundColor: color }} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-[#E8DED3] bg-white/80 p-5 shadow-sm lg:sticky lg:top-0 lg:h-fit">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#B29F8B]">
                预览
              </div>

              <div className="mt-5 rounded-[24px] border border-[#E3D9CE] bg-white p-4 shadow-[0_10px_20px_rgba(58,46,37,0.08)]">
                <div className="flex items-center gap-3">
                  <WorkspaceIconBadge icon={draft.icon} color={draft.color} size="lg" />
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-[#3A2E25]">{previewName}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-[#A09082]">{previewDescription}</div>
                  </div>
                </div>
              </div>

              {workflowMode === 'interview' ? (
                <div className="mt-4 rounded-[22px] bg-[#F7F2EB] px-4 py-4 text-sm leading-6 text-[#7B6A5B]">
                  下一位面试官：{draft.nextInterviewer.trim() || '待定'}
                  <br />
                  下一轮重点：{draft.nextFocus.trim() || '待补充'}
                </div>
              ) : null}

              {mode === 'create' ? (
                <div className="mt-4 flex items-center gap-2 text-xs text-[#9D8B7B]">
                  <WorkspaceIconBadge icon={suggestedIcon} color={draft.color} size="sm" />
                  当前推荐：{WORKSPACE_ICON_OPTIONS.find((option) => option.key === suggestedIcon)?.label || '通用'}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-between border-t border-[#E8DED3] bg-white/60 px-6 py-4 sm:px-7">
          <div className="hidden items-center gap-2 text-sm text-[#9D8B7B] sm:flex">
            {mode === 'create' ? <Plus size={15} /> : <Pencil size={15} />}
            {mode === 'create' ? '创建后可继续把会议移进来' : '保存后立即生效'}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-2xl px-4 py-2.5 text-sm font-medium text-[#8C7A6B] transition-colors hover:bg-[#F3ECE5] hover:text-[#5C4D42]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || !draft.name.trim()}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#3A2E25] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2B2420] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
