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
import { getWorkspaceModeConfig, getWorkspaceModeLabel } from '@/lib/workspace-mode';
import type { Workspace, WorkspaceWorkflowMode } from '@/lib/types';

const PRESET_COLORS = ['#94a3b8', '#f87171', '#fb923c', '#fbbf24', '#4ade80', '#38bdf8', '#a78bfa', '#f472b6'];
const DEFAULT_COLOR = PRESET_COLORS[0];

interface WorkspaceDraft {
  name: string;
  description: string;
  color: string;
  icon: WorkspaceIconKey;
  workflowMode: WorkspaceWorkflowMode;
  modeLabel: string;
}

type WorkspaceModalMode = 'create' | 'edit';

interface WorkspaceModalProps {
  open: boolean;
  mode: WorkspaceModalMode;
  workspace?: Workspace | null;
  onClose: () => void;
  onSubmit: (input: WorkspaceDraft) => Promise<void>;
}

const DEFAULT_DRAFT: WorkspaceDraft = {
  name: '',
  description: '',
  color: DEFAULT_COLOR,
  icon: getDefaultWorkspaceIconKey(),
  workflowMode: 'general',
  modeLabel: '',
};

function normalizeIcon(icon?: string | null): WorkspaceIconKey {
  if (icon && WORKSPACE_ICON_OPTIONS.some((option) => option.key === icon)) {
    return icon as WorkspaceIconKey;
  }
  return getDefaultWorkspaceIconKey();
}

function toDraft(workspace?: Workspace | null): WorkspaceDraft {
  if (!workspace) {
    return {
      ...DEFAULT_DRAFT,
      icon: getDefaultWorkspaceIconKey(),
    };
  }

  return {
    name: workspace.name,
    description: workspace.description || '',
    color: workspace.color,
    icon: normalizeIcon(workspace.icon),
    workflowMode: workspace.workflowMode || 'general',
    modeLabel: workspace.modeLabel || '',
  };
}

export default function WorkspaceModal({
  open,
  mode,
  workspace,
  onClose,
  onSubmit,
}: WorkspaceModalProps) {
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<WorkspaceDraft>(DEFAULT_DRAFT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [iconTouched, setIconTouched] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setDraft(toDraft(workspace));
    setError('');
    setIsSubmitting(false);
    setIconTouched(mode === 'edit');
  }, [mode, open, workspace]);

  const suggestedIcon = useMemo(() => suggestWorkspaceIconKey(draft.name), [draft.name]);

  useEffect(() => {
    if (!open || !mounted) return;
    const frame = window.requestAnimationFrame(() => {
      nameInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mounted, open]);

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

  useEffect(() => {
    if (!open || mode !== 'create' || iconTouched) return;
    const nextIcon = suggestWorkspaceIconKey(draft.name);
    setDraft((current) => (current.icon === nextIcon ? current : { ...current, icon: nextIcon }));
  }, [draft.name, iconTouched, mode, open]);

  const previewName = useMemo(
    () => draft.name.trim() || (mode === 'create' ? '新工作区' : '工作区名称'),
    [draft.name, mode]
  );
  const previewDescription = useMemo(
    () => draft.description.trim() || '简短描述，可选',
    [draft.description]
  );

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
        workflowMode: draft.workflowMode,
        modeLabel: draft.modeLabel,
      });
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '保存失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = mode === 'create' ? '创建工作区' : '编辑工作区';
  const subtitle = mode === 'create' ? '把不同主题分开管理' : '更新名称、图标和颜色';
  const submitLabel = mode === 'create' ? '创建' : '保存';

  const modalContent = (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#2B2420]/26 p-4 backdrop-blur-sm sm:p-6">
      <button
        type="button"
        aria-label="关闭工作区弹窗"
        className="absolute inset-0 cursor-default"
        onClick={handleClose}
      />

      <div className="relative z-10 flex w-full max-h-[90vh] max-w-[720px] flex-col overflow-hidden rounded-[32px] border border-[#E3D9CE]/70 bg-[#FCF9F5] shadow-[0_30px_80px_rgba(58,46,37,0.18)] animate-in fade-in zoom-in-95 duration-200">
        <div className="shrink-0 flex items-start justify-between border-b border-[#E8DED3] px-6 py-5 sm:px-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#B29F8B]">Workspace</p>
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

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="grid gap-6 px-6 py-6 sm:px-7 lg:grid-cols-[minmax(0,1.2fr)_280px]">
            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#5C4D42]">模式</span>
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F5EEE5] p-1.5">
                  {[
                    {
                      value: 'general',
                      label: '通用',
                      description: '项目、客户、研究等泛用工作流',
                    },
                    {
                      value: 'interview',
                      label: '面试',
                      description: '候选人、多轮面试和交接',
                    },
                  ].map((option) => {
                    const active = draft.workflowMode === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            workflowMode: option.value as WorkspaceWorkflowMode,
                          }))
                        }
                        className={`rounded-[18px] px-3 py-3 text-left transition-all ${
                          active
                            ? 'bg-white shadow-sm ring-1 ring-[#E3D9CE]'
                            : 'text-[#7B6A5B] hover:bg-white/70'
                        }`}
                      >
                        <div className="text-sm font-semibold text-[#3A2E25]">{option.label}</div>
                        <div className="mt-1 text-xs leading-5 text-[#8B796A]">
                          {option.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#5C4D42]">模式名称</span>
                <input
                  value={draft.modeLabel}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, modeLabel: event.target.value }))
                  }
                  placeholder={getWorkspaceModeConfig(draft.workflowMode).defaultLabel}
                  className="w-full rounded-2xl border border-[#D8CEC4] bg-white px-4 py-3 text-sm text-[#3A2E25] placeholder:text-[#AE9D8E] focus:border-[#C2B3A4] focus:outline-none focus:ring-4 focus:ring-[#EADFD3]/70"
                />
              </label>

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
                  placeholder="例如：Acme 项目"
                  className="w-full rounded-2xl border border-[#D8CEC4] bg-white px-4 py-3 text-sm text-[#3A2E25] placeholder:text-[#AE9D8E] focus:border-[#C2B3A4] focus:outline-none focus:ring-4 focus:ring-[#EADFD3]/70"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#5C4D42]">描述</span>
                <textarea
                  value={draft.description}
                  onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="一句话说明用途，可选"
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-[#D8CEC4] bg-white px-4 py-3 text-sm leading-6 text-[#3A2E25] placeholder:text-[#AE9D8E] focus:border-[#C2B3A4] focus:outline-none focus:ring-4 focus:ring-[#EADFD3]/70"
                />
              </label>

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
                <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-5">
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
                        title={option.label}
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
                        <span
                          className="h-7 w-7 rounded-full"
                          style={{ backgroundColor: color }}
                        />
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
                    <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#A09082]">
                      {getWorkspaceModeLabel(draft)}
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs text-[#A09082]">{previewDescription}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[22px] bg-[#F7F2EB] px-4 py-4 text-sm leading-6 text-[#7B6A5B]">
                {draft.workflowMode === 'interview'
                  ? '面试模板下，Collection 会作为候选人档案，每一场 Meeting 对应一轮面试与交接记录。'
                  : '通用模板下，Collection 用来整理主题、客户或子项目，适合常规会议管理。'}
              </div>

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
            {mode === 'create' ? '创建后会自动切换' : '保存后立即生效'}
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
              disabled={!draft.name.trim() || isSubmitting}
              className="inline-flex min-w-[112px] items-center justify-center gap-2 rounded-2xl bg-[#4A3C31] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#3A2E25] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : mode === 'create' ? <Plus size={16} /> : <Pencil size={16} />}
              {isSubmitting ? '保存中...' : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
