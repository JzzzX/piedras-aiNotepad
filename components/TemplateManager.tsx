'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import type { Template } from '@/lib/types';
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

  if (!open) return null;

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
      const res = await fetch('/api/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || '模板排序失败');
      }
      await onSaved();
      setSelectedId(templateId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '模板排序失败');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSave = async () => {
    setIsBusy(true);
    setError('');
    try {
      const isUpdate = !!selectedTemplate && !selectedTemplate.isSystem;
      const url = isUpdate ? `/api/templates/${selectedTemplate.id}` : '/api/templates';
      const method = isUpdate ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || '保存模板失败');
      }
      await onSaved();
      setIsCreating(false);
      setSelectedId(data.id || selectedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存模板失败');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate || selectedTemplate.isSystem) return;
    const confirmed = window.confirm(`确认删除模板「${selectedTemplate.name}」？`);
    if (!confirmed) return;

    setIsBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/templates/${selectedTemplate.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || '删除模板失败');
      }
      await onSaved();
      setIsCreating(false);
      setSelectedId(null);
      setForm(DEFAULT_FORM);
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除模板失败');
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 backdrop-blur-sm transition-all sm:items-center sm:p-4">
      <div className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white/90 backdrop-blur-2xl shadow-2xl ring-1 ring-black/5 sm:h-[min(84vh,760px)] sm:max-h-none sm:w-[min(980px,100%)] sm:rounded-2xl animate-in fade-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
        <div className="flex items-center justify-between border-b border-zinc-200/60 px-4 py-3 bg-white/50">
          <div>
            <h3 className="font-song text-[15px] font-semibold text-zinc-800">模板管理</h3>
            <p className="text-xs text-zinc-500">支持创建、编辑、删除与排序</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 active:bg-zinc-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="flex min-h-0 max-h-[35vh] flex-col border-b border-zinc-200/60 bg-zinc-50/30 p-3 lg:max-h-none lg:border-b-0 lg:border-r">
            <button
              onClick={handleCreateNew}
              className="mb-3 flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 bg-white/50 px-3 py-2.5 text-[13px] font-medium text-zinc-600 shadow-sm transition-colors hover:border-zinc-400 hover:text-zinc-800 active:bg-zinc-100"
            >
              <Plus size={15} />
              新建用户模板
            </button>

            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1 pb-1">
              {templates.map((template, idx) => (
                <div
                  key={template.id}
                  className={`rounded-xl border px-3 py-2.5 transition-all ${
                    !isCreating && template.id === selectedId
                      ? 'border-zinc-300 bg-white shadow-sm ring-1 ring-black/5'
                      : 'border-transparent bg-transparent hover:bg-zinc-100/50'
                  }`}
                >
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setSelectedId(template.id);
                      setError('');
                    }}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[14px] font-medium text-zinc-800 flex items-center gap-1.5">
                        <span className="text-base">{template.icon}</span>
                        {template.name}
                      </span>
                      {template.isSystem && (
                        <span className="shrink-0 rounded-full bg-zinc-100 border border-zinc-200/60 px-2 py-0.5 text-[10px] text-zinc-500 font-medium">
                          系统
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-zinc-400 font-mono bg-zinc-100/50 inline-block px-1.5 py-0.5 rounded">{template.command}</p>
                  </button>
                  <div className="mt-2 flex justify-end gap-1.5">
                    <button
                      onClick={() => reorderTemplate(template.id, 'up')}
                      disabled={idx === 0 || isBusy}
                      className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => reorderTemplate(template.id, 'down')}
                      disabled={idx === templates.length - 1 || isBusy}
                      className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col bg-white/40">
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              {isCreating && (
                <div className="mb-4 rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-3 text-[13px] text-emerald-700 shadow-sm flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  正在创建用户模板，请在下方填写信息
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-xs text-zinc-500">
                  名称
                  <input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    disabled={isReadOnly || isBusy}
                    className="mt-1 w-full rounded-xl border border-zinc-200/60 bg-white/50 px-3 py-2 text-sm text-zinc-700 transition-all focus:border-zinc-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-zinc-100 disabled:bg-zinc-50/50"
                  />
                </label>
                <label className="text-xs text-zinc-500">
                  命令
                  <input
                    value={form.command}
                    onChange={(e) => setForm((prev) => ({ ...prev, command: e.target.value }))}
                    placeholder="/custom"
                    disabled={isReadOnly || isBusy}
                    className="mt-1 w-full rounded-xl border border-zinc-200/60 bg-white/50 px-3 py-2 text-sm text-zinc-700 transition-all focus:border-zinc-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-zinc-100 disabled:bg-zinc-50/50"
                  />
                </label>
                <label className="text-xs text-zinc-500">
                  图标
                  <input
                    value={form.icon}
                    onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
                    disabled={isReadOnly || isBusy}
                    className="mt-1 w-full rounded-xl border border-zinc-200/60 bg-white/50 px-3 py-2 text-sm text-zinc-700 transition-all focus:border-zinc-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-zinc-100 disabled:bg-zinc-50/50"
                  />
                </label>
                <label className="text-xs text-zinc-500">
                  分类
                  <select
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    disabled={isReadOnly || isBusy}
                    className="mt-1 w-full rounded-xl border border-zinc-200/60 bg-white/50 px-3 py-2 text-sm text-zinc-700 transition-all focus:border-zinc-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-zinc-100 disabled:bg-zinc-50/50"
                  >
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="mt-3 block text-xs text-zinc-500">
                描述
                <input
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  disabled={isReadOnly || isBusy}
                  className="mt-1 w-full rounded-xl border border-zinc-200/60 bg-white/50 px-3 py-2 text-sm text-zinc-700 transition-all focus:border-zinc-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-zinc-100 disabled:bg-zinc-50/50"
                />
              </label>

              <label className="mt-3 block text-xs text-zinc-500">
                Prompt
                <textarea
                  value={form.prompt}
                  onChange={(e) => setForm((prev) => ({ ...prev, prompt: e.target.value }))}
                  disabled={isReadOnly || isBusy}
                  className="mt-1 min-h-[220px] w-full resize-y rounded-xl border border-zinc-200/60 bg-white/50 px-3 py-2 text-sm text-zinc-700 transition-all focus:border-zinc-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-zinc-100 disabled:bg-zinc-50/50 sm:min-h-[320px]"
                />
              </label>

              {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
              {isReadOnly && (
                <p className="mt-2 text-xs text-zinc-400">系统模板只读，如需改造请“新建用户模板”。</p>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-zinc-200/60 bg-white/50 px-4 py-4 sm:px-5 pb-safe">
              {selectedTemplate && !selectedTemplate.isSystem && (
                <button
                  onClick={handleDelete}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 rounded-xl border border-red-200/60 bg-white px-4 py-2 text-[13px] font-medium text-red-500 shadow-sm transition-all hover:bg-red-50 hover:border-red-300 disabled:opacity-40 active:scale-95"
                >
                  <Trash2 size={14} />
                  删除
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={isBusy || isReadOnly}
                className="rounded-xl bg-zinc-900 px-5 py-2 text-[13px] font-medium text-white shadow-md transition-all hover:bg-zinc-800 disabled:opacity-40 active:scale-95"
              >
                {isCreating ? '创建模板' : selectedTemplate && !selectedTemplate.isSystem ? '保存修改' : '创建模板'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
