'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Mic, Square, Clock, Monitor, MonitorOff, Volume2 } from 'lucide-react';
import { useMeetingStore } from '@/lib/store';
import { v4 as uuidv4 } from 'uuid';

// 音量阈值：用于判定"正在说话"
const VOICE_THRESHOLD = 0.05;
// 系统音频静默超时（ms）：超过此时间认为对方停止说话
const SYSTEM_SILENCE_TIMEOUT = 1500;

export default function AudioRecorder() {
  const {
    status,
    duration,
    micLevel,
    systemLevel,
    systemAudioActive,
    micActive,
    startMeeting,
    endMeeting,
    addSegment,
    setCurrentPartial,
    updateDuration,
    setAudioLevels,
  } = useMeetingStore();

  const [hasSystemAudio, setHasSystemAudio] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const systemStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const systemAnalyserRef = useRef<AnalyserNode | null>(null);

  // 系统音频说话人追踪
  const systemSpeakingRef = useRef(false);
  const systemSpeakStartRef = useRef(0);
  const systemSilenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0)
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

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
            // 说了超过 0.8 秒才记录
            if (dur > 800) {
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

  const handleStart = useCallback(async () => {
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
        setHasSystemAudio(true);
      }
      // 停止不需要的视频轨道
      displayStream.getVideoTracks().forEach((t) => t.stop());
    } catch {
      // 用户取消或浏览器不支持 → 仅麦克风模式
      setHasSystemAudio(false);
    }

    // 3. 启动会议
    startMeeting();

    // 4. 计时器
    timerRef.current = setInterval(() => {
      updateDuration();
    }, 1000);

    // 5. 音频分析（双通道或单通道）
    setupAudioAnalysis(micStream, systemStream);

    // 6. Web Speech API（转写麦克风）
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('当前浏览器不支持语音识别，请使用 Chrome');
      return;
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
  }, [startMeeting, updateDuration, addSegment, setCurrentPartial, setupAudioAnalysis]);

  const handleStop = useCallback(() => {
    endMeeting();

    // 停止语音识别
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // 停止计时
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 停止音量监测
    cancelAnimationFrame(animFrameRef.current);

    // 停止音频流
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    systemStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    systemStreamRef.current = null;

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

    setHasSystemAudio(false);
  }, [endMeeting]);

  // 清理
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      cancelAnimationFrame(animFrameRef.current);
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      systemStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
      if (systemSilenceTimerRef.current) clearTimeout(systemSilenceTimerRef.current);
    };
  }, []);

  // 音量条渲染
  const LevelBar = ({ level, color }: { level: number; color: string }) => (
    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100">
      <div
        className={`h-full rounded-full transition-all duration-75 ${color}`}
        style={{ width: `${Math.min(level * 500, 100)}%` }}
      />
    </div>
  );

  return (
    <div className="flex items-center gap-3">
      {status === 'idle' || status === 'ended' ? (
        <div className="flex items-center gap-2">
          <button
            onClick={handleStart}
            className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-red-600 active:scale-95"
          >
            <Mic size={16} />
            开始录音
          </button>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="rounded-lg border border-zinc-200 p-2 text-zinc-400 transition-colors hover:border-zinc-300 hover:text-zinc-600"
            title="录音说明"
          >
            <Monitor size={14} />
          </button>
        </div>
      ) : (
        <>
          {/* 录音状态指示器 */}
          <div className="flex items-center gap-3 rounded-lg bg-red-50 px-3 py-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <Clock size={14} className="text-red-500" />
            <span className="font-mono text-sm text-red-600">
              {formatDuration(duration)}
            </span>

            {/* 双通道音量指示 */}
            <div className="ml-1 flex items-center gap-2 border-l border-red-200 pl-3">
              <div className="flex items-center gap-1.5" title="麦克风（你的声音）">
                <Mic size={12} className={micActive ? 'text-blue-500' : 'text-zinc-300'} />
                <LevelBar level={micLevel} color="bg-blue-400" />
              </div>
              <div className="flex items-center gap-1.5" title="系统音频（对方声音）">
                <Volume2
                  size={12}
                  className={systemAudioActive ? 'text-green-500' : 'text-zinc-300'}
                />
                {hasSystemAudio ? (
                  <LevelBar level={systemLevel} color="bg-green-400" />
                ) : (
                  <span className="text-xs text-zinc-300">未采集</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleStop}
            className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-zinc-900 active:scale-95"
          >
            <Square size={14} />
            结束
          </button>
        </>
      )}

      {/* 录音引导弹窗 */}
      {showGuide && (status === 'idle' || status === 'ended') && (
        <div className="absolute top-16 right-5 z-50 w-80 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl">
          <h4 className="mb-2 text-sm font-semibold text-zinc-800">
            Botless 双通道录音
          </h4>
          <div className="space-y-2 text-xs text-zinc-500 leading-relaxed">
            <p>
              点击「开始录音」后，系统会依次请求：
            </p>
            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700">
              <div className="flex items-center gap-2 font-medium">
                <Mic size={12} />
                1. 麦克风权限 — 采集你的声音
              </div>
            </div>
            <div className="rounded-lg bg-green-50 p-2.5 text-green-700">
              <div className="flex items-center gap-2 font-medium">
                <Monitor size={12} />
                2. 屏幕共享 — 采集会议中对方的声音
              </div>
              <p className="mt-1 text-green-600">
                请选择会议所在的浏览器标签页，并勾选「共享标签页音频」
              </p>
            </div>
            <p className="text-zinc-400">
              无需 Bot 进入会议 — 不会在会议中显示任何额外参会者
            </p>
          </div>
          <button
            onClick={() => setShowGuide(false)}
            className="mt-3 w-full rounded-lg bg-zinc-100 py-1.5 text-xs text-zinc-600 hover:bg-zinc-200"
          >
            知道了
          </button>
        </div>
      )}
    </div>
  );
}
