'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface TooltipIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  tooltipSide?: 'top' | 'bottom';
  wrapperClassName?: string;
}

export default function TooltipIconButton({
  label,
  children,
  className = '',
  tooltipSide = 'top',
  wrapperClassName = '',
  type = 'button',
  ...props
}: TooltipIconButtonProps) {
  const tooltipPosition =
    tooltipSide === 'bottom'
      ? 'top-full left-1/2 pt-2 -translate-x-1/2'
      : 'bottom-full left-1/2 pb-2 -translate-x-1/2';

  const transformInitial =
    tooltipSide === 'bottom' ? '-translate-y-1' : 'translate-y-1';

  return (
    <div className={`group relative inline-flex ${wrapperClassName}`}>
      <button
        type={type}
        aria-label={label}
        className={className}
        {...props}
      >
        {children}
      </button>
      <div
        className={`pointer-events-none absolute ${tooltipPosition} z-[60] flex flex-col items-center opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 group-active:opacity-0 ${transformInitial}`}
      >
        <span className="whitespace-nowrap rounded-none border-2 border-[#111] bg-[#111] px-2 py-1 text-[11px] font-medium tracking-wide text-white shadow-[4px_4px_0px_#111]">
          {label}
        </span>
      </div>
    </div>
  );
}
