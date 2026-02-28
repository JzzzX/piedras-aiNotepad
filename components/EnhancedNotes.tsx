'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  FileDown,
  Loader2,
  Send,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import { useMeetingStore } from '@/lib/store';
import { enhanceNotes } from '@/lib/llm';
import { buildUnifiedMeetingMarkdown } from '@/lib/meeting-export';

type ShareChannel = 'feishu' | 'wecom';
const SHARE_STORAGE_KEY = 'ai-notepad-webhook-config-v1';

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
    llmSettings,
    setEnhancedNotes,
    setIsEnhancing,
  } = useMeetingStore();

  const [copied, setCopied] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareChannel, setShareChannel] = useState<ShareChannel>('feishu');
  const [webhookUrls, setWebhookUrls] = useState<Record<ShareChannel, string>>({
    feishu: '',
    wecom: '',
  });
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SHARE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Record<ShareChannel, string>>;
      setWebhookUrls({
        feishu: parsed.feishu || '',
        wecom: parsed.wecom || '',
      });
    } catch {
      // ignore invalid local storage
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SHARE_STORAGE_KEY, JSON.stringify(webhookUrls));
  }, [webhookUrls]);

  const sharePreview = useMemo(
    () =>
      buildUnifiedMeetingMarkdown({
        meetingTitle,
        meetingDate,
        enhancedNotes,
      }),
    [enhancedNotes, meetingDate, meetingTitle]
  );

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
        promptOptions,
        llmSettings
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

  const handleShare = async () => {
    if (isSharing) return;

    setIsSharing(true);
    setFeedback('');
    try {
      const res = await fetch('/api/share/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: shareChannel,
          meetingTitle,
          meetingDate,
          enhancedNotes,
          webhookUrl: webhookUrls[shareChannel],
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || '分享失败');
      }

      setFeedback(`已发送到${shareChannel === 'feishu' ? '飞书' : '企业微信'} webhook`);
      setShowShareDialog(false);
    } catch (error) {
      const detail = error instanceof Error ? error.message : '未知错误';
      setFeedback(`分享失败：${detail}`);
    } finally {
      setIsSharing(false);
    }
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
                onClick={() => setShowShareDialog(true)}
                className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-white hover:text-stone-700 hover:shadow-sm"
                title="分享至飞书/企业微信"
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

      {showShareDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-stone-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
              <div>
                <h4 className="text-base font-semibold text-stone-900">分享会议纪要</h4>
                <p className="mt-1 text-xs text-stone-400">
                  配置 Webhook 后可直接推送到飞书或企业微信
                </p>
              </div>
              <button
                onClick={() => setShowShareDialog(false)}
                className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-50 hover:text-stone-600"
                title="关闭"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setShareChannel('feishu')}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    shareChannel === 'feishu'
                      ? 'bg-sky-500 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  飞书
                </button>
                <button
                  onClick={() => setShareChannel('wecom')}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    shareChannel === 'wecom'
                      ? 'bg-sky-500 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  企业微信
                </button>
              </div>

              <label className="block text-xs text-stone-500">
                Webhook URL
                <input
                  value={webhookUrls[shareChannel]}
                  onChange={(event) =>
                    setWebhookUrls((prev) => ({
                      ...prev,
                      [shareChannel]: event.target.value,
                    }))
                  }
                  placeholder={
                    shareChannel === 'feishu'
                      ? 'https://open.feishu.cn/open-apis/bot/v2/hook/...'
                      : 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?...'
                  }
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-700 focus:border-stone-400 focus:outline-none"
                />
              </label>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-stone-500">发送预览</span>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1 text-xs text-stone-500 transition-colors hover:bg-stone-50"
                  >
                    {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    复制预览
                  </button>
                </div>
                <textarea
                  readOnly
                  value={sharePreview}
                  className="h-64 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-xs leading-relaxed text-stone-700 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-stone-100 px-6 py-4">
              <button
                onClick={() => setShowShareDialog(false)}
                className="rounded-xl border border-stone-200 px-4 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-50"
              >
                取消
              </button>
              <button
                onClick={handleShare}
                disabled={isSharing || !enhancedNotes.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black disabled:opacity-40"
              >
                {isSharing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                发送
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
