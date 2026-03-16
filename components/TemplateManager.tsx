'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronUp, ChevronDown, Plus, Trash2, X } from 'lucide-react';
import type { Recipe as Template } from '@/lib/types';
import { TEMPLATE_CATEGORIES } from '@/lib/templates';

interface TemplateForm {
  name: string;
  command: string;
  icon: string;
  description: string;
  prompt: string;
  category: string;
}

interface TemplateManagerProps {
  open: boolean;
  templates: Template[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}

const DEFAULT_FORM: TemplateForm = {
  name: '',
  command: '',
  icon: '📝',
  description: '',
  prompt: '',
  category: '记录',
};

function toForm(template: Template): TemplateForm {
  return {
    name: template.name,
    command: template.command,
    icon: template.icon,
    description: template.description,
    prompt: template.prompt,
    category: template.category,
  };
}

export default function TemplateManager({
  open,
  templates,
  onClose,
  onSaved,
}: TemplateManagerProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<TemplateForm>(DEFAULT_FORM);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedId) || null,
    [templates, selectedId]
  );
  const isReadOnly = !!selectedTemplate?.isSystem;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (isCreating) {
      setForm(DEFAULT_FORM);
    } else if (selectedTemplate) {
      setForm(toForm(selectedTemplate));
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [isCreating, open, selectedTemplate]);

  useEffect(() => {
    if (!open) return;
    if (templates.length === 0) {
      if (!isCreating) {
        setSelectedId(null);
      }
      return;
    }
    if (!isCreating && (!selectedId || !templates.some((t) => t.id === selectedId))) {
      setSelectedId(templates[0].id);
    }
  }, [isCreating, open, templates, selectedId]);

  useEffect(() => {
    if (open) return;
    setIsCreating(false);
    setSelectedId(null);
    setForm(DEFAULT_FORM);
    setError('');
  }, [open]);

  if (!open || !mounted) return null;

  const reorderTemplate = async (templateId: string, direction: 'up' | 'down') => {
    const idx = templates.findIndex((t) => t.id === templateId);
    if (idx < 0) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= templates.length) return;

    const orderedIds = [...templates.map((t) => t.id)];
    [orderedIds[idx], orderedIds[targetIdx]] = [orderedIds[targetIdx], orderedIds[idx]];

    setIsBusy(true);
    setError('');
    try {
      const res = await fetch('/api/recipes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Recipe 排序失败');
      }
      await onSaved();
      setSelectedId(templateId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Recipe 排序失败');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSave = async () => {
    setIsBusy(true);
    setError('');
    try {
      const isUpdate = !!selectedTemplate && !selectedTemplate.isSystem;
      const url = isUpdate ? `/api/recipes/${selectedTemplate.id}` : '/api/recipes';
      const method = isUpdate ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || '保存 Recipe 失败');
      }
      await onSaved();
      setIsCreating(false);
      setSelectedId(data.id || selectedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存 Recipe 失败');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate || selectedTemplate.isSystem) return;
    const confirmed = window.confirm(`确认删除 Recipe「${selectedTemplate.name}」？`);
    if (!confirmed) return;

    setIsBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/recipes/${selectedTemplate.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || '删除 Recipe 失败');
      }
      await onSaved();
      setIsCreating(false);
      setSelectedId(null);
      setForm(DEFAULT_FORM);
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除 Recipe 失败');
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setSelectedId(null);
    setForm(DEFAULT_FORM);
    setError('');
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 sm:p-6 transition-all">
      <div className="flex h-[82vh] max-h-[720px] w-full max-w-[960px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-zinc-100 bg-white px-5 py-4">
          <div>
            <h3 className="font-song text-[16px] font-semibold text-zinc-800">Recipe 管理</h3>
            <p className="mt-0.5 text-[12px] text-zinc-500">创建、编辑、删除与排序</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body: sidebar + editor */}
        <div className="relative flex min-h-0 flex-1 overflow-hidden bg-white">
          {/* Left sidebar */}
          <div className="flex w-[220px] shrink-0 flex-col border-r border-zinc-100 bg-zinc-50/80 sm:w-[250px]">
            <div className="shrink-0 p-3">
              <button
                onClick={handleCreateNew}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 bg-white px-3 py-2.5 text-[13px] font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-800 shadow-sm"
              >
                <Plus size={15} />
                新建 Recipe
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 custom-scrollbar">
              {templates.map((template, idx) => {
                const isSelected = !isCreating && template.id === selectedId;
                return (
                  <div
                    key={template.id}
                    className={`group mb-1 flex items-center gap-1 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-white shadow-sm ring-1 ring-zinc-200/80'
                        : 'hover:bg-white/60'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setIsCreating(false);
                        setSelectedId(template.id);
                        setError('');
                      }}
                      className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left"
                    >
                      <span className="shrink-0 text-base">{template.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="truncate text-[13px] font-medium text-zinc-700">
                            {template.name}
                          </span>
                          {template.isSystem && (
                            <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                              系统
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[11px] text-zinc-400 font-mono">
                          {template.command}
                        </p>
                      </div>
                    </button>

                    {/* Reorder buttons - compact, shown on hover */}
                    <div className="flex shrink-0 flex-col opacity-0 transition-opacity group-hover:opacity-100 pr-1.5 gap-0.5">
                      <button
                        onClick={() => reorderTemplate(template.id, 'up')}
                        disabled={idx === 0 || isBusy}
                        className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-0"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => reorderTemplate(template.id, 'down')}
                        disabled={idx === templates.length - 1 || isBusy}
                        className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-0"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right editor */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              {isCreating && (
                <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-3 text-[13px] text-emerald-700">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                  正在创建自定义 Recipe
                </div>
              )}

              <div className="grid grid-cols-2 gap-5">
                <label className="text-[12px] font-medium text-zinc-600">
                  名称
                  <input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    disabled={isReadOnly || isBusy}
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 focus:border-zinc-400 focus:outline-none focus:ring-4 focus:ring-zinc-100/50 disabled:bg-zinc-50/80 disabled:text-zinc-500 transition-all"
                  />
                </label>
                <label className="text-[12px] font-medium text-zinc-600">
                  命令
                  <input
                    value={form.command}
                    onChange={(e) => setForm((prev) => ({ ...prev, command: e.target.value }))}
                    placeholder="/custom"
                    disabled={isReadOnly || isBusy}
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm font-mono text-zinc-800 focus:border-zinc-400 focus:outline-none focus:ring-4 focus:ring-zinc-100/50 disabled:bg-zinc-50/80 disabled:text-zinc-500 transition-all"
                  />
                </label>
                <label className="text-[12px] font-medium text-zinc-600">
                  图标
                  <input
                    value={form.icon}
                    onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
                    disabled={isReadOnly || isBusy}
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 focus:border-zinc-400 focus:outline-none focus:ring-4 focus:ring-zinc-100/50 disabled:bg-zinc-50/80 disabled:text-zinc-500 transition-all"
                  />
                </label>
                <label className="text-[12px] font-medium text-zinc-600">
                  分类
                  <select
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    disabled={isReadOnly || isBusy}
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 focus:border-zinc-400 focus:outline-none focus:ring-4 focus:ring-zinc-100/50 disabled:bg-zinc-50/80 disabled:text-zinc-500 transition-all"
                  >
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="mt-5 block text-[12px] font-medium text-zinc-600">
                描述
                <input
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  disabled={isReadOnly || isBusy}
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 focus:border-zinc-400 focus:outline-none focus:ring-4 focus:ring-zinc-100/50 disabled:bg-zinc-50/80 disabled:text-zinc-500 transition-all"
                />
              </label>

              <label className="mt-5 block text-[12px] font-medium text-zinc-600">
                Prompt
                <textarea
                  value={form.prompt}
                  onChange={(e) => setForm((prev) => ({ ...prev, prompt: e.target.value }))}
                  disabled={isReadOnly || isBusy}
                  className="mt-1.5 min-h-[160px] w-full resize-y rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-zinc-800 focus:border-zinc-400 focus:outline-none focus:ring-4 focus:ring-zinc-100/50 disabled:bg-zinc-50/80 disabled:text-zinc-500 transition-all"
                />
              </label>

              {error && <p className="mt-3 text-[13px] text-red-500 flex items-center gap-1.5"><X size={14}/>{error}</p>}
              {isReadOnly && (
                <div className="mt-5 flex items-center gap-2 rounded-xl bg-zinc-50 px-4 py-3 text-[12px] text-zinc-500 border border-zinc-100">
                  <span className="text-zinc-400">ℹ️</span>
                  系统 Recipe 只读，如需改造请点击左侧「新建 Recipe」。
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-zinc-100 bg-white px-6 py-4">
              {selectedTemplate && !selectedTemplate.isSystem && (
                <button
                  onClick={handleDelete}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-[13px] font-medium text-red-500 transition-all hover:bg-red-50 hover:border-red-300 disabled:opacity-40"
                >
                  <Trash2 size={14} />
                  删除
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={isBusy || isReadOnly}
                className="rounded-xl bg-zinc-900 px-6 py-2 text-[13px] font-medium text-white shadow-sm transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
              >
                {isCreating
                  ? '创建 Recipe'
                  : selectedTemplate && !selectedTemplate.isSystem
                    ? '保存修改'
                    : '创建 Recipe'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    );

  return createPortal(modalContent, document.body);
}
