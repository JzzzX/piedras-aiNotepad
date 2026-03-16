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
import { buildUnifiedMeetingMarkdown, parseEnhancedNotesSections } from '@/lib/meeting-export';

type ShareChannel = 'feishu' | 'wecom';
const SHARE_STORAGE_KEY = 'ai-notepad-webhook-config-v1';

export default function EnhancedNotes({
  embedded = false,
  onGenerate,
  recipeName = 'Auto',
}: {
  embedded?: boolean;
  onGenerate?: () => void;
  recipeName?: string;
}) {
  const {
    meetingTitle,
    meetingDate,
    enhancedNotes,
    isEnhancing,
    status,
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
  const sections = useMemo(() => parseEnhancedNotesSections(enhancedNotes || ''), [enhancedNotes]);

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

  const canGenerate = status === 'ended';
  const triggerGenerate = () => {
    onGenerate?.();
  };

  if (!enhancedNotes && !isEnhancing) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-8 text-center">
        {embedded && (
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-[20px] border border-sky-100/60 bg-sky-50 shadow-sm">
            <Sparkles size={20} className="text-sky-500" />
          </div>
        )}
        {embedded && (
          <>
            <p className="font-song text-[18px] font-semibold text-stone-700">AI 总结</p>
            <p className="max-w-[360px] text-[13px] leading-6 text-stone-400">
              录音结束后，可以把转写和用户笔记融合成结构化总结。
            </p>
          </>
        )}
        <button
          onClick={triggerGenerate}
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
    <div className="flex h-full flex-col">
      {isEnhancing ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
          <Loader2 size={24} className="animate-spin text-sky-400 mb-3" />
          <p className="text-[14px] font-semibold text-stone-600">AI 正在融合转写与笔记...</p>
          <p className="text-[12px] text-stone-400 mt-1">
            将你的要点与转写内容结合，生成结构化纪要
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-black/[0.04] px-5 py-4 sm:px-6">
            <div>
              <h4 className="font-song flex items-center gap-1.5 text-[15px] font-semibold text-stone-800">
                <Sparkles size={16} className="text-sky-500" />
                AI 会议纪要
              </h4>
              {embedded && (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-400">
                  <span>结构化总结会基于转写和用户笔记共同生成。</span>
                  <span className="rounded-full bg-[#F5EEE6] px-2.5 py-1 text-[11px] text-[#8C7A6B]">
                    {recipeName}
                  </span>
                </div>
              )}
            </div>
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
                onClick={triggerGenerate}
                className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-white hover:text-stone-700 hover:shadow-sm"
                title="重新生成"
              >
                <Sparkles size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
            {sections.length > 0 ? (
              <div className="space-y-4">
                {sections.map((section) => (
                  <section
                    key={section.title}
                    className="rounded-[24px] border border-black/[0.04] bg-white p-6 shadow-sm"
                  >
                    <h5 className="font-song text-[18px] font-semibold text-stone-800">
                      {section.title}
                    </h5>
                    <div className="mt-4 space-y-3">
                      {section.lines.map((line, index) => {
                        const trimmed = line.trim();
                        if (!trimmed) {
                          return <div key={`${section.title}-${index}`} className="h-1" />;
                        }

                        if (/^[-*+]\s+/.test(trimmed) || /^\d+[\.\)、]\s+/.test(trimmed)) {
                          return (
                            <div
                              key={`${section.title}-${index}`}
                              className="flex items-start gap-3 text-[15px] leading-7 text-stone-700"
                            >
                              <span className="mt-[10px] h-1.5 w-1.5 rounded-full bg-[#B79E84]" />
                              <span>
                                {trimmed
                                  .replace(/^[-*+]\s+/, '')
                                  .replace(/^\d+[\.\)、]\s+/, '')}
                              </span>
                            </div>
                          );
                        }

                        return (
                          <p
                            key={`${section.title}-${index}`}
                            className="text-[15px] leading-7 text-stone-700"
                          >
                            {trimmed}
                          </p>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-black/[0.04] bg-white p-6 shadow-sm">
                <p className="text-[15px] leading-7 text-stone-700">
                  暂时无法结构化解析当前内容，请重新生成，或复制后在外部查看原始 Markdown。
                </p>
              </div>
            )}

            {feedback && (
              <p className="mt-4 text-[12px] font-medium text-stone-500">{feedback}</p>
            )}
          </div>
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
