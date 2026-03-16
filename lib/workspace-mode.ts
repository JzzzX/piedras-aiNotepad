import type { Workspace, WorkspaceWorkflowMode } from './types';

interface WorkspaceModeConfig {
  defaultLabel: string;
  badgeLabel: string;
  accentRing: string;
  accentSurface: string;
  accentText: string;
  description: string;
}

export const WORKSPACE_MODE_CONFIG: Record<WorkspaceWorkflowMode, WorkspaceModeConfig> = {
  general: {
    defaultLabel: '通用模式',
    badgeLabel: 'General',
    accentRing: 'ring-[#EFE1D0]',
    accentSurface: 'bg-[#FBF6EF]',
    accentText: 'text-[#8C7A6B]',
    description: '项目、客户、研究等泛用工作流',
  },
  interview: {
    defaultLabel: '面试模式',
    badgeLabel: 'Interview',
    accentRing: 'ring-[#E8D9EC]',
    accentSurface: 'bg-[#F8F2FA]',
    accentText: 'text-[#7B5C8F]',
    description: '候选人、多轮面试和交接',
  },
};

export function getWorkspaceModeLabel(
  workspaceLike: Pick<Workspace, 'workflowMode' | 'modeLabel'>
) {
  return (
    workspaceLike.modeLabel?.trim() ||
    WORKSPACE_MODE_CONFIG[workspaceLike.workflowMode].defaultLabel
  );
}

export function getWorkspaceModeConfig(mode: WorkspaceWorkflowMode) {
  return WORKSPACE_MODE_CONFIG[mode];
}
