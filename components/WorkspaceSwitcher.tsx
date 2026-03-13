'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { useMeetingStore } from '@/lib/store';

const PRESET_COLORS = ['#94a3b8', '#f87171', '#fb923c', '#fbbf24', '#4ade80', '#38bdf8', '#a78bfa', '#f472b6'];

export default function WorkspaceSwitcher() {
  const {
    workspaces,
    currentWorkspaceId,
    setCurrentWorkspaceId,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    loadFolders,
    loadMeetingList,
    reset,
  } = useMeetingStore();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#94a3b8');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setIsCreating(false);
        setEditingId(null);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSwitch = async (id: string) => {
    if (id === currentWorkspaceId) {
      setOpen(false);
      return;
    }
    setCurrentWorkspaceId(id);
    reset();
    setOpen(false);
    setEditingId(null);
    setIsCreating(false);
    await loadFolders();
    await loadMeetingList();
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    const ws = await createWorkspace({ name, color: newColor });
    if (ws) {
      setIsCreating(false);
      setNewName('');
      setNewColor('#94a3b8');
      await handleSwitch(ws.id);
    }
  };

  const handleRename = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    await updateWorkspace(id, { name });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (workspaces.length <= 1) return;
    await deleteWorkspace(id);
    await loadFolders();
    await loadMeetingList();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium text-[#5C4D42] transition-all hover:bg-[#F0EBE6] hover:ring-1 hover:ring-[#D8CEC4]"
      >
        {currentWorkspace && (
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: currentWorkspace.color }}
          />
        )}
        <span className="max-w-[120px] truncate">
          {currentWorkspace?.name || '选择工作区'}
        </span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-[#E3D9CE] bg-white shadow-xl">
          <div className="max-h-72 overflow-y-auto p-1.5">
            {workspaces.map((ws) => (
              <div key={ws.id} className="group relative">
                {editingId === ws.id ? (
                  <div className="flex items-center gap-1.5 rounded-xl bg-[#F7F3EE] px-3 py-2">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(ws.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-[#D8CEC4] bg-white px-2 py-1 text-sm text-[#3A2E25] focus:outline-none focus:ring-1 focus:ring-[#D8CEC4]"
                    />
                    <button
                      onClick={() => handleRename(ws.id)}
                      className="rounded-md p-1 text-[#6D8A67] hover:bg-[#EFE9E2]"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-md p-1 text-[#8C7A6B] hover:bg-[#EFE9E2]"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleSwitch(ws.id)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                      ws.id === currentWorkspaceId
                        ? 'bg-[#F7F3EE] font-semibold text-[#3A2E25]'
                        : 'text-[#5C4D42] hover:bg-[#F9F7F4]'
                    }`}
                  >
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: ws.color }}
                    />
                    <span className="min-w-0 flex-1 truncate">{ws.name}</span>
                    <span className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(ws.id);
                          setEditName(ws.name);
                        }}
                        className="rounded-md p-1 text-[#8C7A6B] hover:bg-[#EFE9E2] hover:text-[#5C4D42]"
                      >
                        <Pencil size={12} />
                      </button>
                      {workspaces.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(ws.id);
                          }}
                          className="rounded-md p-1 text-[#8C7A6B] hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </span>
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-[#E3D9CE]/50 p-2">
            {isCreating ? (
              <div className="space-y-3 rounded-xl bg-[#F7F3EE] p-4">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                    if (e.key === 'Escape') { setIsCreating(false); setNewName(''); }
                  }}
                  placeholder="工作区名称"
                  className="w-full rounded-xl border border-[#D8CEC4] bg-white px-3.5 py-2.5 text-sm text-[#3A2E25] placeholder:text-[#A69B8F] focus:border-[#BFAE9E] focus:outline-none focus:ring-2 focus:ring-[#BFAE9E]/20 transition-all"
                />
                <div className="flex items-center justify-between gap-1.5 px-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewColor(c)}
                      className={`h-5 w-5 rounded-full transition-all ${
                        newColor === c ? 'ring-2 ring-[#5C4D42] ring-offset-2 ring-offset-[#F7F3EE]' : 'hover:scale-110 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => { setIsCreating(false); setNewName(''); }}
                    className="rounded-xl px-4 py-2 text-[13px] font-medium text-[#8C7A6B] hover:bg-[#EFE9E2] hover:text-[#5C4D42] transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim()}
                    className="rounded-xl bg-[#8C7A6B] px-5 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-[#5C4D42] disabled:opacity-50 transition-all active:scale-[0.98]"
                  >
                    创建
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-[#8C7A6B] transition-all hover:bg-[#F9F7F4] hover:text-[#5C4D42]"
              >
                <Plus size={14} />
                新建工作区
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
