import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  TranscriptSegment,
  ChatMessage,
  Meeting,
  PromptOptions,
  RecordingOptions,
  Collection,
  Workspace,
  LlmSettings,
  CandidateStatus,
  InterviewRecommendation,
  WorkspaceWorkflowMode,
} from './types';
import { DEFAULT_LLM_SETTINGS, normalizeLlmSettings } from './llm-config';

export type MeetingListScope = 'current' | 'all';

// 会议列表项（从 API 返回的精简结构）
export interface MeetingListItem {
  id: string;
  title: string;
  date: string;
  status: string;
  duration: number;
  createdAt: string;
  collectionId: string | null;
  workspaceId: string;
  userNotes: string;
  enhancedNotes: string;
  roundLabel: string;
  interviewerName: string;
  recommendation: InterviewRecommendation;
  handoffNote: string;
  collection?: Collection | null;
  workspace?: Pick<Workspace, 'id' | 'name' | 'icon' | 'color'> | null;
  _count: { segments: number; chatMessages: number };
}

export interface MeetingListFilters {
  query?: string;
  dateFrom?: string;
  dateTo?: string;
  collectionId?: string | null;
  workspaceScope?: MeetingListScope;
}

function revokeBlobUrl(url?: string | null) {
  if (typeof window === 'undefined') return;
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

interface MeetingStore {
  // 当前会议状态
  meetingId: string;
  meetingTitle: string;
  meetingDate: number;
  status: Meeting['status'];
  duration: number;
  currentCollectionId: string | null;
  audioUrl: string | null;
  audioBlob: Blob | null;
  audioMimeType: string | null;
  audioDuration: number;
  audioUpdatedAt: string | null;
  hasAudio: boolean;
  audioDirty: boolean;

  // Workspace
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  isLoadingWorkspaces: boolean;

  // 转写
  segments: TranscriptSegment[];
  currentPartial: string;

  // 笔记
  userNotes: string;
  enhancedNotes: string;
  enhanceRecipeId: string | null;
  isEnhancing: boolean;
  roundLabel: string;
  interviewerName: string;
  recommendation: InterviewRecommendation;
  handoffNote: string;

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
  recordingAccumulatedMs: number;

  // 双通道音频状态
  micLevel: number;
  systemLevel: number;
  systemAudioActive: boolean;
  micActive: boolean;

  // 会议列表
  meetingList: MeetingListItem[];
  meetingListScope: MeetingListScope;
  isLoadingList: boolean;
  isSaving: boolean;
  isPersistedMeeting: boolean;
  meetingDirty: boolean;
  lastSavedAt: number | null;
  collections: Collection[];
  isLoadingCollections: boolean;

  // Actions
  startMeeting: () => void;
  pauseMeeting: () => void;
  resumeMeeting: () => void;
  endMeeting: () => void;
  setStatus: (status: Meeting['status']) => void;
  setMeetingTitle: (title: string) => void;
  addSegment: (segment: TranscriptSegment) => void;
  updateLastSegment: (text: string) => void;
  setCurrentPartial: (text: string) => void;
  setUserNotes: (notes: string) => void;
  setEnhancedNotes: (notes: string) => void;
  setEnhanceRecipeId: (recipeId: string | null) => void;
  setIsEnhancing: (v: boolean) => void;
  setInterviewMeta: (patch: {
    roundLabel?: string;
    interviewerName?: string;
    recommendation?: InterviewRecommendation;
    handoffNote?: string;
  }) => void;
  setSpeakerName: (speakerId: string, name: string) => void;
  addChatMessage: (message: ChatMessage) => void;
  setIsChatLoading: (v: boolean) => void;
  setPromptOptions: (patch: Partial<PromptOptions>) => void;
  setRecordingOptions: (patch: Partial<RecordingOptions>) => void;
  setLlmSettings: (patch: Partial<LlmSettings>) => void;
  setCurrentCollectionId: (collectionId: string | null) => void;
  setMeetingAudio: (input: {
    url?: string | null;
    blob?: Blob | null;
    mimeType?: string | null;
    duration?: number;
    updatedAt?: string | null;
    hasAudio?: boolean;
    isDirty?: boolean;
  }) => void;
  updateDuration: () => void;
  setAudioLevels: (mic: number, system: number) => void;
  removeSegment: (segmentId: string) => void;
  reset: () => void;

  // 持久化 Actions
  saveMeeting: (options?: { allowEmpty?: boolean; includeAudio?: boolean }) => Promise<boolean>;
  loadMeeting: (id: string) => Promise<void>;
  loadMeetingList: (filters?: MeetingListFilters) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
  loadCollections: () => Promise<void>;
  createCollection: (input: {
    name: string;
    description?: string;
    icon?: string;
    color: string;
    candidateStatus?: CandidateStatus;
    nextInterviewer?: string;
    nextFocus?: string;
    handoffSummary?: string;
  }) => Promise<Collection | null>;
  updateCollection: (id: string, input: {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    candidateStatus?: CandidateStatus;
    nextInterviewer?: string;
    nextFocus?: string;
    handoffSummary?: string;
  }) => Promise<Collection>;
  deleteCollection: (collectionId: string) => Promise<void>;
  updateMeetingCollection: (meetingId: string, collectionId: string | null) => Promise<void>;
  updateMeetingWorkspace: (meetingId: string, workspaceId: string) => Promise<void>;
  setMeetingListScope: (scope: MeetingListScope) => void;

  // Workspace Actions
  loadWorkspaces: () => Promise<void>;
  createWorkspace: (input: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    workflowMode?: WorkspaceWorkflowMode;
    modeLabel?: string;
  }) => Promise<Workspace>;
  updateWorkspace: (id: string, input: {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    workflowMode?: WorkspaceWorkflowMode;
    modeLabel?: string;
  }) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  setCurrentWorkspaceId: (id: string | null) => void;
}

export const useMeetingStore = create<MeetingStore>((set, get) => ({
  meetingId: uuidv4(),
  meetingTitle: '',
  meetingDate: Date.now(),
  status: 'idle',
  duration: 0,
  currentCollectionId: null,
  audioUrl: null,
  audioBlob: null,
  audioMimeType: null,
  audioDuration: 0,
  audioUpdatedAt: null,
  hasAudio: false,
  audioDirty: false,

  // Workspace
  workspaces: [],
  currentWorkspaceId: typeof window !== 'undefined'
    ? localStorage.getItem('piedras_currentWorkspaceId')
    : null,
  isLoadingWorkspaces: false,
  segments: [],
  currentPartial: '',
  userNotes: '',
  enhancedNotes: '',
  enhanceRecipeId: null,
  isEnhancing: false,
  roundLabel: '',
  interviewerName: '',
  recommendation: 'pending',
  handoffNote: '',
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
  llmSettings: DEFAULT_LLM_SETTINGS,
  recordingStartTime: null,
  recordingAccumulatedMs: 0,
  micLevel: 0,
  systemLevel: 0,
  systemAudioActive: false,
  micActive: false,
  meetingList: [],
  meetingListScope: 'current',
  isLoadingList: false,
  isSaving: false,
  isPersistedMeeting: false,
  meetingDirty: false,
  lastSavedAt: null,
  collections: [],
  isLoadingCollections: false,

  startMeeting: () =>
    set({
      status: 'recording',
      meetingDate: Date.now(),
      recordingStartTime: Date.now(),
      recordingAccumulatedMs: 0,
      meetingId: get().status === 'idle' ? uuidv4() : get().meetingId,
      meetingDirty: true,
    }),

  pauseMeeting: () =>
    set((state) => {
      const nextAccumulatedMs =
        state.recordingStartTime !== null
          ? state.recordingAccumulatedMs + (Date.now() - state.recordingStartTime)
          : state.recordingAccumulatedMs;

      return {
        status: 'paused',
        duration: Math.floor(nextAccumulatedMs / 1000),
        recordingStartTime: null,
        recordingAccumulatedMs: nextAccumulatedMs,
        micLevel: 0,
        systemLevel: 0,
        systemAudioActive: false,
        micActive: false,
        meetingDirty: true,
      };
    }),

  resumeMeeting: () =>
    set((state) => ({
      status: 'recording',
      recordingStartTime: Date.now(),
      recordingAccumulatedMs: state.recordingAccumulatedMs,
      meetingDirty: true,
    })),

  endMeeting: () =>
    set((state) => {
      const nextAccumulatedMs =
        state.recordingStartTime !== null
          ? state.recordingAccumulatedMs + (Date.now() - state.recordingStartTime)
          : state.recordingAccumulatedMs;

      return {
        status: 'ended',
        duration: Math.floor(nextAccumulatedMs / 1000),
        recordingStartTime: null,
        recordingAccumulatedMs: nextAccumulatedMs,
        micLevel: 0,
        systemLevel: 0,
        systemAudioActive: false,
        micActive: false,
        meetingDirty: true,
      };
    }),

  setStatus: (status) => set({ status, meetingDirty: true }),
  setMeetingTitle: (title) => set({ meetingTitle: title, meetingDirty: true }),

  addSegment: (segment) =>
    set((state) => ({
      segments: [...state.segments, segment],
      currentPartial: '',
      meetingDirty: true,
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
      return { segments, meetingDirty: true };
    }),

  setCurrentPartial: (text) => set({ currentPartial: text }),
  setUserNotes: (notes) => set({ userNotes: notes, meetingDirty: true }),
  setEnhancedNotes: (notes) => set({ enhancedNotes: notes, meetingDirty: true }),
  setEnhanceRecipeId: (recipeId) => set({ enhanceRecipeId: recipeId, meetingDirty: true }),
  setIsEnhancing: (v) => set({ isEnhancing: v }),
  setInterviewMeta: (patch) =>
    set((state) => ({
      roundLabel: patch.roundLabel !== undefined ? patch.roundLabel : state.roundLabel,
      interviewerName:
        patch.interviewerName !== undefined ? patch.interviewerName : state.interviewerName,
      recommendation:
        patch.recommendation !== undefined ? patch.recommendation : state.recommendation,
      handoffNote: patch.handoffNote !== undefined ? patch.handoffNote : state.handoffNote,
      meetingDirty: true,
    })),

  setSpeakerName: (speakerId, name) =>
    set((state) => ({
      speakers: { ...state.speakers, [speakerId]: name },
      meetingDirty: true,
    })),

  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
      meetingDirty: true,
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
      llmSettings: normalizeLlmSettings({ ...state.llmSettings, ...patch }),
    })),
  setCurrentCollectionId: (collectionId) => set({ currentCollectionId: collectionId, meetingDirty: true }),
  setMeetingAudio: (input) =>
    set((state) => {
      const nextUrl = input.url !== undefined ? input.url : state.audioUrl;
      if (input.url !== undefined && input.url !== state.audioUrl) {
        revokeBlobUrl(state.audioUrl);
      }

      return {
        audioUrl: nextUrl,
        audioBlob: input.blob !== undefined ? input.blob : state.audioBlob,
        audioMimeType:
          input.mimeType !== undefined ? input.mimeType : state.audioMimeType,
        audioDuration:
          input.duration !== undefined ? input.duration : state.audioDuration,
        audioUpdatedAt:
          input.updatedAt !== undefined ? input.updatedAt : state.audioUpdatedAt,
        hasAudio: input.hasAudio !== undefined ? input.hasAudio : state.hasAudio,
        audioDirty: input.isDirty !== undefined ? input.isDirty : state.audioDirty,
      };
    }),

  updateDuration: () => {
    const { recordingStartTime, recordingAccumulatedMs } = get();
    if (recordingStartTime) {
      set({
        duration: Math.floor(
          (recordingAccumulatedMs + (Date.now() - recordingStartTime)) / 1000
        ),
      });
      return;
    }

    set({ duration: Math.floor(recordingAccumulatedMs / 1000) });
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
      meetingDirty: true,
    })),

  reset: () =>
    set((state) => {
      revokeBlobUrl(state.audioUrl);
      return {
        meetingId: uuidv4(),
        meetingTitle: '',
        meetingDate: Date.now(),
        status: 'idle',
        duration: 0,
        currentCollectionId: null,
        audioUrl: null,
        audioBlob: null,
        audioMimeType: null,
        audioDuration: 0,
        audioUpdatedAt: null,
        hasAudio: false,
        audioDirty: false,
        segments: [],
        currentPartial: '',
        userNotes: '',
        enhancedNotes: '',
        enhanceRecipeId: null,
        isEnhancing: false,
        roundLabel: '',
        interviewerName: '',
        recommendation: 'pending',
        handoffNote: '',
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
        recordingAccumulatedMs: 0,
        micLevel: 0,
        systemLevel: 0,
        systemAudioActive: false,
        micActive: false,
        isPersistedMeeting: false,
        meetingDirty: false,
        lastSavedAt: null,
      };
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
      return true; // 没有内容不保存
    }
    set({ isSaving: true });
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: state.meetingId,
          title: state.meetingTitle,
          date: state.meetingDate,
          status: state.status,
          duration: state.duration,
          collectionId: state.currentCollectionId,
          workspaceId: state.currentWorkspaceId,
          userNotes: state.userNotes,
          enhancedNotes: state.enhancedNotes,
          enhanceRecipeId: state.enhanceRecipeId,
          roundLabel: state.roundLabel,
          interviewerName: state.interviewerName,
          recommendation: state.recommendation,
          handoffNote: state.handoffNote,
          speakers: state.speakers,
          segments: state.segments,
          chatMessages: state.chatMessages,
        }),
      });
      if (!res.ok) {
        throw new Error(`保存会议失败：${res.status}`);
      }

      const shouldUploadAudio =
        options?.includeAudio ??
        (state.status !== 'recording' && state.status !== 'paused');

      if (
        shouldUploadAudio &&
        state.audioBlob &&
        state.audioDirty
      ) {
        const formData = new FormData();
        formData.append('file', state.audioBlob, 'meeting-audio');
        formData.append('mimeType', state.audioMimeType || state.audioBlob.type || 'audio/webm');
        formData.append('duration', String(state.audioDuration || state.duration || 0));

        const audioRes = await fetch(`/api/meetings/${state.meetingId}/audio`, {
          method: 'POST',
          body: formData,
        });
        const audioData = await audioRes.json().catch(() => ({}));
        if (!audioRes.ok) {
          throw new Error(
            (audioData as { error?: string }).error || '保存会议音频失败'
          );
        }

        set((currentState) => {
          const nextAudioUrl =
            (audioData as { audioUrl?: string | null }).audioUrl || currentState.audioUrl;
          if (nextAudioUrl !== currentState.audioUrl) {
            revokeBlobUrl(currentState.audioUrl);
          }

          return {
            isPersistedMeeting: true,
            meetingDirty: false,
            lastSavedAt: Date.now(),
            audioUrl: nextAudioUrl,
            audioMimeType:
              (audioData as { audioMimeType?: string | null }).audioMimeType ||
              currentState.audioMimeType,
            audioDuration:
              (audioData as { audioDuration?: number | null }).audioDuration ??
              currentState.audioDuration,
            audioUpdatedAt:
              (audioData as { audioUpdatedAt?: string | null }).audioUpdatedAt ||
              currentState.audioUpdatedAt,
            hasAudio: true,
            audioDirty: false,
          };
        });
      } else {
        set({ isPersistedMeeting: true, meetingDirty: false, lastSavedAt: Date.now() });
      }

      return true;
    } catch (e) {
      console.error('保存会议失败:', e);
      return false;
    } finally {
      set({ isSaving: false });
    }
  },

  loadMeeting: async (id: string) => {
    try {
      const res = await fetch(`/api/meetings/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      set((state) => {
        const nextAudioUrl =
          data.hasAudio && data.audioUrl ? String(data.audioUrl) : null;
        if (state.audioUrl !== nextAudioUrl) {
          revokeBlobUrl(state.audioUrl);
        }

        return {
          meetingId: data.id,
          meetingTitle: data.title,
          meetingDate: new Date(data.date).getTime(),
          status: data.status as Meeting['status'],
          duration: data.duration,
          currentCollectionId: data.collectionId ?? null,
          currentWorkspaceId: data.workspaceId ?? null,
          audioUrl: nextAudioUrl,
          audioBlob: null,
          audioMimeType: data.audioMimeType ?? null,
          audioDuration: data.audioDuration ?? 0,
          audioUpdatedAt: data.audioUpdatedAt ?? null,
          hasAudio: Boolean(data.hasAudio),
          audioDirty: false,
          userNotes: data.userNotes,
          enhancedNotes: data.enhancedNotes,
          enhanceRecipeId: data.enhanceRecipeId ?? null,
          roundLabel: data.roundLabel ?? '',
          interviewerName: data.interviewerName ?? '',
          recommendation: (data.recommendation ?? 'pending') as InterviewRecommendation,
          handoffNote: data.handoffNote ?? '',
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
            recipeId: m.recipeId || m.templateId,
            templateId: m.templateId,
          })),
          currentPartial: '',
          recordingStartTime: null,
          recordingAccumulatedMs: (data.duration ?? 0) * 1000,
          micLevel: 0,
          systemLevel: 0,
          systemAudioActive: false,
          micActive: false,
          isPersistedMeeting: true,
          meetingDirty: false,
          lastSavedAt: Date.now(),
        };
      });
      if (data.workspaceId) {
        localStorage.setItem('piedras_currentWorkspaceId', data.workspaceId);
      }
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
      if (filters?.collectionId) params.set('collectionId', filters.collectionId);
      const scope = filters?.workspaceScope || get().meetingListScope;
      const wsId = get().currentWorkspaceId;
      if (scope === 'current' && wsId) params.set('workspaceId', wsId);

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

  loadCollections: async () => {
    set({ isLoadingCollections: true });
    try {
      const wsId = get().currentWorkspaceId;
      const params = wsId ? `?workspaceId=${wsId}` : '';
      const res = await fetch(`/api/collections${params}`);
      if (!res.ok) throw new Error('加载 Collection 失败');
      const data = (await res.json()) as Collection[];
      set({ collections: data });
    } catch (e) {
      console.error('加载 Collection 失败:', e);
    } finally {
      set({ isLoadingCollections: false });
    }
  },

  createCollection: async (input) => {
    try {
      const wsId = get().currentWorkspaceId;
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, workspaceId: wsId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || '创建 Collection 失败');
      }
      const collection = data as Collection;
      set((state) => ({
        collections: [...state.collections, collection].sort((a, b) => a.sortOrder - b.sortOrder),
      }));
      return collection;
    } catch (e) {
      console.error('创建 Collection 失败:', e);
      return null;
    }
  },

  updateCollection: async (id, input) => {
    const res = await fetch(`/api/collections/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error((data as { error?: string }).error || '更新 Collection 失败');
      console.error('更新 Collection 失败:', error);
      throw error;
    }

    const updated = data as Collection;
    set((state) => ({
      collections: state.collections.map((collection) =>
        collection.id === id ? updated : collection
      ),
      meetingList: state.meetingList.map((meeting) =>
        meeting.collectionId === id
          ? { ...meeting, collection: updated }
          : meeting
      ),
    }));
    return updated;
  },

  deleteCollection: async (collectionId) => {
    try {
      const res = await fetch(`/api/collections/${collectionId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除 Collection 失败');
      set((state) => ({
        collections: state.collections.filter((collection) => collection.id !== collectionId),
        meetingList: state.meetingList.map((meeting) =>
          meeting.collectionId === collectionId
            ? { ...meeting, collectionId: null, collection: null }
            : meeting
        ),
        currentCollectionId: state.currentCollectionId === collectionId ? null : state.currentCollectionId,
      }));
    } catch (e) {
      console.error('删除 Collection 失败:', e);
    }
  },

  updateMeetingCollection: async (meetingId, collectionId) => {
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || '更新会议 Collection 失败');
      }

      const nextCollection =
        collectionId === null ? null : get().collections.find((collection) => collection.id === collectionId) || null;

      set((state) => ({
        meetingList: state.meetingList.map((meeting) =>
          meeting.id === meetingId
            ? { ...meeting, collectionId, collection: nextCollection }
            : meeting
        ),
        currentCollectionId: state.meetingId === meetingId ? collectionId : state.currentCollectionId,
      }));
    } catch (e) {
      console.error('更新会议 Collection 失败:', e);
    }
  },

  updateMeetingWorkspace: async (meetingId, workspaceId) => {
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, collectionId: null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || '更新会议工作区失败');
      }

      const nextWorkspace =
        get().workspaces.find((workspace) => workspace.id === workspaceId) || null;

      set((state) => ({
        meetingList: state.meetingList.map((meeting) =>
          meeting.id === meetingId
            ? {
                ...meeting,
                workspaceId,
                workspace: nextWorkspace
                  ? {
                      id: nextWorkspace.id,
                      name: nextWorkspace.name,
                      icon: nextWorkspace.icon,
                      color: nextWorkspace.color,
                    }
                  : null,
                collectionId: null,
                collection: null,
              }
            : meeting
        ),
        currentCollectionId: state.meetingId === meetingId ? null : state.currentCollectionId,
      }));
    } catch (e) {
      console.error('更新会议工作区失败:', e);
    }
  },

  setMeetingListScope: (scope) => set({ meetingListScope: scope }),

  // ---- Workspace ----

  loadWorkspaces: async () => {
    set({ isLoadingWorkspaces: true });
    try {
      const res = await fetch('/api/workspaces');
      if (!res.ok) throw new Error('加载工作区失败');
      const data = (await res.json()) as Workspace[];
      set({ workspaces: data });

      // If no currentWorkspaceId set, or it's invalid, use the first workspace
      const { currentWorkspaceId } = get();
      if (!currentWorkspaceId || !data.find((w) => w.id === currentWorkspaceId)) {
        const firstId = data[0]?.id || null;
        set({ currentWorkspaceId: firstId });
        if (firstId) {
          localStorage.setItem('piedras_currentWorkspaceId', firstId);
        }
      }
    } catch (e) {
      console.error('加载工作区失败:', e);
    } finally {
      set({ isLoadingWorkspaces: false });
    }
  },

  createWorkspace: async (input) => {
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error((data as { error?: string }).error || '创建工作区失败');
      console.error('创建工作区失败:', error);
      throw error;
    }
    const workspace = data as Workspace;
    set((state) => ({
      workspaces: [...state.workspaces, workspace].sort((a, b) => a.sortOrder - b.sortOrder),
    }));
    return workspace;
  },

  updateWorkspace: async (id, input) => {
    const res = await fetch(`/api/workspaces/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error((data as { error?: string }).error || '更新工作区失败');
      console.error('更新工作区失败:', error);
      throw error;
    }
    const updated = data as Workspace;
    set((state) => ({
      workspaces: state.workspaces.map((w) => (w.id === id ? updated : w)),
      meetingList: state.meetingList.map((meeting) =>
        meeting.workspaceId === id
          ? {
              ...meeting,
              workspace: meeting.workspace
                ? {
                    id: updated.id,
                    name: updated.name,
                    icon: updated.icon,
                    color: updated.color,
                  }
                : meeting.workspace,
            }
          : meeting
      ),
    }));
  },

  deleteWorkspace: async (id) => {
    try {
      const res = await fetch(`/api/workspaces/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || '删除工作区失败');
      }
      const remaining = get().workspaces.filter((w) => w.id !== id);
      set({ workspaces: remaining });
      // If deleted workspace was current, switch to first remaining
      if (get().currentWorkspaceId === id) {
        const nextId = remaining[0]?.id || null;
        get().setCurrentWorkspaceId(nextId);
      }
    } catch (e) {
      console.error('删除工作区失败:', e);
    }
  },

  setCurrentWorkspaceId: (id) => {
    set({ currentWorkspaceId: id });
    if (id) {
      localStorage.setItem('piedras_currentWorkspaceId', id);
    } else {
      localStorage.removeItem('piedras_currentWorkspaceId');
    }
  },
}));
