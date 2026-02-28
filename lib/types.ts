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

export interface LlmSettings {
  provider: LlmSelection;
  minimaxApiKey: string;
  minimaxGroupId: string;
  minimaxModel: string;
  openaiApiKey: string;
  openaiModel: string;
  openaiBaseUrl: string;
}

export type LlmRuntimeConfig =
  | { provider: 'auto' }
  | { provider: 'minimax'; apiKey: string; groupId: string; model?: string }
  | { provider: 'openai'; apiKey: string; model: string; baseUrl?: string };

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

export interface Folder {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
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
}
