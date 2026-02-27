import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { TranscriptSegment, ChatMessage, Meeting } from './types';

interface MeetingStore {
  // 当前会议状态
  meetingId: string;
  meetingTitle: string;
  meetingDate: number;
  status: Meeting['status'];
  duration: number;

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

  // 录音计时器
  recordingStartTime: number | null;

  // 双通道音频状态
  micLevel: number;
  systemLevel: number;
  systemAudioActive: boolean;
  micActive: boolean;

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
  updateDuration: () => void;
  setAudioLevels: (mic: number, system: number) => void;
  reset: () => void;
}

export const useMeetingStore = create<MeetingStore>((set, get) => ({
  meetingId: uuidv4(),
  meetingTitle: '',
  meetingDate: Date.now(),
  status: 'idle',
  duration: 0,
  segments: [],
  currentPartial: '',
  userNotes: '',
  enhancedNotes: '',
  isEnhancing: false,
  speakers: {},
  chatMessages: [],
  isChatLoading: false,
  recordingStartTime: null,
  micLevel: 0,
  systemLevel: 0,
  systemAudioActive: false,
  micActive: false,

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

  reset: () =>
    set({
      meetingId: uuidv4(),
      meetingTitle: '',
      meetingDate: Date.now(),
      status: 'idle',
      duration: 0,
      segments: [],
      currentPartial: '',
      userNotes: '',
      enhancedNotes: '',
      isEnhancing: false,
      speakers: {},
      chatMessages: [],
      isChatLoading: false,
      recordingStartTime: null,
      micLevel: 0,
      systemLevel: 0,
      systemAudioActive: false,
      micActive: false,
    }),
}));
