import { MessageSquare, Send, FileText, BookOpen } from 'lucide-react';
import AudioRecorder from './AudioRecorder';

interface FloatingBottomBarProps {
  onToggleTranscript: () => void;
  isTranscriptOpen: boolean;
  onToggleChat: () => void;
  isChatOpen: boolean;
  onToggleKnowledgeBase: () => void;
  isKnowledgeBaseOpen: boolean;
}

export default function FloatingBottomBar({
  onToggleTranscript,
  isTranscriptOpen,
  onToggleChat,
  isChatOpen,
  onToggleKnowledgeBase,
  isKnowledgeBaseOpen,
}: FloatingBottomBarProps) {
  return (
    <div className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/40 bg-white/70 p-2 shadow-2xl backdrop-blur-xl transition-all duration-300 dark:border-gray-800/50 dark:bg-black/70">
      
      {/* 左侧：录音与转写控制区 */}
      <div className="flex items-center gap-1 pl-1">
        <AudioRecorder />

        <button
          onClick={onToggleTranscript}
          title="实时转写"
          className={`ml-1 flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
            isTranscriptOpen
              ? 'bg-blue-50 text-blue-600'
              : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-900'
          }`}
        >
          <FileText size={18} strokeWidth={2} />
        </button>

        <button
          onClick={onToggleKnowledgeBase}
          title="知识库"
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
            isKnowledgeBaseOpen
              ? 'bg-amber-50 text-amber-600'
              : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-900'
          }`}
        >
          <BookOpen size={18} strokeWidth={2} />
        </button>
      </div>

      <div className="h-6 w-[1px] bg-gray-300/60 dark:bg-gray-700"></div>

      {/* 右侧：AI 对话输入框区 */}
      <div className="flex w-[260px] items-center gap-2 pr-1 sm:w-[320px]">
        <div className="flex items-center pl-2 text-gray-400">
          <MessageSquare size={16} />
        </div>
        <input 
          type="text" 
          placeholder="Ask AI anything about the notes..." 
          className="w-full bg-transparent px-2 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400/80"
          onFocus={onToggleChat}
        />
        <button 
          onClick={onToggleChat}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
            isChatOpen
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-gray-100 text-gray-500 hover:bg-blue-500 hover:text-white dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
