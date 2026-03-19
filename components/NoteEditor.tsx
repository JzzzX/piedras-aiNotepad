'use client';

import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useMeetingStore } from '@/lib/store';
import { FileText, Bold, Italic, List, ListOrdered, Heading2 } from 'lucide-react';

export default function NoteEditor({ embedded = false }: { embedded?: boolean }) {
  const { meetingId, status, userNotes, setUserNotes } = useMeetingStore();
  const syncedMeetingIdRef = useRef<string | null>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: userNotes || '<p></p>',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm prose-zinc max-w-none focus:outline-none min-h-[200px] px-4 py-3',
      },
    },
    onUpdate: ({ editor }) => {
      setUserNotes(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (syncedMeetingIdRef.current === meetingId) return;

    editor.commands.setContent(userNotes || '<p></p>', { emitUpdate: false });
    syncedMeetingIdRef.current = meetingId;
  }, [editor, meetingId, userNotes]);

  if (status === 'idle') {
    return (
      <div className="flex h-full flex-col bg-transparent">
        {!embedded && (
          <div className="border-b-2 border-[#111] px-4 py-4 sm:px-6 sm:py-5">
            <h3 className="font-[family-name:var(--font-vt323)] flex items-center text-[15px] font-semibold text-[#111]">
              <FileText size={16} className="mr-2 text-[#111]" />
              灵感与笔记
            </h3>
          </div>
        )}
        <div className="flex flex-1 items-center justify-center px-4 py-5 text-[#8A8578] sm:px-7 sm:py-8">
          <div className="flex w-full max-w-[360px] flex-col items-center justify-center rounded-none border-2 border-dashed border-[#111] bg-[#F4F0E6] px-5 py-8 shadow-none sm:px-8 sm:py-10">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-none border-2 border-[#111] bg-[#F4F0E6] shadow-none">
              <FileText size={20} className="text-[#111]" strokeWidth={2} />
            </div>
            <p className="font-[family-name:var(--font-vt323)] mb-2 text-center text-[17px] font-semibold text-[#111]">
              灵感与笔记
            </p>
            <p className="mx-auto max-w-[240px] text-center text-[13px] leading-6 text-[#8A8578]">
              记录判断、补充背景，让思路与转写自然汇合。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-transparent">
      {!embedded && (
        <div className="border-b-2 border-[#111] px-4 py-4 sm:px-6 sm:py-5">
          <h3 className="font-[family-name:var(--font-vt323)] flex items-center text-[15px] font-semibold text-[#111]">
            <FileText size={16} className="mr-2 text-[#111]" />
            灵感与笔记
          </h3>
        </div>
      )}
      {/* 极简工具栏悬浮 */}
      {editor && (
        <div className="sticky top-0 z-10 flex items-center gap-1 border-b-2 border-[#111] bg-[#F4F0E6] px-6 py-4">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="标题"
          >
            <Heading2 size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="加粗"
          >
            <Bold size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="斜体"
          >
            <Italic size={16} />
          </ToolbarButton>
          <div className="mx-2 h-4 w-px bg-[#111]" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="无序列表"
          >
            <List size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="有序列表"
          >
            <ListOrdered size={16} />
          </ToolbarButton>
        </div>
      )}

      {/* 沉浸式编辑区 */}
      <div className="flex-1 overflow-y-auto bg-[#F4F0E6] px-8 py-8">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded-none p-2 transition-all ${
        active
          ? 'bg-[#111] text-[#F4F0E6] border-2 border-[#111]'
          : 'text-[#8A8578] hover:bg-[#111] hover:text-[#F4F0E6] border-2 border-transparent'
      }`}
    >
      {children}
    </button>
  );
}
