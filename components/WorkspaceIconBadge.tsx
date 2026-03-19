'use client';

import {
  DEFAULT_WORKSPACE_ICON_KEY,
  WORKSPACE_ICON_COMPONENTS,
  type WorkspaceIconKey,
} from '@/lib/workspace-icons';

interface WorkspaceIconBadgeProps {
  icon?: string | null;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_STYLES = {
  sm: { box: 'h-7 w-7', icon: 14 },
  md: { box: 'h-8 w-8', icon: 16 },
  lg: { box: 'h-10 w-10', icon: 18 },
} as const;

export default function WorkspaceIconBadge({
  icon,
  color,
  size = 'md',
}: WorkspaceIconBadgeProps) {
  const iconKey =
    icon && icon in WORKSPACE_ICON_COMPONENTS
      ? (icon as WorkspaceIconKey)
      : DEFAULT_WORKSPACE_ICON_KEY;
  const Icon = WORKSPACE_ICON_COMPONENTS[iconKey];
  const styles = SIZE_STYLES[size];

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center border-2 border-[#111] ${styles.box}`}
      style={{
        color,
        backgroundColor: `${color}14`,
      }}
    >
      <Icon size={styles.icon} strokeWidth={2} />
    </span>
  );
}
