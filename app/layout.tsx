import type { Metadata } from "next";
import { VT323, Space_Mono } from 'next/font/google';
import "./globals.css";

const vt323 = VT323({ weight: '400', subsets: ['latin'], variable: '--font-vt323' });
const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
});

export const metadata: Metadata = {
  title: "Piedras - 智能会议记录",
  description: "Piedras 是一个本地优先、中文优先的 AI 会议记录 Demo，支持实时转写、AI 结构化纪要、会议问答与轻量生态接入。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${vt323.variable} ${spaceMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
