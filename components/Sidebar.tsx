'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  MessageSquare,
  Settings,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Menu,
} from 'lucide-react';
import PiedrasMark from '@/components/PiedrasMark';
import { useMeetingStore } from '@/lib/store';

const PRESET_COLORS = ['#94a3b8', '#f87171', '#fb923c', '#fbbf24', '#4ade80', '#38bdf8', '#a78bfa', '#f472b6'];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    workspaces,
    currentWorkspaceId,
    setCurrentWorkspaceId,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    folders,
    loadFolders,
    loadMeetingList,
    loadWorkspaces,
    updateMeetingWorkspace,
    reset,
  } = useMeetingStore();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#94a3b8');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [dragOverWorkspaceId, setDragOverWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    if (currentWorkspaceId) {
      void loadFolders();
      void loadMeetingList();
    }
  }, [currentWorkspaceId, loadFolders, loadMeetingList]);

  const handleSwitch = async (id: string) => {
    if (id === currentWorkspaceId) return;

    const state = useMeetingStore.getState();
    const isMeetingRoute = pathname.startsWith('/meeting/');
    const hasDraft =
      isMeetingRoute &&
      (state.segments.length > 0 ||
        state.userNotes.trim().length > 0 ||
        state.enhancedNotes.trim().length > 0 ||
        state.chatMessages.length > 0);

    if (state.status === 'recording') {
      alert('请先结束当前录音，再切换工作区');
      return;
    }

    if (hasDraft) {
      const saved = await state.saveMeeting();
      if (!saved) {
        alert('当前会议保存失败，请稍后重试后再切换工作区');
        return;
      }
    }

    setCurrentWorkspaceId(id);
    reset();
    setEditingId(null);
    setIsCreating(false);
    setMobileOpen(false);

    if (isMeetingRoute) {
      router.push('/');
    }

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

  const handleWorkspaceDrop = async (workspaceId: string, meetingId: string) => {
    setDragOverWorkspaceId(null);
    const meeting = useMeetingStore.getState().meetingList.find((item) => item.id === meetingId);
    if (!meeting || meeting.workspaceId === workspaceId) return;

    await updateMeetingWorkspace(meetingId, workspaceId);
    await loadMeetingList();
  };

  const navItems = [
    { href: '/', label: '首页', icon: Home },
    { href: '/chat', label: 'AI 对话', icon: MessageSquare },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#F7F3EE] border-r border-[#E3D9CE]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2B2420] text-[#F5EEE6] shadow-sm">
          <PiedrasMark className="h-5 w-5" />
        </div>
        <span className="font-song text-base font-semibold text-[#3A2E25]">Piedras</span>
        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto rounded-lg p-1.5 text-[#8C7A6B] hover:bg-[#EFE9E2] md:hidden"
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav links */}
      <nav className="space-y-0.5 px-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              isActive(item.href)
                ? 'bg-white text-[#3A2E25] shadow-sm border border-[#E3D9CE]/50'
                : 'text-[#5C4D42] hover:bg-[#EFE9E2]'
            }`}
          >
            <item.icon size={16} />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Workspaces */}
      <div className="mt-4 px-2">
        <div className="mb-1.5 flex items-center justify-between px-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A69B8F]">工作区</span>
          <button
            onClick={() => setIsCreating(true)}
            className="rounded-md p-1 text-[#A69B8F] hover:bg-[#EFE9E2] hover:text-[#5C4D42]"
          >
            <Plus size={13} />
          </button>
        </div>

        <div className="space-y-0.5">
          {workspaces.map((ws) => (
            <div key={ws.id} className="group relative">
              {editingId === ws.id ? (
                <div className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2">
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
                  <button onClick={() => handleRename(ws.id)} className="rounded-md p-1 text-[#6D8A67] hover:bg-[#EFE9E2]">
                    <Check size={13} />
                  </button>
                  <button onClick={() => setEditingId(null)} className="rounded-md p-1 text-[#8C7A6B] hover:bg-[#EFE9E2]">
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOverWorkspaceId(ws.id);
                  }}
                  onDragLeave={() => {
                    setDragOverWorkspaceId((prev) => (prev === ws.id ? null : prev));
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const meetingIdValue = event.dataTransfer.getData('text/meeting-id');
                    if (!meetingIdValue) return;
                    void handleWorkspaceDrop(ws.id, meetingIdValue);
                  }}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all ${
                    ws.id === currentWorkspaceId
                      ? 'bg-white font-semibold text-[#3A2E25] shadow-sm border border-[#E3D9CE]/50'
                      : 'text-[#5C4D42] hover:bg-[#EFE9E2]'
                  } ${
                    dragOverWorkspaceId === ws.id
                      ? 'ring-2 ring-sky-300 ring-offset-1 ring-offset-[#F7F3EE]'
                      : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSwitch(ws.id)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: ws.color }}
                    />
                    <span className="min-w-0 flex-1 truncate">{ws.name}</span>
                  </button>
                  <div className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditingId(ws.id); setEditName(ws.name); }}
                      className="rounded-md p-1 text-[#8C7A6B] hover:bg-[#EFE9E2] hover:text-[#5C4D42]"
                      aria-label={`重命名工作区 ${ws.name}`}
                    >
                      <Pencil size={11} />
                    </button>
                    {workspaces.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(ws.id); }}
                        className="rounded-md p-1 text-[#8C7A6B] hover:bg-red-50 hover:text-red-500"
                        aria-label={`删除工作区 ${ws.name}`}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {isCreating && (
          <div className="mt-1.5 space-y-2 rounded-xl bg-white p-3 border border-[#E3D9CE]/50">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setIsCreating(false); setNewName(''); }
              }}
              placeholder="工作区名称"
              className="w-full rounded-lg border border-[#D8CEC4] bg-white px-3 py-1.5 text-sm text-[#3A2E25] placeholder:text-[#A69B8F] focus:outline-none focus:ring-1 focus:ring-[#D8CEC4]"
            />
            <div className="flex items-center gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`h-5 w-5 rounded-full transition-all ${
                    newColor === c ? 'ring-2 ring-[#5C4D42] ring-offset-1' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex justify-end gap-1.5">
              <button onClick={() => { setIsCreating(false); setNewName(''); }} className="rounded-lg px-3 py-1 text-xs text-[#8C7A6B] hover:bg-[#EFE9E2]">
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="rounded-lg bg-[#4A3C31] px-3 py-1 text-xs font-medium text-white hover:bg-[#3A2E25] disabled:opacity-50"
              >
                创建
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Folders */}
      {folders.length > 0 && (
        <div className="mt-4 px-2">
          <div className="mb-1.5 px-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A69B8F]">文件夹</span>
          </div>
          <div className="space-y-0.5">
            {folders.map((folder) => {
              const expanded = expandedFolders[folder.id] ?? false;
              return (
                <button
                  key={folder.id}
                  onClick={() => setExpandedFolders((prev) => ({ ...prev, [folder.id]: !expanded }))}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[#5C4D42] hover:bg-[#EFE9E2]"
                >
                  {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: folder.color || '#d6d3d1' }} />
                  <span className="truncate">{folder.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings */}
      <div className="border-t border-[#E3D9CE]/50 p-2">
        <Link
          href="/settings"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
            isActive('/settings')
              ? 'bg-white text-[#3A2E25] shadow-sm border border-[#E3D9CE]/50'
              : 'text-[#5C4D42] hover:bg-[#EFE9E2]'
          }`}
        >
          <Settings size={16} />
          设置
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-50 flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-[#5C4D42] shadow-md backdrop-blur-sm md:hidden"
      >
        <Menu size={18} />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden w-[200px] shrink-0 md:block">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            className="absolute inset-0 bg-[#3A2E25]/20 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-[260px] animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
