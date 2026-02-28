# AI Notepad - 智能会议笔记助手

类 Granola 的 AI 会议记录工具，面向中国市场。核心理念：**人机协作式笔记** —— 不是纯粹的转写工具，而是将用户手写要点与 AI 转写融合，生成结构化会议纪要。

## 核心特性

- **实时语音转写** - 浏览器录音 + 阿里云 ASR，支持中文/中英夹杂
- **说话人分离** - 区分不同说话人，标注"谁说了什么"
- **手写笔记 + AI 融合** - 边听边记要点，会后 AI 融合转写与笔记生成结构化纪要
- **会议 Chat** - 基于会议内容的 AI 问答，提取行动项、总结等
- **跨会议 Chat** - 支持跨历史会议提问，按标题/时间筛选；当前 Demo 使用本地向量后端 + 关键词混合召回，并附来源引用
- **模版系统** - 本土化 Recipes（销售复盘、用户访谈、站会、1on1 等），Chat 中 "/" 调用，支持自定义模板持久化与排序
- **Prompt 参数化** - 按会议类型、输出风格、行动项开关控制 AI 输出
- **导出与分享** - 统一结构导出 Markdown/Docx，预留飞书/企业微信 webhook 推送

## 技术栈

| 模块 | 技术选型 |
|------|---------|
| 前端 | Next.js 16 + React 19 + Tailwind CSS |
| 编辑器 | Tiptap (ProseMirror) |
| 状态管理 | Zustand |
| ASR | 阿里云智能语音交互（实时转写） |
| LLM | Gemini（默认）+ MiniMax（回退） |
| 存储 | SQLite (本地) |

## 快速开始

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入你的 API 密钥

# 启动开发服务器
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)

## 环境变量

参见 `.env.example`，关键配置：

- `ASR_MODE` - `browser`（默认 Demo）或 `aliyun`（启用阿里云实时转写）
- `ALICLOUD_ACCESS_KEY_ID` / `ALICLOUD_ACCESS_KEY_SECRET` / `ALICLOUD_ASR_APP_KEY` - 阿里云语音服务
- `ALICLOUD_ASR_TOKEN` - 可选，临时 Token 直连模式（演示联调更快，需同时配置 `ALICLOUD_ASR_APP_KEY`）
- `GEMINI_API_KEY` / `GEMINI_MODEL` - Gemini 大模型（默认主通道）
- `MINIMAX_API_KEY` / `MINIMAX_GROUP_ID` / `MINIMAX_MODEL` - MiniMax 大模型（回退通道）
- `MINIMAX_USE_STREAM` - MiniMax 流式 SSE 开关（默认 `true`，异常时自动降级非流式）
- `LLM_PROVIDER` / `LLM_FALLBACKS` / `LLM_TIMEOUT_MS` / `LLM_RETRIES` - LLM 路由与稳定性参数
- `FEISHU_WEBHOOK_URL` / `WECOM_WEBHOOK_URL` - 分享推送地址（阶段4预留，可为空）
- `MCP_SERVER_TOKEN` - MCP 连接器 Bearer Token；启用后可供外部 AI 工具只读检索会议数据
- 有 API Key 时，LLM 调用失败会直接返回可定位错误，不再回退 Demo 内容

## 后续改进记录

- 跨会议检索当前固定本地向量后端（Demo 优先低成本与稳定性）。
- 后续可升级为“可切换向量后端”（本地向量 / 云端 Embedding），用于质量对比、故障降级与生产化扩展。

## MCP 连接器

已提供一个只读 MCP HTTP 端点：`/api/mcp`

- 鉴权方式：`Authorization: Bearer <MCP_SERVER_TOKEN>`
- 资源：
  - `ai-notepad://meetings/list`
  - `ai-notepad://meetings/{id}`
  - `ai-notepad://search/meetings`（搜索说明）
  - `ai-notepad://search/meetings/预算/2026-02-01/2026-02-28/_/10`（搜索结果）
- 返回内容：JSON 资源，包含会议列表、单会议详情（转写/笔记/聊天记录）和按关键词/日期/文件夹过滤的搜索结果

适合后续接入 Claude Desktop 或其他支持 MCP 的客户端。当前实现为无状态、只读、Token 鉴权，优先满足 Demo 接入和本地数据安全。

## 与 Granola 的差异化

| 维度 | Granola | 本项目 |
|------|---------|--------|
| 说话人分离 | 桌面端不支持 | Day 1 核心能力 |
| 中文支持 | 有限 | 中文优先 + 中英夹杂 |
| 模版 | 通用场景 | 本土化（销售复盘、访谈等） |
| 数据存储 | 美国 AWS | 本地 SQLite，数据不出境 |
| 教练模式 | 无 | 分析沟通表现，给出改进建议 |
