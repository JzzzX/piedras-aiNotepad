'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Copy, Check, FileDown, Share2 } from 'lucide-react';
import { useMeetingStore } from '@/lib/store';
import { enhanceNotes } from '@/lib/llm';
import { buildUnifiedMeetingMarkdown } from '@/lib/meeting-export';

export default function EnhancedNotes() {
  const {
    segments,
    userNotes,
    meetingTitle,
    meetingDate,
    enhancedNotes,
    isEnhancing,
    speakers,
    status,
    promptOptions,
    setEnhancedNotes,
    setIsEnhancing,
  } = useMeetingStore();

  const [copied, setCopied] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleGenerate = async () => {
    if (isEnhancing) return;
    setIsEnhancing(true);
    try {
      const result = await enhanceNotes(
        segments,
        userNotes,
        meetingTitle,
        speakers,
        undefined,
        promptOptions
      );
      setEnhancedNotes(result);
    } catch (error) {
      console.error('Enhance error:', error);
      const detail = error instanceof Error ? error.message : '未知错误';
      setEnhancedNotes(`生成失败：${detail}`);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleCopy = async () => {
    const markdown = buildUnifiedMeetingMarkdown({
      meetingTitle,
      meetingDate,
      enhancedNotes,
    });
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setFeedback('已复制统一结构化 Markdown');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportMarkdown = () => {
    const markdown = buildUnifiedMeetingMarkdown({
      meetingTitle,
      meetingDate,
      enhancedNotes,
    });
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meetingTitle || '会议纪要'}_${new Date().toLocaleDateString('zh-CN')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback('Markdown 导出成功');
  };

  const handleExportDocx = async () => {
    if (isExportingDocx) return;
    setIsExportingDocx(true);
    setFeedback('');
    try {
      const res = await fetch('/api/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingTitle,
          meetingDate,
          enhancedNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Docx 导出失败');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meetingTitle || '会议纪要'}_${new Date().toLocaleDateString('zh-CN')}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      setFeedback('Docx 导出成功');
    } catch (error) {
      const detail = error instanceof Error ? error.message : '未知错误';
      setFeedback(`Docx 导出失败：${detail}`);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleExperimentalShare = () => {
    const tip = '实验功能：后续接入飞书、企业微信 webhook 功能';
    setFeedback(tip);
    window.alert(tip);
  };

  const canGenerate = status === 'ended' || segments.length > 0;

  if (!enhancedNotes && !isEnhancing) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-3 text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-sky-400 hover:shadow-md active:scale-95 disabled:opacity-40 disabled:hover:bg-sky-500 disabled:shadow-none"
        >
          <Sparkles size={16} />
          AI 生成结构化笔记
        </button>
        {!canGenerate && (
          <p className="text-xs text-stone-400 font-medium">录音结束后可生成 AI 笔记</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isEnhancing ? (
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 size={24} className="animate-spin text-sky-400 mb-3" />
          <p className="text-[14px] font-semibold text-stone-600">AI 正在融合转写与笔记...</p>
          <p className="text-[12px] text-stone-400 mt-1">
            将你的要点与转写内容结合，生成结构化纪要
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-[15px] font-serif font-semibold text-stone-800">
              <Sparkles size={16} className="text-sky-500" />
              AI 会议纪要
            </h4>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-white hover:text-stone-700 hover:shadow-sm"
                title="复制"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
              <button
                onClick={handleExportMarkdown}
                className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-white hover:text-stone-700 hover:shadow-sm"
                title="导出 Markdown"
              >
                <FileDown size={14} />
              </button>
              <button
                onClick={handleExportDocx}
                disabled={isExportingDocx}
                className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-white hover:text-stone-700 hover:shadow-sm disabled:opacity-40"
                title="导出 Docx"
              >
                {isExportingDocx ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <span className="text-[11px] font-bold tracking-widest">DOCX</span>
                )}
              </button>
              <button
                onClick={handleExperimentalShare}
                className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-white hover:text-stone-700 hover:shadow-sm"
                title="实验功能（飞书/企业微信）"
              >
                <Share2 size={14} />
              </button>
              <button
                onClick={handleGenerate}
                className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-white hover:text-stone-700 hover:shadow-sm"
                title="重新生成"
              >
                <Sparkles size={14} />
              </button>
            </div>
          </div>
          <div className="prose prose-sm prose-stone max-w-none rounded-2xl border border-black/[0.04] bg-white p-6 shadow-sm">
            <div className="whitespace-pre-wrap text-[15px] leading-relaxed font-sans text-stone-800">
              {enhancedNotes}
            </div>
          </div>
          {feedback && (
            <p className="text-[12px] font-medium text-stone-500">{feedback}</p>
          )}
        </>
      )}
    </div>
  );
}
