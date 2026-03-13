'use client';

import { useEffect, useState } from 'react';
import type { Template } from '@/lib/types';
import { TEMPLATE_CATEGORIES } from '@/lib/templates';
import { ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react';

interface TemplateForm {
  name: string;
  command: string;
  icon: string;
  description: string;
  prompt: string;
  category: string;
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

export default function TemplateManagerInline() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<TemplateForm>(DEFAULT_FORM);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => { void loadTemplates(); }, []);

  const selected = templates.find((t) => t.id === selectedId);
  const isReadOnly = Boolean(selected?.isSystem && !isCreating);

  const handleSelect = (t: Template) => {
    setSelectedId(t.id);
    setForm(toForm(t));
    setIsCreating(false);
    setError('');
  };

  const handleNew = () => {
    setSelectedId(null);
    setForm(DEFAULT_FORM);
    setIsCreating(true);
    setError('');
  };

  const handleSave = async () => {
    if (isReadOnly) return;

    setIsBusy(true);
    setError('');
    try {
      const isUpdate = Boolean(selectedId && selected && !selected.isSystem && !isCreating);
      const method = isUpdate ? 'PUT' : 'POST';
      const url = isUpdate ? `/api/templates/${selectedId}` : '/api/templates';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '保存失败');
      }
      await loadTemplates();
      if (isCreating) {
        const data = await res.json().catch(() => null);
        if (data?.id) setSelectedId(data.id);
        setIsCreating(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId || !window.confirm('确定删除这个模板？')) return;
    setIsBusy(true);
    try {
      await fetch(`/api/templates/${selectedId}`, { method: 'DELETE' });
      setSelectedId(null);
      setForm(DEFAULT_FORM);
      setIsCreating(false);
      await loadTemplates();
    } finally {
      setIsBusy(false);
    }
  };

  const reorder = async (id: string, direction: 'up' | 'down') => {
    const idx = templates.findIndex((t) => t.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= templates.length) return;
    const ordered = [...templates];
    [ordered[idx], ordered[swapIdx]] = [ordered[swapIdx], ordered[idx]];
    setTemplates(ordered);
    await fetch('/api/templates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: ordered.map((t) => t.id) }),
    });
  };

  return (
    <div className="flex h-[500px] overflow-hidden rounded-2xl border border-[#E3D9CE] bg-white">
      {/* Sidebar list */}
      <div className="flex w-48 shrink-0 flex-col border-r border-[#E3D9CE] bg-[#FCFAF8]">
        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {templates.map((t) => (
            <div key={t.id} className="group relative">
              <button
                onClick={() => handleSelect(t)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                  t.id === selectedId ? 'bg-white shadow-sm font-medium text-[#3A2E25] border border-[#E3D9CE]/60' : 'text-[#5C4D42] border border-transparent hover:bg-[#F7F3EE]'
                }`}
              >
                <span>{t.icon}</span>
                <span className="truncate">{t.name}</span>
              </button>
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                <button onClick={() => reorder(t.id, 'up')} className="rounded-md p-0.5 text-[#8C7A6B] hover:bg-[#EFE9E2]"><ChevronUp size={13} /></button>
                <button onClick={() => reorder(t.id, 'down')} className="rounded-md p-0.5 text-[#8C7A6B] hover:bg-[#EFE9E2]"><ChevronDown size={13} /></button>
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-[#E3D9CE]/50 p-3 bg-[#FCFAF8]">
          <button
            onClick={handleNew}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#D8CEC4] bg-white px-3 py-2 text-[13px] font-medium text-[#8C7A6B] hover:border-[#BFAE9E] hover:text-[#5C4D42] transition-colors"
          >
            <Plus size={14} />
            新建模板
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto bg-white p-6 custom-scrollbar">
        {!selectedId && !isCreating ? (
          <div className="flex h-full items-center justify-center text-sm text-[#A69B8F]">
            选择或新建一个模板
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-[12px] font-medium text-[#8C7A6B]">名称</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={isBusy || isReadOnly}
                  className="w-full rounded-xl border border-[#D8CEC4] bg-white px-3.5 py-2.5 text-sm text-[#3A2E25] focus:border-[#BFAE9E] focus:outline-none focus:ring-2 focus:ring-[#BFAE9E]/20 transition-all disabled:bg-[#F7F3EE] disabled:text-[#A69B8F]"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[12px] font-medium text-[#8C7A6B]">命令</span>
                <input
                  value={form.command}
                  onChange={(e) => setForm({ ...form, command: e.target.value })}
                  disabled={isBusy || isReadOnly}
                  className="w-full rounded-xl border border-[#D8CEC4] bg-white px-3.5 py-2.5 text-sm font-mono text-[#3A2E25] focus:border-[#BFAE9E] focus:outline-none focus:ring-2 focus:ring-[#BFAE9E]/20 transition-all disabled:bg-[#F7F3EE] disabled:text-[#A69B8F]"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[12px] font-medium text-[#8C7A6B]">图标</span>
                <input
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  disabled={isBusy || isReadOnly}
                  className="w-full rounded-xl border border-[#D8CEC4] bg-white px-3.5 py-2.5 text-sm text-[#3A2E25] focus:border-[#BFAE9E] focus:outline-none focus:ring-2 focus:ring-[#BFAE9E]/20 transition-all disabled:bg-[#F7F3EE] disabled:text-[#A69B8F]"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[12px] font-medium text-[#8C7A6B]">分类</span>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  disabled={isBusy || isReadOnly}
                  className="w-full rounded-xl border border-[#D8CEC4] bg-white px-3.5 py-2.5 text-sm text-[#3A2E25] focus:border-[#BFAE9E] focus:outline-none focus:ring-2 focus:ring-[#BFAE9E]/20 transition-all disabled:bg-[#F7F3EE] disabled:text-[#A69B8F]"
                >
                  {TEMPLATE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            
            <label className="block space-y-1.5">
              <span className="text-[12px] font-medium text-[#8C7A6B]">描述</span>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                disabled={isBusy || isReadOnly}
                className="w-full rounded-xl border border-[#D8CEC4] bg-white px-3.5 py-2.5 text-sm text-[#3A2E25] focus:border-[#BFAE9E] focus:outline-none focus:ring-2 focus:ring-[#BFAE9E]/20 transition-all disabled:bg-[#F7F3EE] disabled:text-[#A69B8F]"
              />
            </label>
            
            <label className="block space-y-1.5">
              <span className="text-[12px] font-medium text-[#8C7A6B]">Prompt</span>
              <textarea
                value={form.prompt}
                onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                rows={6}
                disabled={isBusy || isReadOnly}
                className="w-full resize-y rounded-xl border border-[#D8CEC4] bg-white px-3.5 py-3 text-sm leading-relaxed text-[#3A2E25] focus:border-[#BFAE9E] focus:outline-none focus:ring-2 focus:ring-[#BFAE9E]/20 transition-all disabled:bg-[#F7F3EE] disabled:text-[#A69B8F]"
                style={{ minHeight: '160px' }}
              />
            </label>
            
            {error && <p className="text-[13px] text-red-500">{error}</p>}
            
            {isReadOnly && (
              <div className="rounded-xl border border-[#E3D9CE] bg-[#FCFAF8] px-4 py-3 text-[12px] leading-relaxed text-[#8C7A6B]">
                系统模板只读，如需修改请点击左侧“新建模板”后复制一份再编辑。
              </div>
            )}
            
            <div className="flex items-center justify-end gap-3 pt-4">
              {selectedId && selected && !selected.isSystem && (
                <button
                  onClick={handleDelete}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-[13px] font-medium text-red-500 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition-all"
                >
                  <Trash2 size={14} />
                  删除
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={isBusy || isReadOnly}
                className="rounded-xl bg-[#4A3C31] px-6 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-[#3A2E25] disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                {isBusy ? '保存中...' : '保存修改'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
