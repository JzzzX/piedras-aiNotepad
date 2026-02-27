import { TranscriptSegment, ChatMessage } from './types';

// 构建转写文本（带说话人标注）
function buildTranscriptText(
  segments: TranscriptSegment[],
  speakers: Record<string, string>
): string {
  return segments
    .filter((s) => s.isFinal)
    .map((s) => {
      const name = speakers[s.speaker] || s.speaker;
      return `[${name}]: ${s.text}`;
    })
    .join('\n');
}

// AI 融合笔记
export async function enhanceNotes(
  segments: TranscriptSegment[],
  userNotes: string,
  meetingTitle: string,
  speakers: Record<string, string>,
  templatePrompt?: string
): Promise<string> {
  const transcript = buildTranscriptText(segments, speakers);

  const res = await fetch('/api/enhance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript,
      userNotes,
      meetingTitle,
      templatePrompt,
    }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const errData = await res.json();
      detail = errData?.error || '';
    } catch {
      try {
        detail = await res.text();
      } catch {
        detail = '';
      }
    }
    throw new Error(detail ? `AI 笔记生成失败：${detail}` : 'AI 笔记生成失败');
  }

  const data = await res.json();
  return data.content;
}

// 会议 Chat
export async function chatWithMeeting(
  segments: TranscriptSegment[],
  userNotes: string,
  enhancedNotes: string,
  chatHistory: ChatMessage[],
  question: string,
  speakers: Record<string, string>,
  templatePrompt?: string
): Promise<ReadableStream<Uint8Array> | null> {
  const transcript = buildTranscriptText(segments, speakers);

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript,
      userNotes,
      enhancedNotes,
      chatHistory: chatHistory.slice(-10),
      question,
      templatePrompt,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail ? `Chat 请求失败：${detail}` : 'Chat 请求失败');
  }

  return res.body;
}
