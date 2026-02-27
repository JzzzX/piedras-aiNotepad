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
      <div className="flex flex-col items-center justify-center gap-3 py-6">
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:shadow-lg active:scale-95 disabled:opacity-40 disabled:shadow-none"
        >
          <Sparkles size={16} />
          AI 生成结构化笔记
        </button>
        {!canGenerate && (
          <p className="text-xs text-zinc-400">录音结束后可生成 AI 笔记</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isEnhancing ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-amber-500 mb-3" />
          <p className="text-sm text-zinc-500">AI 正在融合转写与笔记...</p>
          <p className="text-xs text-zinc-400 mt-1">
            将你的要点与转写内容结合，生成结构化纪要
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-700">
              <Sparkles size={14} className="text-amber-500" />
              AI 会议纪要
            </h4>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                title="复制"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
              <button
                onClick={handleExportMarkdown}
                className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                title="导出 Markdown"
              >
                <FileDown size={14} />
              </button>
              <button
                onClick={handleExportDocx}
                disabled={isExportingDocx}
                className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-40"
                title="导出 Docx"
              >
                {isExportingDocx ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <span className="text-[11px] font-semibold">DOCX</span>
                )}
              </button>
              <button
                onClick={handleExperimentalShare}
                className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                title="实验功能（飞书/企业微信）"
              >
                <Share2 size={14} />
              </button>
              <button
                onClick={handleGenerate}
                className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                title="重新生成"
              >
                <Sparkles size={14} />
              </button>
            </div>
          </div>
          <div className="prose prose-sm prose-zinc max-w-none rounded-lg border border-zinc-100 bg-zinc-50 p-4">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {enhancedNotes}
            </div>
          </div>
          {feedback && (
            <p className="text-xs text-zinc-500">{feedback}</p>
          )}
        </>
      )}
    </div>
  );
}
