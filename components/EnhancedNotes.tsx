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
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-none border-2 border-[#111] bg-[#F4F0E6] shadow-[4px_4px_0px_#111]">
            <Sparkles size={20} className="text-[#D9423E]" />
          </div>
        )}
        {embedded && (
          <>
            <p className="font-[family-name:var(--font-vt323)] text-[18px] font-semibold text-[#111]">AI 总结</p>
            <p className="max-w-[360px] text-[13px] leading-6 text-[#8A8578]">
              录音结束后，可以把转写和用户笔记融合成结构化总结。
            </p>
          </>
        )}
        <button
          onClick={triggerGenerate}
          disabled={!canGenerate}
          className="flex items-center gap-2 rounded-none border-2 border-[#111] bg-[#D9423E] px-6 py-3 text-[15px] font-semibold text-white shadow-[4px_4px_0px_#111] transition-all hover:brightness-110 active:scale-95 active:shadow-none disabled:opacity-40 disabled:shadow-none"
        >
          <Sparkles size={16} />
          AI 生成结构化笔记
        </button>
        {!canGenerate && (
          <p className="text-xs text-[#8A8578] font-medium">录音结束后可生成 AI 笔记</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {isEnhancing ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
          <div className="w-72 rounded-none border-2 border-[#111] bg-[#F4F0E6] shadow-[4px_4px_0px_#111]">
            <div className="retro-title-bar flex items-center gap-2 border-b-2 border-[#111] bg-gradient-to-r from-[#111] to-[#555] px-3 py-1.5">
              <span className="font-[family-name:var(--font-vt323)] text-[13px] font-bold text-white">处理中...</span>
            </div>
            <div className="p-4">
              <p className="font-[family-name:var(--font-vt323)] text-[14px] font-semibold text-[#111]">AI 正在融合转写与笔记...</p>
              <p className="font-[family-name:var(--font-vt323)] text-[12px] text-[#8A8578] mt-1">
                将你的要点与转写内容结合，生成结构化纪要
              </p>
              <div className="mt-3 h-4 w-full rounded-none border-2 border-[#111] bg-white overflow-hidden">
                <div className="retro-checkerboard-progress h-full" style={{ width: '60%' }} />
              </div>
              <div className="mt-2 text-center">
                <span className="retro-blink font-[family-name:var(--font-vt323)] text-[#111]">█</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b-2 border-[#111] px-5 py-4 sm:px-6">
            <div>
              <h4 className="font-[family-name:var(--font-vt323)] flex items-center gap-1.5 text-[15px] font-semibold text-[#111]">
                <Sparkles size={16} className="text-[#D9423E]" />
                AI 会议纪要
              </h4>
              {embedded && (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#8A8578]">
                  <span>结构化总结会基于转写和用户笔记共同生成。</span>
                  <span className="rounded-none border-2 border-[#111] bg-[#F4F0E6] px-2.5 py-1 text-[11px] text-[#8A8578]">
                    {recipeName}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                className="rounded-none p-1.5 text-[#8A8578] transition-colors hover:border hover:border-[#111] hover:bg-[#F4F0E6] hover:text-[#111]"
                title="复制"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
              <button
                onClick={handleExportMarkdown}
                className="rounded-none p-1.5 text-[#8A8578] transition-colors hover:border hover:border-[#111] hover:bg-[#F4F0E6] hover:text-[#111]"
                title="导出 Markdown"
              >
                <FileDown size={14} />
              </button>
              <button
                onClick={handleExportDocx}
                disabled={isExportingDocx}
                className="rounded-none p-1.5 text-[#8A8578] transition-colors hover:border hover:border-[#111] hover:bg-[#F4F0E6] hover:text-[#111] disabled:opacity-40"
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
                className="rounded-none p-1.5 text-[#8A8578] transition-colors hover:border hover:border-[#111] hover:bg-[#F4F0E6] hover:text-[#111]"
                title="分享至飞书/企业微信"
              >
                <Share2 size={14} />
              </button>
              <button
                onClick={triggerGenerate}
                className="rounded-none p-1.5 text-[#8A8578] transition-colors hover:border hover:border-[#111] hover:bg-[#F4F0E6] hover:text-[#111]"
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
                    className="rounded-none border-2 border-[#111] bg-[#F4F0E6] p-6 shadow-[4px_4px_0px_#111]"
                  >
                    <h5 className="font-[family-name:var(--font-vt323)] text-[18px] font-semibold text-[#111]">
                      {section.title}
                    </h5>
                    <div className="mt-4 space-y-3">
                      {section.lines.map((line, index) => {
                        const trimmed = line.trim();
                        if (!trimmed) {
                          return <div key={`${section.title}-${index}`} className="h-1" />;
                        }

                        if (/^[-*+]\s+/.test(trimmed) || /^\d+[\.)\、]\s+/.test(trimmed)) {
                          return (
                            <div
                              key={`${section.title}-${index}`}
                              className="flex items-start gap-3 text-[15px] leading-7 text-[#111]"
                            >
                              <span className="mt-[10px] w-1.5 h-1.5 bg-[#111] rounded-none" />
                              <span>
                                {trimmed
                                  .replace(/^[-*+]\s+/, '')
                                  .replace(/^\d+[\.)\、]\s+/, '')}
                              </span>
                            </div>
                          );
                        }

                        return (
                          <p
                            key={`${section.title}-${index}`}
                            className="text-[15px] leading-7 text-[#111]"
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
              <div className="rounded-none border-2 border-[#111] bg-[#F4F0E6] p-6 shadow-[4px_4px_0px_#111]">
                <p className="text-[15px] leading-7 text-[#111]">
                  暂时无法结构化解析当前内容，请重新生成，或复制后在外部查看原始 Markdown。
                </p>
              </div>
            )}

            {feedback && (
              <p className="mt-4 text-[12px] font-medium text-[#8A8578]">{feedback}</p>
            )}
          </div>
        </>
      )}

      {showShareDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="w-full max-w-2xl rounded-none border-2 border-[#111] bg-[#F4F0E6] shadow-[4px_4px_0px_#111]">
            <div className="retro-title-bar flex items-center justify-between border-b-2 border-[#111] bg-gradient-to-r from-[#111] to-[#555] px-6 py-3">
              <div>
                <h4 className="font-[family-name:var(--font-vt323)] text-base font-semibold text-white">分享会议纪要</h4>
                <p className="mt-1 font-[family-name:var(--font-vt323)] text-xs text-white/70">
                  配置 Webhook 后可直接推送到飞书或企业微信
                </p>
              </div>
              <button
                onClick={() => setShowShareDialog(false)}
                className="rounded-none border-2 border-white/40 p-1.5 text-white transition-colors hover:bg-white/20"
                title="关闭"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setShareChannel('feishu')}
                  className={`rounded-none border-2 border-[#111] px-4 py-2 font-[family-name:var(--font-vt323)] text-sm font-medium transition-colors ${
                    shareChannel === 'feishu'
                      ? 'bg-[#111] text-white'
                      : 'bg-[#F4F0E6] text-[#111] hover:bg-[#e8e4da]'
                  }`}
                >
                  飞书
                </button>
                <button
                  onClick={() => setShareChannel('wecom')}
                  className={`rounded-none border-2 border-[#111] px-4 py-2 font-[family-name:var(--font-vt323)] text-sm font-medium transition-colors ${
                    shareChannel === 'wecom'
                      ? 'bg-[#111] text-white'
                      : 'bg-[#F4F0E6] text-[#111] hover:bg-[#e8e4da]'
                  }`}
                >
                  企业微信
                </button>
              </div>

              <label className="block font-[family-name:var(--font-vt323)] text-xs text-[#8A8578]">
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
                  className="mt-1 w-full rounded-none border-2 border-[#111] bg-white px-3 py-2 font-[family-name:var(--font-vt323)] text-sm text-[#111] focus:outline-none focus:shadow-[2px_2px_0px_#111]"
                />
              </label>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-[family-name:var(--font-vt323)] text-xs text-[#8A8578]">发送预览</span>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 rounded-none border-2 border-[#111] px-2.5 py-1 font-[family-name:var(--font-vt323)] text-xs text-[#111] transition-colors hover:bg-[#111] hover:text-white"
                  >
                    {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    复制预览
                  </button>
                </div>
                <textarea
                  readOnly
                  value={sharePreview}
                  className="h-64 w-full rounded-none border-2 border-[#111] bg-white px-3 py-3 font-[family-name:var(--font-vt323)] text-xs leading-relaxed text-[#111] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t-2 border-[#111] px-6 py-4">
              <button
                onClick={() => setShowShareDialog(false)}
                className="rounded-none border-2 border-[#111] px-4 py-2 font-[family-name:var(--font-vt323)] text-sm text-[#111] transition-colors hover:bg-[#111] hover:text-white"
              >
                取消
              </button>
              <button
                onClick={handleShare}
                disabled={isSharing || !enhancedNotes.trim()}
                className="inline-flex items-center gap-2 rounded-none border-2 border-[#111] bg-[#111] px-4 py-2 font-[family-name:var(--font-vt323)] text-sm font-semibold text-white shadow-[4px_4px_0px_#555] transition-colors hover:bg-black disabled:opacity-40"
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
