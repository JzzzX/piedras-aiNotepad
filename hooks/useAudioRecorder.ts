'use client';

import {
  useEffect,
  useRef,
  useCallback,
  useState,
  type ChangeEvent,
  type RefObject,
} from 'react';
import { useMeetingStore } from '@/lib/store';
import { v4 as uuidv4 } from 'uuid';
import type { AsrStatus } from '@/lib/asr';

// 音量阈值：用于判定"正在说话"
const VOICE_THRESHOLD = 0.05;
// 系统音频静默超时（ms）：超过此时间认为对方停止说话
const SYSTEM_SILENCE_TIMEOUT = 1500;
const PCM_SAMPLE_RATE = 16000;
const SCRIPT_BUFFER_SIZE = 4096;
export const AUTO_STOP_MINUTE_OPTIONS = [5, 10, 15, 30];
const UPLOAD_CHUNK_DURATION_MS = 200;
const UPLOAD_SEND_INTERVAL_MS = 30;
const MEETING_AUDIO_TIMESLICE_MS = 5000;
export const AUDIO_FILE_ACCEPT = 'audio/*,.mp3,.wav,.m4a,.aac,.mp4,.webm,.ogg,.flac';

type AudioSourceType = 'mic' | 'system';

interface AliyunWsPayload {
  result?: string;
  begin_time?: number;
  end_time?: number;
}

interface AliyunWsMessage {
  header?: {
    name?: string;
    status?: number;
    status_text?: string;
  };
  payload?: AliyunWsPayload;
}

interface AsrSessionResponse {
  session?: {
    wsUrl: string;
    token: string;
    appKey: string;
    tokenExpireTime: number | null;
    vocabularyId?: string | null;
  };
  error?: string;
}

interface AliyunChannelRuntime {
  appKey: string;
  taskId: string;
  started: boolean;
  pendingPcm: ArrayBuffer[];
  sourceType: AudioSourceType;
  speaker: string;
  sessionStartTime: number;
  ws: WebSocket;
  audioContext: AudioContext;
  sourceNode: MediaStreamAudioSourceNode;
  processorNode: ScriptProcessorNode;
  sinkNode: GainNode;
}

interface CancellableTask {
  cancel: () => void;
}

export interface RecorderAutoStopPrompt {
  reason: 'silence' | 'system-audio-ended';
  title: string;
  description: string;
}

export interface UseAudioRecorderResult {
  status: ReturnType<typeof useMeetingStore.getState>['status'];
  duration: number;
  formattedDuration: string;
  hasSystemAudio: boolean;
  micLevel: number;
  systemLevel: number;
  micActive: boolean;
  systemAudioActive: boolean;
  asrStatus: AsrStatus | null;
  isUploadingAudio: boolean;
  uploadProgress: number;
  uploadFileName: string;
  autoStopPrompt: RecorderAutoStopPrompt | null;
  recordingOptions: ReturnType<typeof useMeetingStore.getState>['recordingOptions'];
  canUploadAudio: boolean;
  audioFileInputRef: RefObject<HTMLInputElement | null>;
  refreshAsrStatus: () => Promise<AsrStatus>;
  startRecording: () => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  triggerUpload: () => Promise<void>;
  handleFileSelected: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  continueRecording: () => void;
  setAutoStopMinutes: (minutes: number) => void;
  setAutoStopEnabled: (enabled: boolean) => void;
}

function downsampleTo16k(input: Float32Array, inputSampleRate: number): Float32Array {
  if (inputSampleRate === PCM_SAMPLE_RATE) {
    return input;
  }

  const ratio = inputSampleRate / PCM_SAMPLE_RATE;
  const outputLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outputLength);

  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < output.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let sum = 0;
    let count = 0;

    for (let i = offsetBuffer; i < nextOffsetBuffer && i < input.length; i++) {
      sum += input[i];
      count++;
    }

    output[offsetResult] = count > 0 ? sum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }

  return output;
}

function toInt16PcmBuffer(float32Data: Float32Array): ArrayBuffer {
  const pcm = new Int16Array(float32Data.length);

  for (let i = 0; i < float32Data.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Data[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  return pcm.buffer;
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels <= 1) {
    return buffer.getChannelData(0);
  }

  const output = new Float32Array(buffer.length);

  for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex++) {
    const channelData = buffer.getChannelData(channelIndex);
    for (let sampleIndex = 0; sampleIndex < buffer.length; sampleIndex++) {
      output[sampleIndex] += channelData[sampleIndex];
    }
  }

  for (let sampleIndex = 0; sampleIndex < buffer.length; sampleIndex++) {
    output[sampleIndex] /= buffer.numberOfChannels;
  }

  return output;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createAliyunMessageId(): string {
  return uuidv4().replace(/-/g, '');
}

function getMeetingAudioMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;

  const candidates = ['audio/webm;codecs=opus', 'audio/webm'];
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return '';
}

export function useAudioRecorder(): UseAudioRecorderResult {
  const {
    status,
    duration,
    audioUrl,
    segments,
    micLevel,
    systemLevel,
    systemAudioActive,
    micActive,
    recordingOptions,
    startMeeting,
    pauseMeeting,
    resumeMeeting,
    endMeeting,
    addSegment,
    setCurrentPartial,
    setRecordingOptions,
    reset,
    saveMeeting,
    loadMeetingList,
    setMeetingTitle,
    updateDuration,
    setAudioLevels,
    currentWorkspaceId,
    setMeetingAudio,
  } = useMeetingStore();

  const [hasSystemAudio, setHasSystemAudio] = useState(false);
  const [asrStatus, setAsrStatus] = useState<AsrStatus | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState('');
  const [autoStopPrompt, setAutoStopPrompt] = useState<RecorderAutoStopPrompt | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const systemStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const systemAnalyserRef = useRef<AnalyserNode | null>(null);
  const meetingAudioContextRef = useRef<AudioContext | null>(null);
  const meetingAudioRecorderRef = useRef<MediaRecorder | null>(null);
  const meetingAudioPreviewUrlRef = useRef<string | null>(null);
  const meetingAudioChunksRef = useRef<Blob[]>([]);
  const aliyunChannelsRef = useRef<AliyunChannelRuntime[]>([]);
  const aliyunEnabledRef = useRef(false);
  const uploadTaskRef = useRef<CancellableTask | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const autoStopCheckTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTranscriptAtRef = useRef(Date.now());
  const autoStopPromptedRef = useRef(false);
  const systemAudioTrackRef = useRef<MediaStreamTrack | null>(null);

  // 系统音频说话人追踪
  const systemSpeakingRef = useRef(false);
  const systemSpeakStartRef = useRef(0);
  const systemSilenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatDuration = useCallback((seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0)
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, []);

  const releaseMeetingAudioPreview = useCallback(() => {
    if (meetingAudioPreviewUrlRef.current) {
      URL.revokeObjectURL(meetingAudioPreviewUrlRef.current);
      meetingAudioPreviewUrlRef.current = null;
    }
  }, []);

  const publishMeetingAudioBlob = useCallback(
    (blob: Blob, nextDuration: number, mimeType?: string | null) => {
      releaseMeetingAudioPreview();
      const nextUrl = URL.createObjectURL(blob);
      meetingAudioPreviewUrlRef.current = nextUrl;
      setMeetingAudio({
        url: nextUrl,
        blob,
        mimeType: mimeType || blob.type || 'audio/webm',
        duration: nextDuration,
        hasAudio: true,
        isDirty: true,
      });
    },
    [releaseMeetingAudioPreview, setMeetingAudio]
  );

  const startMeetingAudioCapture = useCallback(
    (micStream: MediaStream, systemStream?: MediaStream) => {
      if (typeof MediaRecorder === 'undefined') {
        setMeetingAudio({
          url: null,
          blob: null,
          mimeType: null,
          duration: 0,
          hasAudio: false,
          isDirty: false,
        });
        return;
      }

      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();
      const micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(destination);

      let systemSource: MediaStreamAudioSourceNode | null = null;
      if (systemStream) {
        systemSource = audioContext.createMediaStreamSource(systemStream);
        systemSource.connect(destination);
      }

      const preferredMimeType = getMeetingAudioMimeType();
      const recorder =
        preferredMimeType !== null
          ? new MediaRecorder(
              destination.stream,
              preferredMimeType ? { mimeType: preferredMimeType } : undefined
            )
          : null;

      if (!recorder) {
        audioContext.close().catch(() => undefined);
        return;
      }

      meetingAudioChunksRef.current = [];
      meetingAudioContextRef.current = audioContext;
      meetingAudioRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size === 0) return;
        meetingAudioChunksRef.current.push(event.data);
        const previewBlob = new Blob(meetingAudioChunksRef.current, {
          type: recorder.mimeType || preferredMimeType || event.data.type || 'audio/webm',
        });
        publishMeetingAudioBlob(
          previewBlob,
          Math.max(1, useMeetingStore.getState().duration),
          recorder.mimeType || preferredMimeType || event.data.type || 'audio/webm'
        );
      };

      recorder.start(MEETING_AUDIO_TIMESLICE_MS);
    },
    [publishMeetingAudioBlob, setMeetingAudio]
  );

  const stopMeetingAudioCapture = useCallback(
    async (finalDuration?: number) => {
      const recorder = meetingAudioRecorderRef.current;
      const audioContext = meetingAudioContextRef.current;
      meetingAudioRecorderRef.current = null;
      meetingAudioContextRef.current = null;

      if (!recorder) {
        await audioContext?.close().catch(() => undefined);
        return;
      }

      await new Promise<void>((resolve) => {
        const finalize = () => {
          const mimeType = recorder.mimeType || 'audio/webm';
          if (meetingAudioChunksRef.current.length > 0) {
            const finalBlob = new Blob(meetingAudioChunksRef.current, { type: mimeType });
            publishMeetingAudioBlob(
              finalBlob,
              finalDuration ?? useMeetingStore.getState().duration,
              mimeType
            );
          }

          audioContext?.close().catch(() => undefined);
          resolve();
        };

        if (recorder.state === 'inactive') {
          finalize();
          return;
        }

        recorder.addEventListener('stop', finalize, { once: true });
        recorder.stop();
      });
    },
    [publishMeetingAudioBlob]
  );

  const cleanupSystemAudioTrackListener = useCallback(() => {
    if (systemAudioTrackRef.current) {
      systemAudioTrackRef.current.onended = null;
      systemAudioTrackRef.current = null;
    }
  }, []);

  const requestAutoStopPrompt = useCallback(
    (reason: 'silence' | 'system-audio-ended') => {
      if (useMeetingStore.getState().status !== 'recording') return;
      if (autoStopPromptedRef.current) return;

      autoStopPromptedRef.current = true;

      if (reason === 'silence') {
        setAutoStopPrompt({
          reason,
          title: '检测到会议可能已结束',
          description: `已经连续 ${recordingOptions.autoStopMinutes} 分钟没有新的转写内容，是否停止录音？`,
        });
        return;
      }

      setAutoStopPrompt({
        reason,
        title: '系统音频已断开',
        description: '会议标签页音频流已结束。通常意味着共享停止或通话软件已退出，是否结束本次录音？',
      });
    },
    [recordingOptions.autoStopMinutes]
  );

  const resetRecorderState = useCallback(() => {
    setCurrentPartial('');
    setAudioLevels(0, 0);
    setHasSystemAudio(false);
    setAutoStopPrompt(null);
    autoStopPromptedRef.current = false;
    lastTranscriptAtRef.current = Date.now();
  }, [setCurrentPartial, setAudioLevels]);

  const loadAsrStatus = useCallback(async (): Promise<AsrStatus> => {
    try {
      const res = await fetch('/api/asr/status');
      if (!res.ok) throw new Error('failed to load asr status');
      const data = (await res.json()) as AsrStatus;
      setAsrStatus(data);
      return data;
    } catch {
      const fallback: AsrStatus = {
        mode: 'browser',
        provider: 'web-speech',
        configured: false,
        reachable: false,
        ready: false,
        missing: [],
        message: 'ASR 状态获取失败，默认使用浏览器转写',
        checkedAt: null,
        lastError: 'ASR 状态获取失败',
      };
      setAsrStatus(fallback);
      return fallback;
    }
  }, []);

  const handleContinueRecording = useCallback(() => {
    lastTranscriptAtRef.current = Date.now();
    autoStopPromptedRef.current = false;
    setAutoStopPrompt(null);
  }, []);

  // 从 AnalyserNode 获取音量（0~1）
  const getLevel = (analyser: AnalyserNode): number => {
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / data.length);
  };

  // 实时音量采样循环
  const startLevelMonitoring = useCallback(() => {
    const tick = () => {
      const micLvl = micAnalyserRef.current ? getLevel(micAnalyserRef.current) : 0;
      const sysLvl = systemAnalyserRef.current ? getLevel(systemAnalyserRef.current) : 0;
      setAudioLevels(micLvl, sysLvl);

      // 系统音频说话人检测
      if (sysLvl > VOICE_THRESHOLD) {
        if (systemSilenceTimerRef.current) {
          clearTimeout(systemSilenceTimerRef.current);
          systemSilenceTimerRef.current = null;
        }
        if (!systemSpeakingRef.current) {
          systemSpeakingRef.current = true;
          systemSpeakStartRef.current = Date.now();
        }
      } else if (systemSpeakingRef.current && !systemSilenceTimerRef.current) {
        // 开始静默计时
        systemSilenceTimerRef.current = setTimeout(() => {
          if (systemSpeakingRef.current) {
            const dur = Date.now() - systemSpeakStartRef.current;
            // 说了超过 0.8 秒才记录；aliyun 模式下由真实 ASR 结果替代
            if (dur > 800 && !aliyunEnabledRef.current) {
              useMeetingStore.getState().addSegment({
                id: uuidv4(),
                speaker: '对方（系统音频）',
                text: `[对方正在发言 ${(dur / 1000).toFixed(1)}s — 需配置云端 ASR 转写]`,
                startTime: systemSpeakStartRef.current,
                endTime: Date.now(),
                isFinal: true,
              });
            }
            systemSpeakingRef.current = false;
          }
          systemSilenceTimerRef.current = null;
        }, SYSTEM_SILENCE_TIMEOUT);
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, [setAudioLevels]);

  // 初始化 AudioContext + AnalyserNode
  const setupAudioAnalysis = useCallback(
    (micStream: MediaStream, systemStream?: MediaStream) => {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      // 麦克风分析
      const micSource = ctx.createMediaStreamSource(micStream);
      const micAnalyser = ctx.createAnalyser();
      micAnalyser.fftSize = 512;
      micSource.connect(micAnalyser);
      micAnalyserRef.current = micAnalyser;

      // 系统音频分析
      if (systemStream) {
        const sysSource = ctx.createMediaStreamSource(systemStream);
        const sysAnalyser = ctx.createAnalyser();
        sysAnalyser.fftSize = 512;
        sysSource.connect(sysAnalyser);
        systemAnalyserRef.current = sysAnalyser;
      }

      startLevelMonitoring();
    },
    [startLevelMonitoring]
  );

  const stopWebSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  const stopAliyunRecognition = useCallback(() => {
    const channels = aliyunChannelsRef.current;
    aliyunChannelsRef.current = [];
    aliyunEnabledRef.current = false;

    channels.forEach((channel) => {
      if (channel.ws.readyState === WebSocket.OPEN && channel.started) {
        channel.ws.send(
          JSON.stringify({
            header: {
              appkey: channel.appKey,
              message_id: createAliyunMessageId(),
              task_id: channel.taskId,
              namespace: 'SpeechTranscriber',
              name: 'StopTranscription',
            },
          })
        );
      }

      channel.ws.close();
      channel.processorNode.disconnect();
      channel.sourceNode.disconnect();
      channel.sinkNode.disconnect();
      channel.audioContext.close().catch(() => undefined);
    });
  }, []);

  const startWebSpeechRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      throw new Error('当前浏览器不支持语音识别，请使用 Chrome');
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;

      if (result.isFinal) {
        addSegment({
          id: uuidv4(),
          speaker: '我（麦克风）',
          text: text.trim(),
          startTime: Date.now() - 2000,
          endTime: Date.now(),
          isFinal: true,
        });
      } else {
        setCurrentPartial(text);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('请允许麦克风权限');
      }
    };

    recognition.onend = () => {
      if (useMeetingStore.getState().status === 'recording') {
        try {
          recognition.start();
        } catch {
          // ignore
        }
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, [addSegment, setCurrentPartial]);

  const createAliyunChannel = useCallback(
    (
      session: NonNullable<AsrSessionResponse['session']>,
      stream: MediaStream,
      sourceType: AudioSourceType
    ) => {
      const speaker = sourceType === 'mic' ? '我（麦克风）' : '对方（系统音频）';
      const audioContext = new AudioContext({ sampleRate: PCM_SAMPLE_RATE });
      const sourceNode = audioContext.createMediaStreamSource(stream);
      const processorNode = audioContext.createScriptProcessor(SCRIPT_BUFFER_SIZE, 1, 1);
      const sinkNode = audioContext.createGain();
      sinkNode.gain.value = 0;

      sourceNode.connect(processorNode);
      processorNode.connect(sinkNode);
      sinkNode.connect(audioContext.destination);

      const ws = new WebSocket(`${session.wsUrl}?token=${encodeURIComponent(session.token)}`);
      const sessionStartTime = Date.now();
      const taskId = createAliyunMessageId();

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            header: {
              appkey: session.appKey,
              message_id: createAliyunMessageId(),
              task_id: taskId,
              namespace: 'SpeechTranscriber',
              name: 'StartTranscription',
            },
            payload: {
              format: 'pcm',
              sample_rate: PCM_SAMPLE_RATE,
              enable_intermediate_result: true,
              enable_punctuation_prediction: true,
              enable_inverse_text_normalization: true,
              ...(session.vocabularyId ? { vocabulary_id: session.vocabularyId } : {}),
            },
          })
        );
      };

      ws.onmessage = (event) => {
        if (typeof event.data !== 'string') return;

        try {
          const message = JSON.parse(event.data) as AliyunWsMessage;
          const eventName = message.header?.name;
          const result = message.payload?.result?.trim() || '';
          const runtime = aliyunChannelsRef.current.find(
            (c) => c.taskId === taskId && c.sourceType === sourceType
          );

          if (eventName === 'TranscriptionStarted' && runtime) {
            runtime.started = true;
            for (const pcm of runtime.pendingPcm) {
              ws.send(pcm);
            }
            runtime.pendingPcm = [];
          }

          if (eventName === 'TranscriptionResultChanged' && sourceType === 'mic') {
            setCurrentPartial(result);
          }

          if (eventName === 'SentenceEnd' && result) {
            const beginTime = message.payload?.begin_time;
            const endTime = message.payload?.end_time;
            const startTime =
              typeof beginTime === 'number' ? sessionStartTime + beginTime : Date.now() - 1500;
            const finalTime = typeof endTime === 'number' ? sessionStartTime + endTime : Date.now();

            addSegment({
              id: uuidv4(),
              speaker,
              text: result,
              startTime,
              endTime: finalTime,
              isFinal: true,
            });

            if (sourceType === 'mic') {
              setCurrentPartial('');
            }
          }

          if (eventName === 'TaskFailed') {
            console.error('Aliyun ASR failed:', message.header?.status_text || event.data);
            if (runtime) {
              runtime.started = false;
              runtime.pendingPcm = [];
            }
          }
        } catch {
          // 忽略非 JSON 事件
        }
      };

      ws.onerror = (event) => {
        console.error(`Aliyun ASR websocket error (${speaker}):`, event);
      };

      processorNode.onaudioprocess = (event) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        if (event.inputBuffer.numberOfChannels < 1) return;

        const input = event.inputBuffer.getChannelData(0);
        const downsampled = downsampleTo16k(input, audioContext.sampleRate);
        const pcmBuffer = toInt16PcmBuffer(downsampled);
        const runtime = aliyunChannelsRef.current.find(
          (c) => c.taskId === taskId && c.sourceType === sourceType
        );

        if (!runtime || !runtime.started) {
          if (runtime) {
            runtime.pendingPcm.push(pcmBuffer);
            if (runtime.pendingPcm.length > 12) {
              runtime.pendingPcm.shift();
            }
          }
          return;
        }

        ws.send(pcmBuffer);
      };

      const runtime: AliyunChannelRuntime = {
        appKey: session.appKey,
        taskId,
        started: false,
        pendingPcm: [],
        sourceType,
        speaker,
        sessionStartTime,
        ws,
        audioContext,
        sourceNode,
        processorNode,
        sinkNode,
      };

      aliyunChannelsRef.current.push(runtime);
    },
    [addSegment, setCurrentPartial]
  );

  const createAliyunSession = useCallback(
    async (includeSystemAudio = false, workspaceId?: string | null) => {
      const res = await fetch('/api/asr/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleRate: PCM_SAMPLE_RATE,
          channels: 1,
          includeSystemAudio,
          workspaceId: workspaceId || undefined,
        }),
      });

      const data = (await res.json()) as AsrSessionResponse;
      if (!res.ok) {
        throw new Error(data.error || '创建阿里云 ASR 会话失败');
      }

      if (!data.session?.token || !data.session?.appKey || !data.session?.wsUrl) {
        throw new Error('阿里云 ASR 会话返回不完整');
      }

      return data.session;
    },
    []
  );

  const transcribeAudioFile = useCallback(
    async (session: NonNullable<AsrSessionResponse['session']>, file: File) => {
      const rawBuffer = await file.arrayBuffer();
      const decodeContext = new AudioContext();

      let decodedBuffer: AudioBuffer;
      try {
        decodedBuffer = await decodeContext.decodeAudioData(rawBuffer.slice(0));
      } finally {
        decodeContext.close().catch(() => undefined);
      }

      const monoData = mixToMono(decodedBuffer);
      const downsampled = downsampleTo16k(monoData, decodedBuffer.sampleRate);
      const pcmSamples = new Int16Array(toInt16PcmBuffer(downsampled));

      if (pcmSamples.length === 0) {
        throw new Error('音频内容为空，无法转写');
      }

      const taskId = createAliyunMessageId();
      const sessionStartTime = Date.now();
      const totalSamples = pcmSamples.length;
      const chunkSamples = Math.max(
        1,
        Math.round((PCM_SAMPLE_RATE * UPLOAD_CHUNK_DURATION_MS) / 1000)
      );
      const ws = new WebSocket(`${session.wsUrl}?token=${encodeURIComponent(session.token)}`);

      useMeetingStore.setState({ duration: 0 });

      await new Promise<void>((resolve, reject) => {
        let isSettled = false;
        let isCancelled = false;
        let sendLoopStarted = false;

        const cleanup = () => {
          uploadTaskRef.current = null;
          setCurrentPartial('');
          setUploadProgress(0);
        };

        const finalize = (callback: () => void) => {
          if (isSettled) return;
          isSettled = true;
          cleanup();
          callback();
        };

        const rejectWith = (message: string) => {
          finalize(() => {
            try {
              ws.close();
            } catch {
              // ignore
            }
            reject(new Error(message));
          });
        };

        const resolveWith = () => {
          finalize(() => {
            try {
              ws.close();
            } catch {
              // ignore
            }
            resolve();
          });
        };

        uploadTaskRef.current = {
          cancel: () => {
            isCancelled = true;
            try {
              ws.close();
            } catch {
              // ignore
            }
          },
        };

        const sendChunks = async () => {
          for (let offset = 0; offset < totalSamples; offset += chunkSamples) {
            if (isCancelled) {
              rejectWith('已取消上传转写');
              return;
            }

            if (ws.readyState !== WebSocket.OPEN) {
              rejectWith('上传音频转写连接已关闭');
              return;
            }

            const chunk = pcmSamples.slice(offset, Math.min(offset + chunkSamples, totalSamples));
            ws.send(chunk.buffer);

            const processedSamples = Math.min(offset + chunk.length, totalSamples);
            setUploadProgress(processedSamples / totalSamples);
            useMeetingStore.setState({
              duration: Math.floor(processedSamples / PCM_SAMPLE_RATE),
            });

            await sleep(UPLOAD_SEND_INTERVAL_MS);
          }

          if (isCancelled) {
            rejectWith('已取消上传转写');
            return;
          }

          ws.send(
            JSON.stringify({
              header: {
                appkey: session.appKey,
                message_id: createAliyunMessageId(),
                task_id: taskId,
                namespace: 'SpeechTranscriber',
                name: 'StopTranscription',
              },
            })
          );
        };

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              header: {
                appkey: session.appKey,
                message_id: createAliyunMessageId(),
                task_id: taskId,
                namespace: 'SpeechTranscriber',
                name: 'StartTranscription',
              },
              payload: {
                format: 'pcm',
                sample_rate: PCM_SAMPLE_RATE,
                enable_intermediate_result: true,
                enable_punctuation_prediction: true,
                enable_inverse_text_normalization: true,
                ...(session.vocabularyId ? { vocabulary_id: session.vocabularyId } : {}),
              },
            })
          );
        };

        ws.onmessage = (event) => {
          if (typeof event.data !== 'string') return;

          try {
            const message = JSON.parse(event.data) as AliyunWsMessage;
            const eventName = message.header?.name;
            const result = message.payload?.result?.trim() || '';

            if (eventName === 'TranscriptionStarted' && !sendLoopStarted) {
              sendLoopStarted = true;
              void sendChunks();
              return;
            }

            if (eventName === 'TranscriptionResultChanged') {
              setCurrentPartial(result);
              return;
            }

            if (eventName === 'SentenceEnd' && result) {
              const beginTime = message.payload?.begin_time;
              const endTime = message.payload?.end_time;
              const startTime =
                typeof beginTime === 'number' ? sessionStartTime + beginTime : Date.now() - 1500;
              const finalTime =
                typeof endTime === 'number' ? sessionStartTime + endTime : Date.now();

              addSegment({
                id: uuidv4(),
                speaker: '录音文件',
                text: result,
                startTime,
                endTime: finalTime,
                isFinal: true,
              });
              return;
            }

            if (eventName === 'TranscriptionCompleted') {
              setMeetingAudio({
                duration: Math.round(decodedBuffer.duration),
                hasAudio: true,
                isDirty: true,
              });
              useMeetingStore.setState({
                duration: Math.round(decodedBuffer.duration),
              });
              resolveWith();
              return;
            }

            if (eventName === 'TaskFailed') {
              rejectWith(message.header?.status_text || '上传音频转写失败');
            }
          } catch {
            // ignore
          }
        };

        ws.onerror = () => {
          rejectWith('上传音频转写连接失败');
        };

        ws.onclose = () => {
          if (isSettled) return;
          if (isCancelled) {
            rejectWith('已取消上传转写');
            return;
          }
          rejectWith('上传音频转写连接已关闭');
        };
      });
    },
    [addSegment, setCurrentPartial, setMeetingAudio]
  );

  const handleUploadAudioClick = useCallback(async () => {
    if (status === 'recording' || status === 'paused') {
      alert('请先停止当前录音，再上传音频文件');
      return;
    }

    const currentAsrStatus = asrStatus ?? (await loadAsrStatus());
    const canUseAliyun = currentAsrStatus.mode === 'aliyun' && currentAsrStatus.ready;

    if (!canUseAliyun) {
      alert('上传音频转写仅支持已配置好的阿里云 ASR');
      return;
    }

    audioFileInputRef.current?.click();
  }, [asrStatus, loadAsrStatus, status]);

  useEffect(() => {
    const handleTriggerUpload = () => {
      void handleUploadAudioClick();
    };

    window.addEventListener('piedras:triggerUploadAudio', handleTriggerUpload);
    return () => {
      window.removeEventListener('piedras:triggerUploadAudio', handleTriggerUpload);
    };
  }, [handleUploadAudioClick]);

  const handleAudioFileSelected = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';

      if (!file) return;

      if (status === 'recording' || status === 'paused') {
        alert('请先停止当前录音，再上传音频文件');
        return;
      }

      const currentAsrStatus = await loadAsrStatus();
      const canUseAliyun = currentAsrStatus.mode === 'aliyun' && currentAsrStatus.ready;

      if (!canUseAliyun) {
        alert('上传音频转写仅支持已配置好的阿里云 ASR');
        return;
      }

      setAutoStopPrompt(null);
      setUploadFileName(file.name);
      setIsUploadingAudio(true);
      setUploadProgress(0);
      setHasSystemAudio(false);

      try {
        const currentState = useMeetingStore.getState();
        if (
          currentState.segments.length > 0 ||
          currentState.userNotes ||
          currentState.enhancedNotes ||
          currentState.chatMessages.length > 0
        ) {
          await saveMeeting();
          await loadMeetingList();
        }

        reset();
        startMeeting();
        publishMeetingAudioBlob(file, 0, file.type || 'audio/webm');
        setMeetingTitle(file.name.replace(/\.[^.]+$/, ''));
        setCurrentPartial('正在解析音频文件...');

        const session = await createAliyunSession(false, currentWorkspaceId);
        setCurrentPartial('正在上传并转写音频...');
        await transcribeAudioFile(session, file);

        endMeeting();
        await saveMeeting();
        await loadMeetingList();
      } catch (error) {
        const message = error instanceof Error ? error.message : '上传音频转写失败';
        if (message !== '已取消上传转写') {
          console.error('上传音频转写失败:', error);
          alert(message);
        }

        if (useMeetingStore.getState().segments.length === 0) {
          reset();
        } else {
          endMeeting();
        }
      } finally {
        uploadTaskRef.current = null;
        setCurrentPartial('');
        setIsUploadingAudio(false);
        setUploadProgress(0);
        setUploadFileName('');
      }
    },
    [
      createAliyunSession,
      currentWorkspaceId,
      endMeeting,
      loadAsrStatus,
      loadMeetingList,
      reset,
      saveMeeting,
      setCurrentPartial,
      setMeetingTitle,
      startMeeting,
      status,
      publishMeetingAudioBlob,
      transcribeAudioFile,
    ]
  );

  const startAliyunRecognition = useCallback(
    async (micStream: MediaStream, systemStream?: MediaStream) => {
      stopAliyunRecognition();

      const session = await createAliyunSession(Boolean(systemStream), currentWorkspaceId);

      createAliyunChannel(session, micStream, 'mic');
      if (systemStream) {
        createAliyunChannel(session, systemStream, 'system');
      }

      aliyunEnabledRef.current = true;
    },
    [createAliyunChannel, createAliyunSession, currentWorkspaceId, stopAliyunRecognition]
  );

  const cleanupLocalTracks = useCallback(() => {
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    systemStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    systemStreamRef.current = null;
  }, []);

  const handleStart = useCallback(async () => {
    cleanupSystemAudioTrackListener();
    setAutoStopPrompt(null);
    autoStopPromptedRef.current = false;
    lastTranscriptAtRef.current = Date.now();

    // 1. 获取麦克风
    let micStream: MediaStream;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;
    } catch {
      alert('请允许麦克风权限以使用语音转写功能');
      return;
    }

    // 2. 尝试获取系统音频（用户可跳过）
    let systemStream: MediaStream | undefined;
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1, height: 1 }, // 最小化视频（仅需音频）
        audio: true,
      });
      // 提取音频轨道
      const audioTracks = displayStream.getAudioTracks();
      if (audioTracks.length > 0) {
        systemStream = new MediaStream(audioTracks);
        systemStreamRef.current = systemStream;
        systemAudioTrackRef.current = audioTracks[0];
        systemAudioTrackRef.current.onended = () => {
          requestAutoStopPrompt('system-audio-ended');
        };
        setHasSystemAudio(true);
      }
      // 停止不需要的视频轨道
      displayStream.getVideoTracks().forEach((t) => t.stop());
    } catch {
      // 用户取消或浏览器不支持 → 仅麦克风模式
      setHasSystemAudio(false);
    }

    const currentAsrStatus = await loadAsrStatus();
    const useAliyunAsr = currentAsrStatus.mode === 'aliyun' && currentAsrStatus.ready;

    if (!useAliyunAsr) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        cleanupLocalTracks();
        resetRecorderState();
        alert('当前浏览器不支持语音识别，请使用 Chrome');
        return;
      }
    }

    // 3. 启动会议
    startMeeting();
    startMeetingAudioCapture(micStream, systemStream);

    // 4. 计时器
    timerRef.current = setInterval(() => {
      updateDuration();
    }, 1000);

    // 5. 音频分析（双通道或单通道）
    setupAudioAnalysis(micStream, systemStream);

    // 6. 启动 ASR
    try {
      if (useAliyunAsr) {
        await startAliyunRecognition(micStream, systemStream);
      } else {
        startWebSpeechRecognition();
      }
    } catch (error) {
      console.error('启动 ASR 失败:', error);
      alert(error instanceof Error ? error.message : '启动 ASR 失败，请检查配置');

      stopWebSpeechRecognition();
      stopAliyunRecognition();

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (autoStopCheckTimerRef.current) {
        clearInterval(autoStopCheckTimerRef.current);
        autoStopCheckTimerRef.current = null;
      }
      cancelAnimationFrame(animFrameRef.current);

      cleanupSystemAudioTrackListener();
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      micAnalyserRef.current = null;
      systemAnalyserRef.current = null;

      cleanupLocalTracks();

      if (systemSilenceTimerRef.current) {
        clearTimeout(systemSilenceTimerRef.current);
        systemSilenceTimerRef.current = null;
      }
      systemSpeakingRef.current = false;

      void stopMeetingAudioCapture();
      endMeeting();
      resetRecorderState();
    }
  }, [
    cleanupSystemAudioTrackListener,
    cleanupLocalTracks,
    endMeeting,
    loadAsrStatus,
    requestAutoStopPrompt,
    resetRecorderState,
    setupAudioAnalysis,
    startAliyunRecognition,
    startMeetingAudioCapture,
    startMeeting,
    startWebSpeechRecognition,
    stopMeetingAudioCapture,
    stopAliyunRecognition,
    stopWebSpeechRecognition,
    updateDuration,
  ]);

  const handleStop = useCallback(async () => {
    if (uploadTaskRef.current) {
      uploadTaskRef.current.cancel();
      setIsUploadingAudio(false);
      setUploadProgress(0);
    }

    cleanupSystemAudioTrackListener();
    await stopMeetingAudioCapture(useMeetingStore.getState().duration);
    endMeeting();

    stopWebSpeechRecognition();
    stopAliyunRecognition();

    // 停止计时
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (autoStopCheckTimerRef.current) {
      clearInterval(autoStopCheckTimerRef.current);
      autoStopCheckTimerRef.current = null;
    }

    // 停止音量监测
    cancelAnimationFrame(animFrameRef.current);

    cleanupLocalTracks();

    // 关闭 AudioContext
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    micAnalyserRef.current = null;
    systemAnalyserRef.current = null;

    // 清理系统音频说话人状态
    if (systemSilenceTimerRef.current) {
      clearTimeout(systemSilenceTimerRef.current);
      systemSilenceTimerRef.current = null;
    }
    systemSpeakingRef.current = false;

    resetRecorderState();
  }, [
    cleanupSystemAudioTrackListener,
    cleanupLocalTracks,
    endMeeting,
    resetRecorderState,
    stopMeetingAudioCapture,
    stopAliyunRecognition,
    stopWebSpeechRecognition,
  ]);

  const pauseRecording = useCallback(async () => {
    if (status !== 'recording') return;

    stopWebSpeechRecognition();
    stopAliyunRecognition();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (autoStopCheckTimerRef.current) {
      clearInterval(autoStopCheckTimerRef.current);
      autoStopCheckTimerRef.current = null;
    }

    cancelAnimationFrame(animFrameRef.current);

    if (meetingAudioRecorderRef.current?.state === 'recording') {
      meetingAudioRecorderRef.current.pause();
    }

    await Promise.allSettled([
      audioCtxRef.current?.suspend() ?? Promise.resolve(),
      meetingAudioContextRef.current?.suspend() ?? Promise.resolve(),
    ]);

    setCurrentPartial('');
    setAudioLevels(0, 0);
    pauseMeeting();
  }, [
    pauseMeeting,
    setAudioLevels,
    setCurrentPartial,
    status,
    stopAliyunRecognition,
    stopWebSpeechRecognition,
  ]);

  const resumeRecording = useCallback(async () => {
    if (status !== 'paused') return;

    const micStream = micStreamRef.current;
    if (!micStream) {
      alert('当前录音会话已失效，请重新开始录音');
      return;
    }

    const liveSystemStream =
      systemStreamRef.current?.getAudioTracks().some((track) => track.readyState === 'live')
        ? systemStreamRef.current
        : undefined;

    if (!liveSystemStream) {
      setHasSystemAudio(false);
    }

    const currentAsrStatus = asrStatus ?? (await loadAsrStatus());
    const useAliyunAsr = currentAsrStatus.mode === 'aliyun' && currentAsrStatus.ready;

    try {
      if (useAliyunAsr) {
        await startAliyunRecognition(micStream, liveSystemStream);
      } else {
        startWebSpeechRecognition();
      }

      await Promise.allSettled([
        audioCtxRef.current?.resume() ?? Promise.resolve(),
        meetingAudioContextRef.current?.resume() ?? Promise.resolve(),
      ]);

      if (meetingAudioRecorderRef.current?.state === 'paused') {
        meetingAudioRecorderRef.current.resume();
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      timerRef.current = setInterval(() => {
        updateDuration();
      }, 1000);

      cancelAnimationFrame(animFrameRef.current);
      startLevelMonitoring();
      lastTranscriptAtRef.current = Date.now();
      autoStopPromptedRef.current = false;
      setAutoStopPrompt(null);
      resumeMeeting();
      updateDuration();
    } catch (error) {
      console.error('恢复录音失败:', error);
      alert(error instanceof Error ? error.message : '恢复录音失败，请重试');
    }
  }, [
    asrStatus,
    loadAsrStatus,
    resumeMeeting,
    startAliyunRecognition,
    startLevelMonitoring,
    startWebSpeechRecognition,
    status,
    updateDuration,
  ]);

  useEffect(() => {
    if (status !== 'recording') return;
    lastTranscriptAtRef.current = Date.now();
  }, [status]);

  useEffect(() => {
    if (status !== 'recording' || segments.length === 0) return;
    lastTranscriptAtRef.current = Date.now();
    if (autoStopPrompt?.reason === 'silence') {
      setAutoStopPrompt(null);
      autoStopPromptedRef.current = false;
    }
  }, [autoStopPrompt?.reason, segments.length, status]);

  useEffect(() => {
    if (status !== 'recording' || !recordingOptions.autoStopEnabled) {
      if (autoStopCheckTimerRef.current) {
        clearInterval(autoStopCheckTimerRef.current);
        autoStopCheckTimerRef.current = null;
      }
      return;
    }

    autoStopCheckTimerRef.current = setInterval(() => {
      const timeoutMs = recordingOptions.autoStopMinutes * 60 * 1000;
      if (Date.now() - lastTranscriptAtRef.current >= timeoutMs) {
        requestAutoStopPrompt('silence');
      }
    }, 10000);

    return () => {
      if (autoStopCheckTimerRef.current) {
        clearInterval(autoStopCheckTimerRef.current);
        autoStopCheckTimerRef.current = null;
      }
    };
  }, [
    recordingOptions.autoStopEnabled,
    recordingOptions.autoStopMinutes,
    requestAutoStopPrompt,
    status,
  ]);

  // 清理
  useEffect(() => {
    return () => {
      uploadTaskRef.current?.cancel();
      releaseMeetingAudioPreview();
      void stopMeetingAudioCapture();
      stopWebSpeechRecognition();
      stopAliyunRecognition();
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoStopCheckTimerRef.current) clearInterval(autoStopCheckTimerRef.current);
      cancelAnimationFrame(animFrameRef.current);
      cleanupSystemAudioTrackListener();
      cleanupLocalTracks();
      audioCtxRef.current?.close();
      if (systemSilenceTimerRef.current) clearTimeout(systemSilenceTimerRef.current);
    };
  }, [
    cleanupLocalTracks,
    cleanupSystemAudioTrackListener,
    releaseMeetingAudioPreview,
    stopMeetingAudioCapture,
    stopAliyunRecognition,
    stopWebSpeechRecognition,
  ]);

  useEffect(() => {
    void loadAsrStatus();
  }, [loadAsrStatus]);

  useEffect(() => {
    if (!audioUrl && meetingAudioPreviewUrlRef.current) {
      releaseMeetingAudioPreview();
      return;
    }

    if (
      audioUrl &&
      !audioUrl.startsWith('blob:') &&
      meetingAudioPreviewUrlRef.current
    ) {
      releaseMeetingAudioPreview();
    }
  }, [audioUrl, releaseMeetingAudioPreview]);

  const canUploadAudio =
    !isUploadingAudio &&
    status !== 'recording' &&
    status !== 'paused' &&
    asrStatus?.mode === 'aliyun' &&
    asrStatus.ready;

  const setAutoStopMinutes = useCallback(
    (minutes: number) => {
      setRecordingOptions({ autoStopMinutes: minutes });
    },
    [setRecordingOptions]
  );

  const setAutoStopEnabled = useCallback(
    (enabled: boolean) => {
      setRecordingOptions({ autoStopEnabled: enabled });
    },
    [setRecordingOptions]
  );

  return {
    status,
    duration,
    formattedDuration: formatDuration(duration),
    hasSystemAudio,
    micLevel,
    systemLevel,
    micActive,
    systemAudioActive,
    asrStatus,
    isUploadingAudio,
    uploadProgress,
    uploadFileName,
    autoStopPrompt,
    recordingOptions,
    canUploadAudio,
    audioFileInputRef,
    refreshAsrStatus: loadAsrStatus,
    startRecording: handleStart,
    pauseRecording,
    resumeRecording,
    stopRecording: handleStop,
    triggerUpload: handleUploadAudioClick,
    handleFileSelected: handleAudioFileSelected,
    continueRecording: handleContinueRecording,
    setAutoStopMinutes,
    setAutoStopEnabled,
  };
}
