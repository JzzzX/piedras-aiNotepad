# Zeabur 部署豆包 ASR 代理

本文用于把仓库里的 `scripts/asr-proxy.cjs` 部署到 Zeabur，作为 Piedras iOS / Web 共用的豆包实时语音识别代理。

## 目标架构

- `Vercel`：承载 Next.js API
- `Zeabur`：承载豆包 ASR WebSocket 代理

最终效果：

- API：`https://piedras-api.vercel.app`
- ASR Proxy：`https://<your-service>.zeabur.app`

## 前提

你需要准备：

- GitHub 仓库访问权限
- Zeabur 账号
- 豆包 ASR 凭证
  - `DOUBAO_ASR_APP_ID`
  - `DOUBAO_ASR_ACCESS_TOKEN`
  - `DOUBAO_ASR_RESOURCE_ID`
- 一段随机字符串作为
  - `ASR_PROXY_SESSION_SECRET`

## 仓库内已就绪的文件

- `scripts/asr-proxy.cjs`
- `Dockerfile.asr-proxy`

代理脚本已兼容平台注入的 `PORT` 变量，可直接部署到 Zeabur。

## Zeabur 控制台步骤

### 1. 创建项目

在 Zeabur 新建一个项目，例如：

- 项目名：`piedras`

### 2. 从 GitHub 添加服务

在项目内选择：

- `Add Service`
- `Git Repository`

选择你的 `ai_notepad` 仓库。

### 3. 指定 Dockerfile

这个仓库不是专门给 ASR 代理单独拆出来的，所以要明确告诉 Zeabur 使用哪一个 Dockerfile。

在该服务的环境变量里增加：

```bash
ZBPACK_DOCKERFILE_NAME=asr-proxy
```

Zeabur 会据此使用 `Dockerfile.asr-proxy` 部署。

### 4. 配置运行时环境变量

在 Zeabur 服务环境变量中填写：

```bash
ASR_PROXY_SESSION_SECRET=替换成你的随机长字符串
DOUBAO_ASR_APP_ID=你的豆包 App ID
DOUBAO_ASR_ACCESS_TOKEN=你的豆包 Access Token
DOUBAO_ASR_RESOURCE_ID=volc.seedasr.sauc.duration
```

可选：

```bash
DOUBAO_ASR_WS_URL=wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async
```

说明：

- `ASR_PROXY_PORT` 可以不填
- Zeabur 会注入 `PORT`
- 当前代理代码会优先监听 `PORT`

### 5. 部署

保存后触发部署。

如果部署成功，服务应提供：

- `GET /healthz`
- `WS /ws/asr?session_token=...`

### 6. 绑定公网域名

在 Zeabur 服务页面中：

- 打开 `Domains`
- 选择 `Generate Domain`

生成一个 `https://xxx.zeabur.app` 域名。

记下这个地址，例如：

```text
https://piedras-asr.zeabur.app
```

## 回写到 Vercel

Zeabur 域名拿到后，把它写回 Vercel：

```bash
vercel env update ASR_PROXY_PUBLIC_BASE_URL production --cwd /path/to/ai_notepad --value "https://你的-zeabur-域名"
vercel env update ASR_PROXY_PUBLIC_BASE_URL preview --cwd /path/to/ai_notepad --value "https://你的-zeabur-域名"
vercel env update ASR_PROXY_PUBLIC_BASE_URL development --cwd /path/to/ai_notepad --value "https://你的-zeabur-域名"
```

然后重新部署 Vercel：

```bash
vercel deploy --prod -y --cwd /path/to/ai_notepad
```

## 验证

### 1. 直接检查 Zeabur 代理

```bash
curl https://你的-zeabur-域名/healthz
```

期望返回：

```json
{
  "ok": true
}
```

### 2. 检查 Vercel ASR 状态

```bash
curl https://piedras-api.vercel.app/api/asr/status
```

期望字段：

```json
{
  "mode": "doubao",
  "ready": true
}
```

### 3. iOS 真机 / 模拟器验证

- 打开录音
- 看到实时 partial
- 停止后看到 final segments

## 常见问题

### `/api/asr/status` 还是 `reachable: false`

通常只看这几项：

- Zeabur 域名是否已生成
- `ASR_PROXY_PUBLIC_BASE_URL` 是否已写回 Vercel
- Vercel 是否已重新部署
- Zeabur 服务是否真的启动成功
- `curl https://你的-zeabur-域名/healthz` 是否返回 200

### Zeabur 没有走对 Dockerfile

确认服务环境变量里有：

```bash
ZBPACK_DOCKERFILE_NAME=asr-proxy
```

### 端口监听失败

当前代理代码已兼容：

```bash
PORT
ASR_PROXY_PORT
```

部署到 Zeabur 时优先使用平台注入的 `PORT`。
