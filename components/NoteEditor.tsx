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
          <div className="border-b border-black/[0.04] px-4 py-4 sm:px-6 sm:py-5">
            <h3 className="font-song flex items-center text-[15px] font-semibold text-stone-800">
              <FileText size={16} className="mr-2 text-sky-400" />
              灵感与笔记
            </h3>
          </div>
        )}
        <div className="flex flex-1 items-center justify-center px-4 py-5 text-stone-400 sm:px-7 sm:py-8">
          <div className="flex w-full max-w-[360px] flex-col items-center justify-center rounded-[28px] border border-dashed border-stone-200/90 bg-[#FCFBF8] px-5 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:px-8 sm:py-10">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[20px] border border-sky-100/50 bg-sky-50 shadow-sm">
              <FileText size={20} className="text-sky-400" strokeWidth={2} />
            </div>
            <p className="font-song mb-2 text-center text-[17px] font-semibold text-stone-700">
              灵感与笔记
            </p>
            <p className="mx-auto max-w-[240px] text-center text-[13px] leading-6 text-stone-400">
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
        <div className="border-b border-black/[0.04] px-4 py-4 sm:px-6 sm:py-5">
          <h3 className="font-song flex items-center text-[15px] font-semibold text-stone-800">
            <FileText size={16} className="mr-2 text-sky-400" />
            灵感与笔记
          </h3>
        </div>
      )}
      {/* 极简工具栏悬浮 */}
      {editor && (
        <div className="sticky top-0 z-10 flex items-center gap-1 border-b border-black/[0.04] bg-[#FCFAF8]/90 px-6 py-4 backdrop-blur-md">
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
          <div className="mx-2 h-4 w-px bg-[#D8CEC4]" />
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
      <div className="flex-1 overflow-y-auto bg-[#FCFAF8] px-8 py-8">
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
      className={`rounded-xl p-2 transition-all ${
        active
          ? 'bg-sky-50 text-sky-600 shadow-sm border border-sky-100/50'
          : 'text-[#A69B8F] hover:bg-[#F7F3EE] hover:text-[#5C4D42] border border-transparent'
      }`}
    >
      {children}
    </button>
  );
}
