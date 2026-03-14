export interface TranscriptSegment {
  id: string;
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  isFinal: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  templateId?: string;
}

export type LlmSelection = 'auto' | 'minimax' | 'openai';
export type OpenAICompatiblePreset = 'aihubmix' | 'openai' | 'custom';

export interface LlmSettings {
  provider: LlmSelection;
  minimaxApiKey: string;
  minimaxGroupId: string;
  minimaxModel: string;
  openaiPreset: OpenAICompatiblePreset;
  openaiApiKey: string;
  openaiModel: string;
  openaiBaseUrl: string;
  openaiPath: string;
}

export type LlmRuntimeConfig =
  | { provider: 'auto' }
  | { provider: 'minimax'; apiKey: string; groupId: string; model?: string }
  | { provider: 'openai'; apiKey: string; model: string; baseUrl?: string; path?: string };

export type MeetingType =
  | '通用'
  | '项目周会'
  | '需求评审'
  | '销售沟通'
  | '面试复盘';

export type OutputStyle = '简洁' | '平衡' | '详细' | '行动导向';

export interface PromptOptions {
  meetingType: MeetingType;
  outputStyle: OutputStyle;
  includeActionItems: boolean;
}

export interface RecordingOptions {
  autoStopEnabled: boolean;
  autoStopMinutes: number;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  sortOrder: number;
}

export type CustomVocabularyScope = 'global' | 'workspace';

export interface AsrVocabularySyncStatus {
  supported: boolean;
  mode: 'browser' | 'aliyun';
  ready: boolean;
  remoteVocabularyId: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  message: string;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  workspaceId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Template {
  id: string;
  name: string;
  command: string;
  icon: string;
  description: string;
  prompt: string;
  category: string;
  isSystem?: boolean;
  sortOrder?: number;
}

export type GlobalChatScope = 'my_notes' | 'all_meetings';

export interface GlobalChatFilters {
  titleKeyword?: string;
  dateFrom?: string;
  dateTo?: string;
  folderId?: string;
}

export interface GlobalChatSessionSummary {
  id: string;
  title: string;
  scope: GlobalChatScope;
  workspaceId: string | null;
  workspace?: Pick<Workspace, 'id' | 'name' | 'icon' | 'color'> | null;
  filters: GlobalChatFilters;
  updatedAt: string;
  createdAt: string;
}

export interface GlobalChatSessionDetail extends GlobalChatSessionSummary {
  messages: ChatMessage[];
}

export type DashboardScope = 'all' | 'current';

export interface DashboardActionItem {
  id: string;
  text: string;
  owner?: string | null;
  dueDate?: string | null;
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
  workspaceId: string;
  workspace?: Pick<Workspace, 'id' | 'name' | 'icon' | 'color'> | null;
}

export interface DashboardMeetingItem {
  id: string;
  title: string;
  date: string;
  duration: number;
  folderId: string | null;
  workspaceId: string;
  folder?: Pick<Folder, 'id' | 'name' | 'color'> | null;
  workspace?: Pick<Workspace, 'id' | 'name' | 'icon' | 'color'> | null;
  _count: { segments: number; chatMessages: number };
}

export interface DashboardResponse {
  greeting: string;
  dateLabel: string;
  recentActionItems: DashboardActionItem[];
  recentMeetings: DashboardMeetingItem[];
}

export interface Meeting {
  id: string;
  title: string;
  date: number;
  status: 'idle' | 'recording' | 'paused' | 'ended';
  segments: TranscriptSegment[];
  userNotes: string;
  enhancedNotes: string;
  speakers: Record<string, string>;
  chatMessages: ChatMessage[];
  duration: number;
  audioMimeType?: string | null;
  audioDuration?: number | null;
  audioUpdatedAt?: string | null;
  audioUrl?: string | null;
  hasAudio?: boolean;
}
