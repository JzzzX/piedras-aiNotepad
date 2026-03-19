import ChatPanel from '@/components/ChatPanel';

interface FloatingChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FloatingChat({ isOpen, onClose }: FloatingChatProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/5 transition-all"
          onClick={onClose}
        />
      )}
      <div
        className={`retro-window fixed top-1/2 left-1/2 z-50 w-[90vw] max-w-[720px] origin-center -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-none border-2 border-[#111] bg-[#F4F0E6] shadow-[4px_4px_0px_#111] transition-all duration-300 ${
          isOpen
            ? 'scale-100 opacity-100 pointer-events-auto'
            : 'scale-95 opacity-0 pointer-events-none'
        }`}
      >
        <div className="h-[75vh] max-h-[800px] relative flex flex-col">
          <ChatPanel onClose={onClose} />
        </div>
      </div>
    </>
  );
}
