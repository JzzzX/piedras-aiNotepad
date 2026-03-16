'use client';

interface WaveformIndicatorProps {
  micLevel: number;
  systemLevel: number;
  isActive: boolean;
  compact?: boolean;
}

const BAR_COUNT = 16;

export default function WaveformIndicator({
  micLevel,
  systemLevel,
  isActive,
  compact = false,
}: WaveformIndicatorProps) {
  const amplitude = Math.min(
    1,
    Math.max(0.12, (micLevel * 1.1 + systemLevel * 0.9) * (isActive ? 7.5 : 2.2))
  );

  return (
    <div
      className={`flex items-end gap-1 rounded-full ${
        compact ? 'px-2 py-1.5' : 'px-3 py-2'
      }`}
      aria-hidden="true"
    >
      {Array.from({ length: BAR_COUNT }).map((_, index) => {
        const wave = Math.sin(((index + 1) / BAR_COUNT) * Math.PI);
        const height = Math.max(6, Math.round((compact ? 16 : 22) * amplitude * wave));
        return (
          <span
            key={index}
            className={`block w-[3px] rounded-full transition-all duration-150 ${
              isActive ? 'bg-[#3A2E25]' : 'bg-[#C9BBAE]'
            }`}
            style={{ height }}
          />
        );
      })}
    </div>
  );
}
