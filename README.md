# Piedras

Piedras 是一个类 Granola 的 AI 会议记录 Web Demo，聚焦中文会议场景，提供从录音转写、边听边记、AI 结构化总结，到单会议问答、跨会议检索、导出分享和轻量生态接入的一体化工作台。

它的定位不是“单纯语音转文字”，而是一个适合演示、验证和继续扩展的会议工作流原型：

- 本地交互优先，浏览器内完成录音、编辑和问答
- 服务端负责会议持久化、ASR 会话签发、LLM 路由、导出和 MCP 接入
- 适合单用户或小团队用于产品原型、内部演示和功能迭代

## 线上演示

- Public Demo: `https://piedras.vercel.app`
- Vercel Project: `piedras`
- 当前线上环境：Vercel + Prisma Postgres + OpenAI-compatible LLM / Gemini + 阿里云 ASR

## iOS 云端接入

Piedras iOS 现阶段按固定云后端产品化：

- `Next.js API` 部署到 Vercel
- `Doubao ASR Proxy` 部署到 Zeabur、Fly.io 或其他常驻 Node Runtime
- iOS 默认连接固定 API Base URL，不再依赖本地 `localhost`

推荐分离部署：

- API: `https://piedras-api.vercel.app`
- ASR Proxy: `https://<your-asr-proxy>.zeabur.app`

推荐优先使用 Zeabur：

- 无需把 WebSocket 代理塞进 Vercel Functions
- 支持直接使用仓库中的 `Dockerfile.asr-proxy`
- 适合作为豆包 ASR 的常驻代理服务
- 代理脚本现已兼容平台注入的 `$PORT` 变量，更适合 Zeabur / 其他 PaaS

对应环境变量：

```bash
ASR_MODE=doubao
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://aihubmix.com/v1
OPENAI_MODEL=gpt-4o-mini
OPENAI_PATH=/chat/completions

DOUBAO_ASR_APP_ID=...
DOUBAO_ASR_ACCESS_TOKEN=...
DOUBAO_ASR_RESOURCE_ID=volc.seedasr.sauc.duration
ASR_PROXY_SESSION_SECRET=...
ASR_PROXY_PUBLIC_BASE_URL=https://piedras-asr.fly.dev
```

仓库内已提供：

- `Dockerfile.asr-proxy`
- `fly.asr.toml`

用于把 `scripts/asr-proxy.cjs` 直接部署成常驻 WebSocket 服务。

如果你计划使用 Zeabur，可参考：

- [docs/zeabur-asr-proxy.md](./docs/zeabur-asr-proxy.md)

## 产品概览

当前 UI 采用三栏工作台：

- 左栏 `实时转写`：录音、上传音频、转写查看、搜索、复制、删除、说话人管理
- 中栏 `灵感与笔记`：边听边写的编辑区，以及会后生成的结构化会议纪要
- 右栏 `AI 助手`：当前会议问答 / 跨会议问答、模板调用、筛选和生态接入

顶部提供会议记录抽屉、生态接入面板、标题编辑、录音入口、上传音频入口、录音说明与录音设置。

## 核心能力

### 1. 录音与转写

- 浏览器端录音，支持麦克风与系统音频双通道采集
- 支持两种 ASR 模式：
  - `browser`：浏览器 Web Speech Demo 模式
  - `aliyun`：阿里云实时语音识别 WebSocket 模式
- 支持上传音频文件后直接转写
- 支持转写分段：
  - 相对时间戳展示
  - 关键词搜索与跳转
  - 单段复制 / 删除
  - 说话人重命名
- 支持自动结束检测：
  - 长时间无新增转写时提示停止
  - 系统音频断开时提示停止

### 2. 笔记与结构化纪要

- 中栏使用 Tiptap 编辑器承载自由笔记
- 支持根据会议转写 + 用户笔记生成结构化纪要
- 默认输出章节包括：
  - 会议摘要
  - 关键讨论点
  - 决策事项
  - 行动项
  - 待确认事项
- 可调 Prompt 参数：
  - 会议类型：`通用 / 项目周会 / 需求评审 / 销售沟通 / 面试复盘`
  - 输出风格：`简洁 / 平衡 / 详细 / 行动导向`
  - 是否强制输出行动项
- 标题为空时，支持自动生成会议标题

### 3. AI 助手

- `当前` 模式：围绕当前会议转写、用户笔记和 AI 纪要回答问题
- `全局` 模式：跨历史会议做检索和问答
- 全局问答使用轻量混合检索：
  - 关键词召回
  - 本地哈希向量近似语义召回
  - 来源会议引用
- Chat 输入框支持浏览器语音口述
- 支持模板系统：
  - 系统模板 + 用户模板
  - `/命令` 快速调用
  - 模板管理 CRUD

### 4. 管理、导出与分享

- 会议历史支持：
  - 搜索
  - 日期过滤
  - 文件夹分组
  - 拖拽归档
- 支持导出：
  - Markdown
  - DOCX
- 支持通过 Webhook 分享到：
  - 飞书
  - 企业微信

### 5. 生态接入

- 提供只读 MCP 连接器 `/api/mcp`
- 可供 Claude Code 等支持 MCP 的 Agent 拉取：
  - 会议列表
  - 会议详情
  - 会议搜索结果
- 前端提供“生态接入”面板用于展示接入方式和资源 URI

## 技术架构

### 前端

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Tiptap / ProseMirror
- Zustand
- Lucide 图标

### 后端与集成

- Next.js Route Handlers (`app/api/*`)
- Prisma ORM
- PostgreSQL
- OpenAI-compatible LLM（支持 AiHubMix、自建网关等）
- Gemini / MiniMax（可选接入）
- 阿里云实时 ASR
- MCP TypeScript SDK
- `docx` 文档导出

### 数据流简述

1. 浏览器录音或上传音频
2. 客户端将音频流发送到阿里云 ASR 或走浏览器识别
3. 转写结果进入左栏并持久化到数据库
4. 用户在中栏记录笔记
5. 服务端基于转写 + 笔记生成结构化纪要
6. 右栏 AI 助手基于当前会议或历史会议回答问题
7. 最终结果可导出、分享或通过 MCP 暴露给外部 Agent

## 项目结构

```text
app/
  api/
    asr/             ASR 状态与会话签发
    chat/            当前会议 / 全局问答
    enhance/         AI 结构化纪要
    export/docx/     DOCX 导出
    folders/         文件夹管理
    mcp/             MCP 连接器
    meetings/        会议 CRUD / 自动标题
    share/webhook/   飞书 / 企微分享
    templates/       模板管理
  favicon.ico
  globals.css
  icon.svg
  layout.tsx
  page.tsx
components/
  AudioRecorder.tsx
  TranscriptPanel.tsx
  NoteEditor.tsx
  ChatPanel.tsx
  EnhancedNotes.tsx
  MeetingHistory.tsx
  PromptSettings.tsx
  TemplateManager.tsx
  AiRuntimeSettings.tsx
  McpConnectorPanel.tsx
lib/
  asr.ts
  llm.ts
  llm-provider.ts
  global-chat.ts
  meeting-export.ts
  mcp-server.ts
  store.ts
  db.ts
  template-service.ts
  types.ts
prisma/
  schema.prisma
  migrations/
```

## 本地开发

### 环境要求

- Node.js `18+`，建议 `20+`
- npm
- PostgreSQL 数据库连接串
- 推荐浏览器：Chrome / Edge 最新版

### 安装依赖

```bash
npm install
```

### 配置环境变量

```bash
cp .env.example .env.local
```

最少需要配置：

- `DATABASE_URL`
- `GEMINI_API_KEY`
- `MCP_SERVER_TOKEN`

如果启用阿里云实时转写，还需要：

- `ASR_MODE=aliyun`
- `ALICLOUD_ACCESS_KEY_ID`
- `ALICLOUD_ACCESS_KEY_SECRET`
- `ALICLOUD_ASR_APP_KEY`

### 初始化数据库

```bash
npx prisma migrate deploy
```

### 启动开发环境

```bash
npm run dev
```

默认访问：`http://localhost:3000`

补充说明：

- `npm run dev` 当前默认走 `next dev --webpack`
- 原因是本项目在 Turbopack 下首次编译首页时曾出现明显卡顿
- 如需自行对比，可使用：

```bash
npm run dev:turbo
```

### 常用命令

```bash
npm run dev
npm run build
npm run start
npm run lint
npx prisma migrate deploy
npx prisma generate
```

## 环境变量说明

### 数据库

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 连接串 |

### ASR

| 变量 | 说明 |
| --- | --- |
| `ASR_MODE` | `browser` 或 `aliyun` |
| `ALICLOUD_ACCESS_KEY_ID` | 阿里云 AK |
| `ALICLOUD_ACCESS_KEY_SECRET` | 阿里云 SK |
| `ALICLOUD_ASR_APP_KEY` | 阿里云实时语音识别 AppKey |
| `ALICLOUD_ASR_TOKEN` | 可选，直接提供临时 Token |

### LLM

| 变量 | 说明 |
| --- | --- |
| `GEMINI_API_KEY` | 默认主通道 Gemini API Key（Google AI Studio） |
| `GEMINI_MODEL` | 默认 Gemini API 模型名 |
| `OPENAI_API_KEY` | OpenAI-compatible / 聚合网关 API Key |
| `OPENAI_MODEL` | OpenAI-compatible 模型名 |
| `OPENAI_BASE_URL` | OpenAI-compatible Base URL |
| `OPENAI_PATH` | OpenAI-compatible 请求路径，默认 `/chat/completions` |
| `MINIMAX_API_KEY` | MiniMax Key |
| `MINIMAX_GROUP_ID` | MiniMax Group ID |
| `MINIMAX_MODEL` | MiniMax 模型名 |
| `MINIMAX_USE_STREAM` | MiniMax 是否优先走流式 |
| `LLM_PROVIDER` | 服务端优先 Provider 列表 |
| `LLM_FALLBACKS` | 服务端回退 Provider 列表 |
| `LLM_TIMEOUT_MS` | 超时时间 |
| `LLM_RETRIES` | 重试次数 |

说明：

- 默认建议至少配置一条可用的 OpenAI-compatible 或 Gemini 通道
- AiHubMix 可直接使用 `https://aihubmix.com/v1` + `/chat/completions`
- 前端运行时支持临时切到自己的 OpenAI-compatible / MiniMax 凭证，本地保存在浏览器中
- 如果不配置可用 LLM，AI 纪要与问答会退回 Demo 内容

### 分享与生态接入

| 变量 | 说明 |
| --- | --- |
| `FEISHU_WEBHOOK_URL` | 飞书 Webhook 默认地址，可为空 |
| `WECOM_WEBHOOK_URL` | 企业微信 Webhook 默认地址，可为空 |
| `MCP_SERVER_TOKEN` | MCP Bearer Token |

## 典型使用流程

### 1. 记录会议

1. 打开页面
2. 直接开始录音，或上传已有音频
3. 如需系统音频，使用浏览器共享标签页/窗口并勾选音频
4. 转写结果会进入左栏实时显示

### 2. 边听边写

1. 在中栏补充背景、判断和重点
2. 根据需要调整说话人名称
3. 停止录音后，会议会保存到数据库

### 3. 生成 AI 纪要

1. 调整 `AI 输出设置`
2. 触发 AI 生成结构化纪要
3. 在中栏查看、复制或导出结果

### 4. 发起问答

- `当前`：聚焦本次会议的结论、行动项、争议点
- `全局`：跨会议检索历史决策、风险点和上下文

### 5. 整理与输出

- 用文件夹组织会议
- 用模板命令提升固定场景问答效率
- 导出 Markdown / DOCX
- 分享到飞书 / 企业微信 Webhook
- 通过 MCP 暴露给外部 Agent

## API 概览

| 路径 | 方法 | 说明 |
| --- | --- | --- |
| `/api/asr/status` | `GET` | 返回 ASR 模式与可用状态 |
| `/api/asr/session` | `POST` | 创建阿里云 ASR 会话 |
| `/api/meetings` | `GET` / `POST` | 查询会议列表 / 创建或保存会议 |
| `/api/meetings/[id]` | `GET` / `PUT` / `DELETE` | 读取 / 更新 / 删除会议 |
| `/api/meetings/title` | `POST` | 生成会议标题 |
| `/api/enhance` | `POST` | 生成结构化纪要 |
| `/api/chat` | `POST` | 当前会议问答 |
| `/api/chat/global` | `POST` | 全局问答 |
| `/api/templates` | `GET` / `POST` | 模板列表 / 创建模板 |
| `/api/templates/[id]` | `PUT` / `DELETE` | 更新 / 删除模板 |
| `/api/folders` | `GET` / `POST` | 文件夹列表 / 创建文件夹 |
| `/api/folders/[id]` | `PUT` / `DELETE` | 更新 / 删除文件夹 |
| `/api/export/docx` | `POST` | 导出 DOCX |
| `/api/share/webhook` | `POST` | Webhook 分享 |
| `/api/mcp` | `GET` / `POST` / `DELETE` | MCP 连接器入口 |

## 数据模型

核心 Prisma 模型：

| 模型 | 用途 |
| --- | --- |
| `Meeting` | 会议主体，保存标题、状态、时长、笔记、AI 纪要、说话人映射、文件夹归属 |
| `TranscriptSegment` | 转写分段，保存说话人、文本、时间戳、顺序 |
| `ChatMessage` | 当前会议聊天消息 |
| `Folder` | 会议分组 |
| `PromptTemplate` | 系统模板与用户模板 |

## 部署到 Vercel

当前仓库已按 `Vercel + PostgreSQL + Prisma` 的模式整理完成。

### 推荐组合

- Hosting: Vercel
- Database: Prisma Postgres / Neon / 其他标准 PostgreSQL

### 最少部署步骤

1. 在 Vercel 创建项目并连接仓库
2. 配置环境变量：
   - `DATABASE_URL`
   - `GEMINI_API_KEY`
   - `MCP_SERVER_TOKEN`
   - 可选 `ALICLOUD_*`
3. 执行数据库迁移：

```bash
npx prisma migrate deploy
```

4. 部署：

```bash
npx vercel --prod
```

仓库已包含 `vercel.json`，构建阶段会先执行 `prisma generate` 再执行 `next build`。

### 本地复用 Vercel 环境

```bash
npx vercel env pull .env.local --environment=development
npm run dev
```

## MCP 连接器

Piedras 提供一个只读 MCP 端点：

- Endpoint: `/api/mcp`
- Auth: `Authorization: Bearer <MCP_SERVER_TOKEN>`

当前暴露资源：

- `piedras://meetings/list`
- `piedras://meetings/{id}`
- `piedras://search/meetings`
- `piedras://search/meetings/{query}/{dateFrom}/{dateTo}/{folderId}/{limit}`

说明：

- 空参数用 `_` 占位
- 示例：

```text
piedras://search/meetings/预算/2026-02-01/2026-02-28/_/10
```

## Review 结论

本轮通读代码与配置后，没有发现阻止当前 Demo 继续演示的结构性问题。

当前更现实的风险点主要有三类：

1. 自动化测试缺失
   - 目前质量门槛仍然以 `lint + build + 手动回归` 为主
   - UI 细节、移动端布局和浏览器权限流仍然高度依赖手测
2. 外部依赖波动
   - 阿里云 ASR、Gemini API、Webhook、MCP 都依赖外部服务与密钥配置
   - 一旦额度、网络或 Token 失效，功能会降级或回退到 Demo 模式
3. 单用户 Demo 架构
   - 当前没有账号体系、协作权限、云端音频资产管理和任务队列
   - 更适合演示与原型验证，不适合作为正式团队产品直接投入生产

## 建议手动回归清单

每次重要变更后，至少验证以下流程：

- 麦克风录音
- 系统音频共享
- 上传音频转写
- 转写搜索 / 复制 / 删除
- AI 纪要生成
- 当前会议 Chat / 全局 Chat
- 模板创建与 `/命令` 调用
- 文件夹创建与拖拽归档
- Markdown / DOCX 导出
- Webhook 分享
- MCP 生态接入面板与 `/api/mcp`

## 安全与配置说明

- 不要提交 `.env`、`.env.local`、数据库连接串或任何第三方密钥
- 如果密钥曾在聊天、日志或截图里暴露，应该立即旋转
- 生产环境建议把 `preview / production / development` 的环境变量分别管理并定期校验

## 下一步适合继续扩展的方向

- 为高频交互补充自动化测试与回归脚本
- 将轻量本地向量检索升级为可切换向量后端
- 为 ASR 增加更稳定的服务端中转与重试策略
- 演进为多用户、多工作区或团队协作版本
