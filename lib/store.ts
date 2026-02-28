import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  TranscriptSegment,
  ChatMessage,
  Meeting,
  PromptOptions,
  RecordingOptions,
  Folder,
  LlmSettings,
} from './types';

// 会议列表项（从 API 返回的精简结构）
export interface MeetingListItem {
  id: string;
  title: string;
  date: string;
  status: string;
  duration: number;
  createdAt: string;
  folderId: string | null;
  folder?: Folder | null;
  _count: { segments: number; chatMessages: number };
}

export interface MeetingListFilters {
  query?: string;
  dateFrom?: string;
  dateTo?: string;
  folderId?: string | null;
}

interface MeetingStore {
  // 当前会议状态
  meetingId: string;
  meetingTitle: string;
  meetingDate: number;
  status: Meeting['status'];
  duration: number;
  currentFolderId: string | null;

  // 转写
  segments: TranscriptSegment[];
  currentPartial: string;

  // 笔记
  userNotes: string;
  enhancedNotes: string;
  isEnhancing: boolean;

  // 说话人
  speakers: Record<string, string>;

  // Chat
  chatMessages: ChatMessage[];
  isChatLoading: boolean;
  promptOptions: PromptOptions;
  recordingOptions: RecordingOptions;
  llmSettings: LlmSettings;

  // 录音计时器
  recordingStartTime: number | null;

  // 双通道音频状态
  micLevel: number;
  systemLevel: number;
  systemAudioActive: boolean;
  micActive: boolean;

  // 会议列表
  meetingList: MeetingListItem[];
  isLoadingList: boolean;
  isSaving: boolean;
  isPersistedMeeting: boolean;
  folders: Folder[];
  isLoadingFolders: boolean;

  // Actions
  startMeeting: () => void;
  endMeeting: () => void;
  setStatus: (status: Meeting['status']) => void;
  setMeetingTitle: (title: string) => void;
  addSegment: (segment: TranscriptSegment) => void;
  updateLastSegment: (text: string) => void;
  setCurrentPartial: (text: string) => void;
  setUserNotes: (notes: string) => void;
  setEnhancedNotes: (notes: string) => void;
  setIsEnhancing: (v: boolean) => void;
  setSpeakerName: (speakerId: string, name: string) => void;
  addChatMessage: (message: ChatMessage) => void;
  setIsChatLoading: (v: boolean) => void;
  setPromptOptions: (patch: Partial<PromptOptions>) => void;
  setRecordingOptions: (patch: Partial<RecordingOptions>) => void;
  setLlmSettings: (patch: Partial<LlmSettings>) => void;
  setCurrentFolderId: (folderId: string | null) => void;
  updateDuration: () => void;
  setAudioLevels: (mic: number, system: number) => void;
  removeSegment: (segmentId: string) => void;
  reset: () => void;

  // 持久化 Actions
  saveMeeting: (options?: { allowEmpty?: boolean }) => Promise<void>;
  loadMeeting: (id: string) => Promise<void>;
  loadMeetingList: (filters?: MeetingListFilters) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
  loadFolders: () => Promise<void>;
  createFolder: (input: { name: string; color: string }) => Promise<Folder | null>;
  deleteFolder: (folderId: string) => Promise<void>;
  updateMeetingFolder: (meetingId: string, folderId: string | null) => Promise<void>;
}

export const useMeetingStore = create<MeetingStore>((set, get) => ({
  meetingId: uuidv4(),
  meetingTitle: '',
  meetingDate: Date.now(),
  status: 'idle',
  duration: 0,
  currentFolderId: null,
  segments: [],
  currentPartial: '',
  userNotes: '',
  enhancedNotes: '',
  isEnhancing: false,
  speakers: {},
  chatMessages: [],
  isChatLoading: false,
  promptOptions: {
    meetingType: '通用',
    outputStyle: '平衡',
    includeActionItems: true,
  },
  recordingOptions: {
    autoStopEnabled: true,
    autoStopMinutes: 10,
  },
  llmSettings: {
    provider: 'auto',
    minimaxApiKey: '',
    minimaxGroupId: '',
    minimaxModel: 'MiniMax-Text-01',
    openaiApiKey: '',
    openaiModel: 'gpt-4.1-mini',
    openaiBaseUrl: 'https://api.openai.com/v1',
  },
  recordingStartTime: null,
  micLevel: 0,
  systemLevel: 0,
  systemAudioActive: false,
  micActive: false,
  meetingList: [],
  isLoadingList: false,
  isSaving: false,
  isPersistedMeeting: false,
  folders: [],
  isLoadingFolders: false,

  startMeeting: () =>
    set({
      status: 'recording',
      meetingDate: Date.now(),
      recordingStartTime: Date.now(),
      meetingId: get().status === 'idle' ? uuidv4() : get().meetingId,
    }),

  endMeeting: () =>
    set({
      status: 'ended',
      recordingStartTime: null,
      micLevel: 0,
      systemLevel: 0,
      systemAudioActive: false,
      micActive: false,
    }),

  setStatus: (status) => set({ status }),
  setMeetingTitle: (title) => set({ meetingTitle: title }),

  addSegment: (segment) =>
    set((state) => ({
      segments: [...state.segments, segment],
      currentPartial: '',
    })),

  updateLastSegment: (text) =>
    set((state) => {
      const segments = [...state.segments];
      if (segments.length > 0) {
        segments[segments.length - 1] = {
          ...segments[segments.length - 1],
          text,
          isFinal: true,
        };
      }
      return { segments };
    }),

  setCurrentPartial: (text) => set({ currentPartial: text }),
  setUserNotes: (notes) => set({ userNotes: notes }),
  setEnhancedNotes: (notes) => set({ enhancedNotes: notes }),
  setIsEnhancing: (v) => set({ isEnhancing: v }),

  setSpeakerName: (speakerId, name) =>
    set((state) => ({
      speakers: { ...state.speakers, [speakerId]: name },
    })),

  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),

  setIsChatLoading: (v) => set({ isChatLoading: v }),
  setPromptOptions: (patch) =>
    set((state) => ({
      promptOptions: { ...state.promptOptions, ...patch },
    })),
  setRecordingOptions: (patch) =>
    set((state) => ({
      recordingOptions: { ...state.recordingOptions, ...patch },
    })),
  setLlmSettings: (patch) =>
    set((state) => ({
      llmSettings: { ...state.llmSettings, ...patch },
    })),
  setCurrentFolderId: (folderId) => set({ currentFolderId: folderId }),

  updateDuration: () => {
    const { recordingStartTime } = get();
    if (recordingStartTime) {
      set({ duration: Math.floor((Date.now() - recordingStartTime) / 1000) });
    }
  },

  setAudioLevels: (mic, system) =>
    set({
      micLevel: mic,
      systemLevel: system,
      micActive: mic > 0.05,
      systemAudioActive: system > 0.05,
    }),

  removeSegment: (segmentId) =>
    set((state) => ({
      segments: state.segments.filter((segment) => segment.id !== segmentId),
    })),

  reset: () =>
    set({
      meetingId: uuidv4(),
      meetingTitle: '',
      meetingDate: Date.now(),
      status: 'idle',
      duration: 0,
      currentFolderId: null,
      segments: [],
      currentPartial: '',
      userNotes: '',
      enhancedNotes: '',
      isEnhancing: false,
      speakers: {},
      chatMessages: [],
      isChatLoading: false,
      promptOptions: {
        meetingType: '通用',
        outputStyle: '平衡',
        includeActionItems: true,
      },
      recordingOptions: get().recordingOptions,
      llmSettings: get().llmSettings,
      recordingStartTime: null,
      micLevel: 0,
      systemLevel: 0,
      systemAudioActive: false,
      micActive: false,
      isPersistedMeeting: false,
    }),

  // ---- 持久化 ----

  saveMeeting: async (options) => {
    const state = get();
    if (
      !options?.allowEmpty &&
      state.segments.length === 0 &&
      !state.userNotes &&
      !state.enhancedNotes
    ) {
      return; // 没有内容不保存
    }
    set({ isSaving: true });
    try {
      await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: state.meetingId,
          title: state.meetingTitle,
          date: state.meetingDate,
          status: state.status,
          duration: state.duration,
          folderId: state.currentFolderId,
          userNotes: state.userNotes,
          enhancedNotes: state.enhancedNotes,
          speakers: state.speakers,
          segments: state.segments,
          chatMessages: state.chatMessages,
        }),
      });
      set({ isPersistedMeeting: true });
    } catch (e) {
      console.error('保存会议失败:', e);
    } finally {
      set({ isSaving: false });
    }
  },

  loadMeeting: async (id: string) => {
    try {
      const res = await fetch(`/api/meetings/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      set({
        meetingId: data.id,
        meetingTitle: data.title,
        meetingDate: new Date(data.date).getTime(),
        status: data.status as Meeting['status'],
        duration: data.duration,
        currentFolderId: data.folderId ?? null,
        userNotes: data.userNotes,
        enhancedNotes: data.enhancedNotes,
        speakers: data.speakers,
        segments: data.segments.map((s: TranscriptSegment) => ({
          id: s.id,
          speaker: s.speaker,
          text: s.text,
          startTime: s.startTime,
          endTime: s.endTime,
          isFinal: s.isFinal,
        })),
        chatMessages: data.chatMessages.map((m: ChatMessage) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          templateId: m.templateId,
        })),
        currentPartial: '',
        recordingStartTime: null,
        micLevel: 0,
        systemLevel: 0,
        systemAudioActive: false,
        micActive: false,
        isPersistedMeeting: true,
      });
    } catch (e) {
      console.error('加载会议失败:', e);
    }
  },

  loadMeetingList: async (filters) => {
    set({ isLoadingList: true });
    try {
      const params = new URLSearchParams();
      if (filters?.query?.trim()) params.set('query', filters.query.trim());
      if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters?.dateTo) params.set('dateTo', filters.dateTo);
      if (filters?.folderId) params.set('folderId', filters.folderId);

      const queryString = params.toString();
      const res = await fetch(`/api/meetings${queryString ? `?${queryString}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        set({ meetingList: data });
      }
    } catch (e) {
      console.error('加载会议列表失败:', e);
    } finally {
      set({ isLoadingList: false });
    }
  },

  deleteMeeting: async (id: string) => {
    try {
      await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
      // 从列表中移除
      set((state) => ({
        meetingList: state.meetingList.filter((m) => m.id !== id),
      }));
      // 如果删的是当前会议，重置
      if (get().meetingId === id) {
        get().reset();
      }
    } catch (e) {
      console.error('删除会议失败:', e);
    }
  },

  loadFolders: async () => {
    set({ isLoadingFolders: true });
    try {
      const res = await fetch('/api/folders');
      if (!res.ok) throw new Error('加载文件夹失败');
      const data = (await res.json()) as Folder[];
      set({ folders: data });
    } catch (e) {
      console.error('加载文件夹失败:', e);
    } finally {
      set({ isLoadingFolders: false });
    }
  },

  createFolder: async (input) => {
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || '创建文件夹失败');
      }
      const folder = data as Folder;
      set((state) => ({
        folders: [...state.folders, folder].sort((a, b) => a.sortOrder - b.sortOrder),
      }));
      return folder;
    } catch (e) {
      console.error('创建文件夹失败:', e);
      return null;
    }
  },

  deleteFolder: async (folderId) => {
    try {
      const res = await fetch(`/api/folders/${folderId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除文件夹失败');
      set((state) => ({
        folders: state.folders.filter((folder) => folder.id !== folderId),
        meetingList: state.meetingList.map((meeting) =>
          meeting.folderId === folderId
            ? { ...meeting, folderId: null, folder: null }
            : meeting
        ),
        currentFolderId: state.currentFolderId === folderId ? null : state.currentFolderId,
      }));
    } catch (e) {
      console.error('删除文件夹失败:', e);
    }
  },

  updateMeetingFolder: async (meetingId, folderId) => {
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || '更新会议分组失败');
      }

      const nextFolder =
        folderId === null ? null : get().folders.find((folder) => folder.id === folderId) || null;

      set((state) => ({
        meetingList: state.meetingList.map((meeting) =>
          meeting.id === meetingId
            ? { ...meeting, folderId, folder: nextFolder }
            : meeting
        ),
        currentFolderId: state.meetingId === meetingId ? folderId : state.currentFolderId,
      }));
    } catch (e) {
      console.error('更新会议分组失败:', e);
    }
  },
}));
