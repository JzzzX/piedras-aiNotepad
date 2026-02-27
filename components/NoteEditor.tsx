'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useMeetingStore } from '@/lib/store';
import { FileText, Bold, Italic, List, ListOrdered, Heading2 } from 'lucide-react';

export default function NoteEditor() {
  const { status, userNotes, setUserNotes } = useMeetingStore();

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

  if (status === 'idle') {
    return (
      <div className="flex h-full flex-col items-center justify-center text-gray-400 bg-white">
        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-6">
          <FileText size={24} className="text-gray-300" strokeWidth={1.5} />
        </div>
        <p className="text-base font-medium text-gray-600">灵感与笔记</p>
        <p className="mt-2 text-sm text-center text-gray-400 max-w-[240px] leading-relaxed">
          一个纯净的书写空间。<br/>开始录音后，你的要点会与转写自动融合。
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* 极简工具栏悬浮 */}
      {editor && (
        <div className="sticky top-0 z-10 flex items-center gap-1 bg-white/80 backdrop-blur-sm px-6 py-3 border-b border-black/5">
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
          <div className="mx-2 h-4 w-px bg-gray-200" />
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
      <div className="flex-1 overflow-y-auto px-8 py-6">
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
      className={`rounded-lg p-2 transition-all ${
        active
          ? 'bg-gray-100 text-gray-900'
          : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}
