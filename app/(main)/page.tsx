'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileAudio, MessageSquare, Mic, Plus } from 'lucide-react';
import WorkspaceModal from '@/components/WorkspaceModal';
import { useMeetingStore } from '@/lib/store';

function DashboardHeader() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const day = time.getDate();
  const month = time.toLocaleDateString('en-US', { month: 'short' });
  const weekday = time.toLocaleDateString('en-US', { weekday: 'short' });

  const hourNum = time.getHours();
  let greeting = '晚上好';
  if (hourNum < 6) greeting = '夜深了';
  else if (hourNum < 11) greeting = '早上好';
  else if (hourNum < 14) greeting = '中午好';
  else if (hourNum < 18) greeting = '下午好';

  const showColon = time.getSeconds() % 2 === 0;

  return (
    <div className="flex justify-center transition-opacity duration-500">
      <div className="inline-flex items-center gap-6 rounded-2xl border border-[#E3D9CE]/60 bg-white/60 px-6 py-4 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="font-song text-[42px] leading-none tracking-tight text-[#3A2E25]">
            {day}
          </span>
          <div className="flex flex-col text-[12px] font-medium leading-tight text-[#8C7A6B]">
            <span className="uppercase tracking-wider">{month}</span>
            <span>{weekday}</span>
          </div>
        </div>

        <div className="h-8 w-px bg-[#E3D9CE]" />

        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span className="font-song text-[32px] leading-none text-[#5C4D42]">
              {hours}
              <span className={`inline-block w-3 text-center transition-opacity duration-300 ${showColon ? 'opacity-100' : 'opacity-30'}`}>:</span>
              {minutes}
            </span>
          </div>
          <div className="flex flex-col items-start gap-1">
            <span className="text-[14px] font-semibold text-[#4A3C31]">{greeting}</span>
            <span className="text-[11px] text-[#8C7A6B]">记录此刻灵感</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const {
    workspaces,
    currentWorkspaceId,
    loadWorkspaces,
    createWorkspace,
    setCurrentWorkspaceId,
    loadCollections,
  } = useMeetingStore();

  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  const currentWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === currentWorkspaceId) || null,
    [currentWorkspaceId, workspaces]
  );

  const handleNewMeeting = useCallback(() => {
    const { reset } = useMeetingStore.getState();
    reset();
    const newId = useMeetingStore.getState().meetingId;
    router.push(`/meeting/${newId}?returnTo=${encodeURIComponent('/')}`);
  }, [router]);

  const handleImportAudio = useCallback(() => {
    const { reset } = useMeetingStore.getState();
    reset();
    const newId = useMeetingStore.getState().meetingId;
    router.push(`/meeting/${newId}?intent=upload&returnTo=${encodeURIComponent('/')}`);
  }, [router]);

  const handleSaveWorkspace = useCallback(
    async (input: { name: string; description: string; color: string; icon: string }) => {
      const workspace = await createWorkspace(input);
      setCurrentWorkspaceId(workspace.id);
      await loadCollections();
      setShowCreateWorkspace(false);
      router.push(`/workspace/${workspace.id}`);
    },
    [createWorkspace, loadCollections, router, setCurrentWorkspaceId]
  );

  const handleOpenWorkspace = useCallback(() => {
    if (currentWorkspace) {
      router.push(`/workspace/${currentWorkspace.id}`);
      return;
    }
    setShowCreateWorkspace(true);
  }, [currentWorkspace, router]);

  const shortcuts = [
    {
      title: '开始录音',
      description: '新建一场会议并立刻进入记录。',
      icon: Mic,
      onClick: handleNewMeeting,
    },
    {
      title: '导入音频',
      description: '上传已有录音并直接转写。',
      icon: FileAudio,
      onClick: handleImportAudio,
    },
    {
      title: 'AI 对话',
      description: '围绕历史会议发起全局提问。',
      icon: MessageSquare,
      onClick: () => router.push('/chat'),
    },
    {
      title: currentWorkspace ? '进入当前工作区' : '创建工作区',
      description: currentWorkspace
        ? `继续管理 ${currentWorkspace.name} 下的会议与笔记历史。`
        : '先创建一个工作区，再开始沉淀会议资料。',
      icon: currentWorkspace ? Plus : Plus,
      onClick: handleOpenWorkspace,
    },
  ];

  return (
    <div className="min-h-full bg-[#F6F2EB]">
      <div className="mx-auto flex max-w-[980px] flex-col gap-8 px-6 pb-12 pt-12 sm:px-8 lg:px-10">
        <section className="rounded-[34px] border border-[#DED4C9] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.94),_rgba(249,244,237,0.98)_58%,_rgba(239,231,221,1))] px-6 py-8 text-center shadow-[0_24px_72px_rgba(58,46,37,0.08)] sm:px-10 sm:py-10">
          <DashboardHeader />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {shortcuts.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={item.onClick}
              className="rounded-[26px] border border-[#E7DDD2] bg-white/90 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[#D9CCBF] hover:shadow-[0_16px_32px_rgba(58,46,37,0.08)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F5EEE5] text-[#5E4E43]">
                <item.icon size={19} />
              </div>
              <div className="mt-4 text-[16px] font-semibold text-[#3A2E25]">{item.title}</div>
              <div className="mt-1 text-sm leading-6 text-[#8B796A]">{item.description}</div>
            </button>
          ))}
        </section>
      </div>

      <WorkspaceModal
        open={showCreateWorkspace}
        mode="create"
        onClose={() => setShowCreateWorkspace(false)}
        onSubmit={handleSaveWorkspace}
      />
    </div>
  );
}
