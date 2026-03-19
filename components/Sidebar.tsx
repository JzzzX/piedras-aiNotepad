'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Briefcase,
  ChevronDown,
  ChevronRight,
  Home,
  MessageSquare,
  Settings,
  Plus,
  Pencil,
  Trash2,
  X,
  Menu,
} from 'lucide-react';
import PiedrasMark from '@/components/PiedrasMark';
import WorkspaceIconBadge from '@/components/WorkspaceIconBadge';
import WorkspaceModal from '@/components/WorkspaceModal';
import { useMeetingStore } from '@/lib/store';
import { getWorkspaceModeLabel } from '@/lib/workspace-mode';

const DESKTOP_SIDEBAR_DEFAULT_WIDTH = 244;
const DESKTOP_SIDEBAR_MIN_WIDTH = 232;
const DESKTOP_SIDEBAR_MAX_WIDTH = 320;
const SIDEBAR_WIDTH_STORAGE_KEY = 'piedras_sidebar_width';
const WORKSPACE_EXPANDED_STORAGE_KEY = 'piedras_workspace_list_expanded';

function clampSidebarWidth(value: number) {
  return Math.min(DESKTOP_SIDEBAR_MAX_WIDTH, Math.max(DESKTOP_SIDEBAR_MIN_WIDTH, value));
}

function subscribeToStorage(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = () => onStoreChange();
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

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
    loadCollections,
    loadMeetingList,
    loadWorkspaces,
    updateMeetingWorkspace,
    reset,
  } = useMeetingStore();

  const [mobileOpen, setMobileOpen] = useState(false);
  const hydrated = useHydrated();
  const persistedWorkspaceListExpanded = useSyncExternalStore(
    subscribeToStorage,
    () =>
      typeof window !== 'undefined' &&
      window.localStorage.getItem(WORKSPACE_EXPANDED_STORAGE_KEY) === 'true',
    () => false
  );
  const persistedDesktopWidth = useSyncExternalStore(
    subscribeToStorage,
    () => {
      if (typeof window === 'undefined') return DESKTOP_SIDEBAR_DEFAULT_WIDTH;
      const rawWidth = Number(window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
      return Number.isFinite(rawWidth)
        ? clampSidebarWidth(rawWidth)
        : DESKTOP_SIDEBAR_DEFAULT_WIDTH;
    },
    () => DESKTOP_SIDEBAR_DEFAULT_WIDTH
  );
  const [workspaceListExpandedOverride, setWorkspaceListExpandedOverride] = useState<boolean | null>(null);
  const [desktopWidthOverride, setDesktopWidthOverride] = useState<number | null>(null);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [workspaceModalState, setWorkspaceModalState] = useState<{
    mode: 'create' | 'edit';
    workspaceId?: string;
  } | null>(null);
  const [highlightedWorkspaceId, setHighlightedWorkspaceId] = useState<string | null>(null);
  const [dragOverWorkspaceId, setDragOverWorkspaceId] = useState<string | null>(null);
  const workspaceItemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const editingWorkspace =
    workspaceModalState?.mode === 'edit'
      ? workspaces.find((workspace) => workspace.id === workspaceModalState.workspaceId) || null
      : null;
  const workspaceListExpanded =
    workspaceListExpandedOverride ?? (hydrated ? persistedWorkspaceListExpanded : false);
  const desktopWidth = desktopWidthOverride ?? (hydrated ? persistedDesktopWidth : DESKTOP_SIDEBAR_DEFAULT_WIDTH);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    if (currentWorkspaceId) {
      void loadCollections();
      void loadMeetingList();
    }
  }, [currentWorkspaceId, loadCollections, loadMeetingList]);

  useEffect(() => {
    if (!highlightedWorkspaceId) return;
    const target = workspaceItemRefs.current[highlightedWorkspaceId];
    target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    const timer = window.setTimeout(() => {
      setHighlightedWorkspaceId((current) => (current === highlightedWorkspaceId ? null : current));
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [highlightedWorkspaceId, workspaces]);

  useEffect(() => {
    if (!isResizingSidebar) return;

    const handlePointerMove = (event: PointerEvent) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState) return;
      const delta = event.clientX - resizeState.startX;
      const nextWidth = clampSidebarWidth(resizeState.startWidth + delta);
      setDesktopWidthOverride(nextWidth);
      window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(nextWidth));
    };

    const handlePointerUp = () => {
      resizeStateRef.current = null;
      setIsResizingSidebar(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingSidebar]);

  const handleSwitch = async (id: string) => {
    if (id === currentWorkspaceId) {
      if (pathname !== `/workspace/${id}`) {
        router.push(`/workspace/${id}`);
      }
      setMobileOpen(false);
      return;
    }

    const state = useMeetingStore.getState();
    const isMeetingRoute = pathname.startsWith('/meeting/');
    const hasDraft =
      isMeetingRoute &&
      (state.segments.length > 0 ||
        state.userNotes.trim().length > 0 ||
        state.enhancedNotes.trim().length > 0 ||
        state.chatMessages.length > 0);

    if (state.status === 'recording' || state.status === 'paused') {
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
    setWorkspaceModalState(null);
    setMobileOpen(false);

    if (pathname !== `/workspace/${id}`) {
      router.push(`/workspace/${id}`);
    }

    await loadCollections();
    await loadMeetingList();
  };

  const handleSaveWorkspace = async (input: {
    name: string;
    description: string;
    color: string;
    icon: string;
    workflowMode: 'general' | 'interview';
    modeLabel: string;
  }) => {
    if (workspaceModalState?.mode === 'edit' && workspaceModalState.workspaceId) {
      await updateWorkspace(workspaceModalState.workspaceId, input);
      setHighlightedWorkspaceId(workspaceModalState.workspaceId);
      return;
    }

    const ws = await createWorkspace(input);
    setHighlightedWorkspaceId(ws.id);
    await handleSwitch(ws.id);
  };

  const handleDelete = async (id: string) => {
    if (workspaces.length <= 1) return;
    const deletingCurrent = currentWorkspaceId === id;
    await deleteWorkspace(id);
    await loadCollections();
    await loadMeetingList();

    if (deletingCurrent) {
      const nextWorkspaceId = useMeetingStore.getState().currentWorkspaceId;
      if (nextWorkspaceId) {
        router.push(`/workspace/${nextWorkspaceId}`);
      } else {
        router.push('/');
      }
    }
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
  const isWorkspaceRoute = pathname.startsWith('/workspace');

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const startResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'touch') return;
    resizeStateRef.current = { startX: event.clientX, startWidth: desktopWidth };
    setIsResizingSidebar(true);
  };

  const updateWorkspaceListExpanded = (nextValue: boolean) => {
    setWorkspaceListExpandedOverride(nextValue);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        WORKSPACE_EXPANDED_STORAGE_KEY,
        nextValue ? 'true' : 'false'
      );
    }
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#F4F0E6] border-r-2 border-[#111]">
      {/* Logo — 方形边框, VT323 字体 */}
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <div className="flex h-10 w-10 items-center justify-center border-2 border-[#111] bg-[#111] text-[#F4F0E6]">
          <PiedrasMark className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="font-[family-name:var(--font-vt323)] text-[22px] text-[#111]">Piedras</div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#8A8578] font-[family-name:var(--font-space-mono)]">Workspace OS</div>
        </div>
        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto p-1.5 text-[#8A8578] border-2 border-[#111] hover:bg-[#111] hover:text-[#F4F0E6] md:hidden"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 pb-3">
        <div className="flex min-h-0 flex-1 flex-col p-2">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-[15px] font-medium border-2 ${
                  isActive(item.href)
                    ? 'border-[#111] bg-[#111] text-[#F4F0E6]'
                    : 'border-transparent text-[#111] hover:bg-[#111] hover:text-[#F4F0E6]'
                }`}
              >
                <item.icon size={17} />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className={`mt-1 flex min-h-0 flex-1 flex-col ${workspaceListExpanded ? 'px-1.5 py-2' : ''}`}>
            <div className={`flex items-center gap-1 ${workspaceListExpanded ? 'px-1' : ''}`}>
              <button
              type="button"
              onClick={() => {
                router.push('/workspace');
                setMobileOpen(false);
              }}
                className={`flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-[15px] font-medium border-2 ${
                  isWorkspaceRoute
                    ? 'border-[#111] bg-[#111] text-[#F4F0E6]'
                    : 'border-transparent text-[#111] hover:bg-[#111] hover:text-[#F4F0E6]'
                }`}
              >
                <Briefcase size={17} />
                <span className="min-w-0 flex-1 truncate text-left">工作区</span>
              </button>
              <button
                type="button"
                onClick={() => updateWorkspaceListExpanded(!workspaceListExpanded)}
                aria-label={workspaceListExpanded ? '收起工作区列表' : '展开工作区列表'}
                className="p-2 text-[#8A8578] hover:bg-[#111] hover:text-[#F4F0E6]"
              >
                {workspaceListExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>
              <button
                type="button"
                onClick={() => setWorkspaceModalState({ mode: 'create' })}
                aria-label="创建工作区"
                className="p-2 text-[#8A8578] hover:bg-[#111] hover:text-[#F4F0E6]"
              >
                <Plus size={15} />
              </button>
            </div>

            {workspaceListExpanded ? (
              <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="space-y-1 border-l-2 border-[#111] pl-3 ml-4">
                  {workspaces.map((ws) => {
                    const workspaceSelected =
                      pathname === `/workspace/${ws.id}` ||
                      (!isWorkspaceRoute && ws.id === currentWorkspaceId);

                    return (
                      <div
                        key={ws.id}
                        ref={(node) => {
                          workspaceItemRefs.current[ws.id] = node;
                        }}
                        className="group relative"
                      >
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
                          className={`flex items-center gap-2 px-3 py-2.5 text-[14px] border-2 ${
                            workspaceSelected
                              ? 'border-[#111] bg-[#111] text-[#F4F0E6] font-semibold'
                              : 'border-transparent text-[#111] hover:bg-[#111] hover:text-[#F4F0E6]'
                          } ${
                            highlightedWorkspaceId === ws.id
                              ? 'border-[#D9423E]'
                              : ''
                          } ${
                            dragOverWorkspaceId === ws.id
                              ? 'border-[#2B4C7E]'
                              : ''
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSwitch(ws.id)}
                            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                          >
                            <WorkspaceIconBadge icon={ws.icon} color={ws.color} size="sm" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate">{ws.name}</div>
                              <div className="mt-0.5 truncate text-[10px] font-medium opacity-60">
                                {getWorkspaceModeLabel(ws)}
                              </div>
                            </div>
                          </button>
                          <div className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setWorkspaceModalState({ mode: 'edit', workspaceId: ws.id });
                              }}
                              className="p-1 text-[#8A8578] hover:bg-[#F4F0E6] hover:text-[#111]"
                              aria-label={`编辑工作区 ${ws.name}`}
                            >
                              <Pencil size={11} />
                            </button>
                            {workspaces.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDelete(ws.id);
                                }}
                                className="p-1 text-[#8A8578] hover:bg-[#D9423E] hover:text-[#F4F0E6]"
                                aria-label={`删除工作区 ${ws.name}`}
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-auto pt-2">
            <Link
              href="/settings"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 text-[14px] font-medium border-2 ${
                isActive('/settings')
                  ? 'border-[#111] bg-[#111] text-[#F4F0E6]'
                  : 'border-transparent text-[#111] hover:bg-[#111] hover:text-[#F4F0E6]'
              }`}
            >
              <Settings size={16} />
              设置
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-50 flex h-9 w-9 items-center justify-center border-2 border-[#111] bg-[#F4F0E6] text-[#111] shadow-[2px_2px_0px_#111] md:hidden"
      >
        <Menu size={18} />
      </button>

      {/* Desktop sidebar */}
      <div
        className="group/sidebar relative hidden shrink-0 md:block"
        style={{ width: desktopWidth }}
      >
        <aside className="h-full w-full overflow-hidden">
          {sidebarContent}
        </aside>
        <button
          type="button"
          aria-label="调整侧边栏宽度"
          onPointerDown={startResize}
          className="absolute inset-y-0 -right-[6px] z-10 hidden w-3 cursor-col-resize touch-none md:block"
        >
          <span
            className={`absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 transition-colors ${
              isResizingSidebar ? 'bg-[#111]' : 'bg-transparent group-hover/sidebar:bg-[#8A8578]'
            }`}
          />
        </button>
      </div>

      {/* Mobile sidebar overlay — 不透明黑色背景, 无模糊 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            className="absolute inset-0 bg-[#111]/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-[280px]">
            {sidebarContent}
          </aside>
        </div>
      )}

      <WorkspaceModal
        open={!!workspaceModalState}
        mode={workspaceModalState?.mode ?? 'create'}
        workspace={editingWorkspace}
        onClose={() => setWorkspaceModalState(null)}
        onSubmit={handleSaveWorkspace}
      />
    </>
  );
}
