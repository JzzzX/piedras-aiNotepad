# Piedras

Piedras 是一个类 Granola 的 AI 会议记录 Demo，定位为“本地优先、中文优先、可扩展”的 Web 端会议助手。它不是单纯的转写器，而是把实时语音转写、手写笔记、AI 结构化总结、单会议问答、跨会议检索和轻量生态接入整合到同一个工作台里。

当前版本适合：

- 个人或小团队做会议记录 Demo / 原型验证
- 以中文会议为主，同时夹杂英文术语
- 希望以托管数据库快速上线一个可演示、可持续保存会议结果的版本
- 后续继续扩展 ASR、LLM、导出、Webhook、MCP 等能力

## 核心能力

### 1. 录音与转写

- 浏览器端录音，支持麦克风与系统音频双通道采集
- 双模式 ASR：
  - `browser`：基于 Web Speech API 的 Demo 模式
  - `aliyun`：基于阿里云实时语音识别 WebSocket 的生产模式
- 支持上传音频文件后直接转写
- 转写分段保存，支持：
  - 时间戳显示
  - 关键词搜索与跳转
  - 单段复制 / 删除
  - 说话人重命名
- 自动结束检测：
  - 长时间无新增转写可提示停止
  - 系统音频断开可提示停止

### 2. 笔记与 AI 增强

- 中间区域为可编辑笔记区，适合边听边记
- 会后可一键生成结构化纪要，统一输出：
  - 会议摘要
  - 关键讨论点
  - 决策事项
  - 行动项
- Prompt 参数可调：
  - 会议类型：通用 / 项目周会 / 需求评审 / 销售沟通 / 面试复盘
  - 输出风格：简洁 / 平衡 / 详细 / 行动导向
  - 是否强制输出行动项
- 若标题为空，会议结束后可自动生成会议标题

### 3. AI 助手

- 单会议 Chat：基于当前会议转写、用户笔记、增强纪要回答问题
- 跨会议 Chat：基于历史会议做全局问答
- 跨会议检索采用：
  - 关键词召回
  - 本地哈希向量近似语义召回
  - 来源引用
- Chat 输入支持浏览器语音口述
- LLM 接入策略：
  - 默认使用服务端配置的 Gemini
  - 前端可临时切换到 MiniMax 或 OpenAI-compatible，并保存在本地浏览器

### 4. 管理、导出与集成

- 历史会议列表支持：
  - 搜索
  - 日期范围过滤
  - 文件夹分组
  - 拖拽归档
- 模板系统：
  - 内置系统模板
  - 用户模板 CRUD
  - Chat 中 `/命令` 快速调用
- 导出与分享：
  - Markdown 导出
  - DOCX 导出
  - 飞书 / 企业微信 Webhook 推送
- MCP 只读连接器：
  - 对外暴露会议列表、会议详情、会议搜索
  - 可供 Claude Code 等支持 MCP 的 Agent 读取上下文
  - 前端提供“生态接入”说明面板

## Demo 边界与当前限制

- 当前是单用户、本地优先 Demo，不包含账号体系与多人协作
- 音频文件不落盘保存，重点保留转写与笔记结果
- 阿里云实时转写依赖网络与浏览器权限
- 系统音频采集依赖浏览器的屏幕共享 / 标签页音频能力，推荐使用最新版 Chrome / Edge
- 跨会议向量检索使用本地轻量向量方案，成本低但不等同于云端 embedding 质量
- MCP 当前为只读 Token 鉴权，不含 OAuth 完整接入流程

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 前端框架 | Next.js 16 + React 19 |
| 样式 | Tailwind CSS 4 |
| 编辑器 | Tiptap / ProseMirror |
| 状态管理 | Zustand |
| 数据库 | PostgreSQL + Prisma |
| 实时转写 | Browser Web Speech / 阿里云 ASR |
| LLM | Gemini（默认）+ MiniMax / OpenAI-compatible（可切换） |
| 导出 | `docx` |
| 外部上下文接口 | MCP TypeScript SDK |

## 项目结构

```text
app/
  api/
    asr/           ASR 会话与状态接口
    chat/          单会议 / 跨会议问答
    enhance/       AI 结构化纪要
    export/docx/   DOCX 导出
    folders/       文件夹管理
    mcp/           MCP 连接器
    meetings/      会议保存、读取、删除、自动标题
    share/webhook/ 飞书 / 企微推送
    templates/     模板管理
components/        录音、转写、笔记、Chat、模板、MCP 面板等 UI
lib/               ASR、LLM、MCP、导出、模板、检索、状态管理
prisma/            Prisma schema 与迁移
```

## 快速开始

### 1. 环境要求

- Node.js `18+`，建议 `20+`
- npm
- 推荐浏览器：最新版 Chrome / Edge

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

至少先填写：

- `DATABASE_URL`
- `GEMINI_API_KEY`
- `MCP_SERVER_TOKEN`

如果要启用阿里云实时转写，再补齐阿里云相关配置。

### 3. 安装依赖

```bash
npm install
```

### 4. 初始化数据库

```bash
npx prisma migrate deploy
```

### 5. 启动开发环境

```bash
npm run dev
```

默认访问：`http://localhost:3000`

说明：

- `npm run dev` 当前默认走 `next dev --webpack`，是为了避免 Turbopack 在本项目上的首次编译卡顿
- 如需自行对比，可使用 `npm run dev:turbo`

## 环境变量说明

### ASR

| 变量 | 说明 | 何时需要 |
| --- | --- | --- |
| `ASR_MODE` | `browser` 或 `aliyun` | 总是 |
| `ALICLOUD_ASR_APP_KEY` | 阿里云实时转写 AppKey | 使用阿里云 ASR 时 |
| `ALICLOUD_ASR_TOKEN` | 直接使用临时 Token | 阿里云直连 Token 模式 |
| `ALICLOUD_ACCESS_KEY_ID` | 阿里云 AK | 使用 AK/SK 自动换 Token 时 |
| `ALICLOUD_ACCESS_KEY_SECRET` | 阿里云 SK | 使用 AK/SK 自动换 Token 时 |

### 默认 LLM 路由

| 变量 | 说明 |
| --- | --- |
| `GEMINI_API_KEY` | 默认主通道 Gemini Key |
| `GEMINI_MODEL` | 默认 Gemini 模型，默认 `gemini-flash-latest` |
| `MINIMAX_API_KEY` | MiniMax 回退通道 Key |
| `MINIMAX_GROUP_ID` | MiniMax Group ID |
| `MINIMAX_MODEL` | MiniMax 模型名 |
| `MINIMAX_USE_STREAM` | MiniMax 是否优先走流式 |
| `LLM_PROVIDER` | 服务端优先 Provider 列表 |
| `LLM_FALLBACKS` | 回退 Provider 列表 |
| `LLM_TIMEOUT_MS` | 超时时间 |
| `LLM_RETRIES` | 重试次数 |

说明：

- 默认推荐只配置 Gemini
- MiniMax 可以作为服务端回退链路
- OpenAI-compatible 更偏前端临时接入场景，用户可直接在页面里填写本地 Key / Base URL / Model

### 分享与生态接入

| 变量 | 说明 |
| --- | --- |
| `FEISHU_WEBHOOK_URL` | 飞书 Webhook 默认地址，可为空 |
| `WECOM_WEBHOOK_URL` | 企业微信 Webhook 默认地址，可为空 |
| `MCP_SERVER_TOKEN` | MCP Bearer Token |

### 数据库

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | 托管 PostgreSQL 连接串，推荐用于 Vercel + Prisma Postgres / Neon |

## 典型使用流程

### 1. 录制会议

1. 打开页面
2. 选择直接开始录音，或上传已有音频
3. 如需采集系统音频，使用浏览器共享标签页/窗口并勾选音频
4. 转写内容会实时进入左侧面板

### 2. 边听边写

1. 在中间笔记区补充要点
2. 如果说话人识别名称不准确，可在说话人管理区重命名
3. 录音结束后，系统会自动保存会议

### 3. 生成纪要

1. 选择会议类型、输出风格、行动项策略
2. 点击生成 AI 结构化笔记
3. 结果会进入“灵感与笔记”下方区域

### 4. 发起问答

- 当前会议模式：提取本会议结论、待办、分歧、复盘信息
- 全局模式：跨历史会议查找某个主题、决策、风险点

### 5. 整理与输出

- 将会议拖入文件夹
- 用模板命令提升结构化问答效率
- 导出 Markdown / DOCX
- 或推送到飞书 / 企业微信 Webhook

## API 概览

| 路径 | 方法 | 说明 |
| --- | --- | --- |
| `/api/asr/status` | `GET` | 返回当前 ASR 模式与配置状态 |
| `/api/asr/session` | `POST` | 创建阿里云 ASR 会话 |
| `/api/meetings` | `GET` | 查询会议列表 |
| `/api/meetings` | `POST` | 创建 / 保存会议 |
| `/api/meetings/[id]` | `GET` | 获取单会议详情 |
| `/api/meetings/[id]` | `PUT` | 更新会议 |
| `/api/meetings/[id]` | `DELETE` | 删除会议 |
| `/api/meetings/title` | `POST` | 自动生成会议标题 |
| `/api/enhance` | `POST` | 生成结构化纪要 |
| `/api/chat` | `POST` | 单会议问答 |
| `/api/chat/global` | `POST` | 跨会议问答 |
| `/api/templates` | `GET` / `POST` | 模板列表 / 创建模板 |
| `/api/templates/[id]` | `PUT` / `DELETE` | 更新 / 删除模板 |
| `/api/folders` | `GET` / `POST` | 文件夹列表 / 创建文件夹 |
| `/api/folders/[id]` | `PUT` / `DELETE` | 更新 / 删除文件夹 |
| `/api/export/docx` | `POST` | 导出 DOCX |
| `/api/share/webhook` | `POST` | 推送到飞书 / 企业微信 |
| `/api/mcp` | `GET` / `POST` / `DELETE` | MCP 只读连接器入口 |

## 数据模型

核心 Prisma 模型如下：

| 模型 | 用途 |
| --- | --- |
| `Meeting` | 会议主体，保存标题、状态、时长、笔记、增强纪要、说话人映射、文件夹归属 |
| `TranscriptSegment` | 转写分段，保存说话人、文本、时间戳、顺序 |
| `ChatMessage` | 单会议聊天消息 |
| `Folder` | 会议分组 |
| `PromptTemplate` | 系统模板与用户模板 |

当前默认数据库为托管 PostgreSQL，通过 `DATABASE_URL` 连接。

## 部署到 Vercel

推荐组合：

- Hosting: Vercel
- Database: Prisma Postgres 或 Neon Postgres

原因：

- 当前项目使用 Next.js App Router + Prisma，和 Vercel 的 Node Runtime 配合最直接
- 相比继续保留本地 SQLite，上线后会议、模板、文件夹数据能真正持久化
- 相比 Turso，这个仓库当前更适合直接走标准 Prisma Postgres 工作流，迁移和排错都更直观

### 1. 准备数据库

在 Vercel 或外部数据库平台创建一个 PostgreSQL 实例，然后拿到 `DATABASE_URL`。

### 2. 配置 Vercel 环境变量

至少配置：

- `DATABASE_URL`
- `GEMINI_API_KEY`
- `MCP_SERVER_TOKEN`
- 如需阿里云转写，再补 `ALICLOUD_*`

### 3. 首次执行数据库迁移

本地执行：

```bash
npx prisma migrate deploy
```

### 4. 部署

```bash
npx vercel --prod
```

仓库已包含 [vercel.json](/Users/jguinsoo/Desktop/ai_notepad/vercel.json)，会在 Vercel 构建时先执行 `prisma generate` 再执行 `next build`。

### 5. 部署后手动回归

- 新建会议并保存
- 上传音频并转写
- 生成 AI 纪要
- 历史会议列表与文件夹 CRUD
- MCP 面板与 `/api/mcp`

## MCP 连接器

项目提供一个只读 MCP 端点：`/api/mcp`

鉴权：

```http
Authorization: Bearer <MCP_SERVER_TOKEN>
```

当前暴露的资源：

- `piedras://meetings/list`
- `piedras://meetings/{id}`
- `piedras://search/meetings`
- `piedras://search/meetings/{query}/{dateFrom}/{dateTo}/{folderId}/{limit}`

说明：

- 空参数使用 `_` 占位
- 示例：

```text
piedras://search/meetings/预算/2026-02-01/2026-02-28/_/10
```

前端顶部已提供“生态接入”面板，用于展示接入地址、资源 URI 和示例配置。

## 开发说明

### 质量门槛

```bash
npm run lint
npm run build
```

当前仓库未接入正式测试框架，`lint + build + 手动回归` 是最基本质量门槛。

### 建议手动回归清单

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

## 当前适合继续扩展的方向

- 将本地哈希向量检索升级为可切换向量后端
- 将阿里云 ASR 从浏览器直连改为服务端中转
- 补充自动化测试与回归脚本
- 演进为多用户、多工作区或云端同步版本
