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
      ? 'top-full left-1/2 mt-2 -translate-x-1/2'
      : 'bottom-full left-1/2 mb-2 -translate-x-1/2';

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
      <span
        className={`pointer-events-none absolute ${tooltipPosition} z-50 whitespace-nowrap rounded-full bg-stone-900 px-3 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100`}
      >
        {label}
      </span>
    </div>
  );
}
