# any-door

面向微信小程序的 **AI 对话（流式 + Markdown）**；服务端 **Hono**，模型调用 **Vercel AI SDK**（OpenAI 兼容协议），可部署 **Vercel**。

## 功能概览

| 模块 | 能力 |
|------|------|
| **apps/api** | `POST /v1/chat/stream`：AI SDK `streamText` → **纯文本分块流**（`toTextStreamResponse`）；`POST /v1/chat`：非流式整段回复；`GET /health`：含 `llm` 是否已配置密钥 |
| **apps/mini-program** | 多轮会话、**停止生成**、**清空**；微信小程序 **`enableChunked` + `onChunkReceived`** 流式拼接；**H5** 用 `fetch` 读流；回复结束后 **Markdown → HTML（marked）→ `RichText`**（带简单 XSS 过滤） |

## 仓库结构

| 路径 | 说明 |
|------|------|
| [apps/api](apps/api) | Hono API；本地 `pnpm dev:api`（默认 `8787`） |
| [apps/mini-program](apps/mini-program) | Taro 4 + Vite + Tailwind |
| [packages/shared](packages/shared) | `ChatMessageDTO`、路径拼接工具 |

工程管理：**pnpm workspaces** + **Turborepo**（根目录锁定 **`turbo@2.9.6`** 以对齐 `@turbo/*` 原生包）。构建小程序时 **`weapp-tailwindcss` 建议使用 Node `^20.19` 或 `>=22.12`**。

## 本地运行

### 1. 配置 API 密钥

在 `apps/api` 下复制环境变量模板并填写：

```bash
cp apps/api/.env.example apps/api/.env
# 编辑 apps/api/.env，填写 OPENAI_API_KEY（必填）
```

支持 **`OPENAI_BASE_URL`** 指向任意 **OpenAI 兼容** 网关（如中转、Azure OpenAI 的兼容入口等）；**`OPENAI_MODEL`** 默认 `gpt-4o-mini`。

### 2. 配置小程序 API 地址

编辑 `apps/mini-program/.env.development` 中的 **`TARO_APP_API`**（例如本地 `http://127.0.0.1:8787`）。上线前改为 **HTTPS** 的线上 API 根地址。

### 3. 启动

```bash
pnpm install
pnpm dev:api     # http://127.0.0.1:8787
pnpm dev:mini    # 微信开发者工具「导入」apps/mini-program/dist
pnpm build
```

**微信小程序调试**：若请求本机 IP，请在开发者工具中关闭「校验合法域名、TLS 版本」（详情 → 本地设置）。

## Vercel 部署（api）

1. **Root Directory**：`apps/api`。  
2. **Install Command**：`cd ../.. && pnpm install`。  
3. **Build Command**：可留空，或使用 `cd ../.. && pnpm exec turbo run build --filter=@any-door/api`。  
4. **Environment Variables**：在 Vercel 控制台配置 `OPENAI_API_KEY`，按需配置 `OPENAI_BASE_URL`、`OPENAI_MODEL`、`CHAT_SYSTEM_PROMPT`。  

小程序正式发布前，须在公众平台把你部署得到的 **`https://你的域名`** 配入「服务器域名 → request 合法域名」。

## 文档

- [技术决策](docs/tech-decisions.md)
- [产品与 Monorepo](docs/product-monorepo.md)
