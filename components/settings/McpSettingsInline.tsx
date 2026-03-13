'use client';

import { useMemo, useState } from 'react';
import {
  Braces,
  Check,
  Copy,
  Database,
  Server,
  Shield,
} from 'lucide-react';
import type { ReactNode } from 'react';

function InfoCard({
  icon, title, description, value, onCopy, copied,
}: {
  icon: ReactNode; title: string; description: string;
  value: string; onCopy?: () => void; copied?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-[#E3D9CE] bg-[#FCFAF8] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3ECE4] text-[#6C5A4C]">
            {icon}
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-[#4A3C31]">{title}</h4>
            <p className="text-xs leading-5 text-[#8C7A6B]">{description}</p>
          </div>
        </div>
        {onCopy && (
          <button
            onClick={onCopy}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#D8CEC4] bg-[#F7F3EE] px-2.5 py-1.5 text-[11px] font-medium text-[#5C4D42] hover:bg-[#EFE9E2]"
          >
            {copied ? <Check size={12} className="text-[#6D8A67]" /> : <Copy size={12} />}
            {copied ? '已复制' : '复制'}
          </button>
        )}
      </div>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-[#F5EFE8] px-3 py-2.5 text-xs leading-5 text-[#4A3C31]">
        <code>{value}</code>
      </pre>
    </section>
  );
}

export default function McpSettingsInline() {
  const [copiedKey, setCopiedKey] = useState('');

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const endpoint = useMemo(() => baseUrl ? `${baseUrl}/api/mcp` : '/api/mcp', [baseUrl]);

  const configSnippet = useMemo(
    () => JSON.stringify({
      mcpServers: {
        Piedras: {
          url: endpoint,
          headers: { Authorization: 'Bearer <MCP_SERVER_TOKEN>' },
        },
      },
    }, null, 2),
    [endpoint]
  );

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((c) => (c === key ? '' : c)), 1400);
    } catch (e) {
      console.error('复制失败:', e);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs leading-5 text-[#8C7A6B]">
        这是对外只读的 MCP 接口，优先面向 Claude Code 这类支持 MCP 的 Agent，也方便后续接入 OpenClaw 一类生态工具。
      </p>

      <InfoCard
        icon={<Server size={16} />}
        title="接入地址"
        description="支持 MCP 的 Agent 或生态工具连接到这个 HTTP 端点后，即可读取会议数据。"
        value={endpoint}
        onCopy={() => handleCopy('endpoint', endpoint)}
        copied={copiedKey === 'endpoint'}
      />

      <InfoCard
        icon={<Shield size={16} />}
        title="鉴权方式"
        description="服务端使用 Bearer Token 鉴权。Token 只在服务端配置，不会展示在网页里。"
        value="Authorization: Bearer <MCP_SERVER_TOKEN>"
        onCopy={() => handleCopy('auth', 'Authorization: Bearer <MCP_SERVER_TOKEN>')}
        copied={copiedKey === 'auth'}
      />

      <InfoCard
        icon={<Database size={16} />}
        title="可读取资源"
        description="当前开放了会议列表、单会议详情，以及搜索帮助与搜索结果模板。"
        value={[
          'piedras://meetings/list',
          'piedras://meetings/{id}',
          'piedras://search/meetings',
          'piedras://search/meetings/{query}/{dateFrom}/{dateTo}/{folderId}/{limit}',
        ].join('\n')}
        onCopy={() => handleCopy('resources', [
          'piedras://meetings/list',
          'piedras://meetings/{id}',
          'piedras://search/meetings',
          'piedras://search/meetings/{query}/{dateFrom}/{dateTo}/{folderId}/{limit}',
        ].join('\n'))}
        copied={copiedKey === 'resources'}
      />

      <InfoCard
        icon={<Braces size={16} />}
        title="配置示例"
        description="不同 Agent/客户端字段名可能略有差异，但核心信息就是 url + Authorization 头。"
        value={configSnippet}
        onCopy={() => handleCopy('config', configSnippet)}
        copied={copiedKey === 'config'}
      />

      <div className="rounded-2xl border border-dashed border-[#D8CEC4] bg-[#FCFAF8] px-4 py-3 text-xs leading-5 text-[#8C7A6B]">
        搜索模板里，空值请使用 `_` 占位。例如：
        <div className="mt-2 rounded-xl bg-[#F5EFE8] px-3 py-2 text-[#4A3C31]">
          piedras://search/meetings/预算/2026-02-01/2026-02-28/_/10
        </div>
      </div>
    </div>
  );
}
