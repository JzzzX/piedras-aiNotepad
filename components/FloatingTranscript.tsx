import { X } from 'lucide-react';
import TranscriptPanel from '@/components/TranscriptPanel';

interface FloatingTranscriptProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FloatingTranscript({ isOpen, onClose }: FloatingTranscriptProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/5 transition-all"
          onClick={onClose}
        />
      )}
      <div
        className={`retro-window fixed top-1/2 left-1/2 z-50 w-[90vw] max-w-[600px] origin-center -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-none border-2 border-[#111] bg-[#F4F0E6] shadow-[4px_4px_0px_#111] transition-all duration-300 ${
          isOpen
            ? 'scale-100 opacity-100 pointer-events-auto'
            : 'scale-95 opacity-0 pointer-events-none'
        }`}
      >
        <div className="retro-title-bar flex items-center justify-between border-b border-2 border-[#111] px-5 py-4 bg-[#EAE3D2]">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-[#8A8578] font-[family-name:var(--font-vt323)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D9423E] opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#D9423E]"></span>
            </span>
            实时转写
          </div>
          <button
            onClick={onClose}
            className="rounded-none p-2 text-[#8A8578] transition-colors hover:bg-[#EAE3D2] hover:text-[#111]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="h-[60vh] max-h-[600px] overflow-y-auto custom-scrollbar p-2">
          <TranscriptPanel />
        </div>
      </div>
    </>
  );
}
