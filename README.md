# any-door

面向微信小程序的 **AI 对话（流式 + Markdown）**；服务端 **Hono**。模型侧 **同时兼容**：

- **Cursor TypeScript SDK（`@cursor/sdk`）**：本地 Agent（需工作区目录）；
- **Vercel AI SDK（`ai` + `@ai-sdk/openai`）**：OpenAI 兼容 HTTP，适合 **Vercel / Serverless**。

## 安全提示

**永远不要把 `CURSOR_API_KEY`、`OPENAI_API_KEY` 发到聊天、Issue 或提交进 Git。** 只写入本机或托管平台的 Secret / 环境变量。若密钥曾以明文泄露，请立刻在 Cursor / OpenAI 控制台**作废并轮换**。

## 功能概览

| 模块 | 能力 |
|------|------|
| **apps/api** | `POST /v1/chat/stream`：**同一套分块文本流**（`Content-Type: text/plain`）；根据配置走 **Cursor**（`onDelta` `text-delta`）或 **OpenAI**（`streamText`）；`POST /v1/chat` 非流式；`GET /health` 返回 `backend`、`credentials` |
| **apps/mini-program** | 多轮会话、停止 / 清空；微信小程序 chunked 流式；H5 `fetch` 流式；完成后 Markdown → `RichText` |

## 后端如何选择（`LLM_PROVIDER`）

| 环境变量 | 含义 |
|----------|------|
| 不设 `LLM_PROVIDER` | 若配置了 **`CURSOR_API_KEY`** → 使用 **Cursor**；否则若配置了 **`OPENAI_API_KEY`** → 使用 **OpenAI** |
| `LLM_PROVIDER=cursor` | 强制 Cursor（仍需 **`CURSOR_API_KEY`**） |
| `LLM_PROVIDER=openai` | 强制 OpenAI 兼容路径（仍需 **`OPENAI_API_KEY`**） |

Cursor 路径会把本轮请求的完整 `messages` **折叠成一段 transcript**，再以一次 `agent.send()` 发给 Cursor Agent（HTTP 无状态，与 IDE 里多轮持久会话不同）。

## Cursor 本地工作目录

- 默认 **`CURSOR_AGENT_CWD`** 未设置时，使用 **monorepo 根目录**（与 `any-door` 仓库对齐）。
- 若在 Docker / CI / Serverless 里没有这份仓库文件树，需要自行设置 **`CURSOR_AGENT_CWD`** 指向「可被 Cursor 本地运行时访问」的路径。
- **`@cursor/sdk` 依赖本地运行时（含原生模块）**：在 **Vercel Serverless** 上不一定能构建或运行成功；**生产环境优先 `LLM_PROVIDER=openai`**，Cursor 更适合跑在你自己的 Node 主机或本地开发机。

## 仓库结构

| 路径 | 说明 |
|------|------|
| [apps/api](apps/api) | Hono API；`pnpm dev:api`（默认 `8787`） |
| [apps/mini-program](apps/mini-program) | Taro 4 + Vite + Tailwind |
| [packages/shared](packages/shared) | `ChatMessageDTO`、路径拼接 |

工程管理：**pnpm workspaces** + **Turborepo**（根目录锁定 **`turbo@2.9.6`**）。构建小程序建议 Node **`^20.19` 或 `>=22.12`**（weapp-tailwindcss）。

## 本地运行

### 1. 配置 `apps/api/.env`

```bash
cp apps/api/.env.example apps/api/.env
```

至少配置 **其一**：

- **Cursor**：`CURSOR_API_KEY`，按需 `CURSOR_AGENT_CWD`、`CURSOR_MODEL`
- **OpenAI 兼容**：`OPENAI_API_KEY`，按需 `OPENAI_BASE_URL`、`OPENAI_MODEL`

可同时配置两套 Key，通过 **`LLM_PROVIDER`** 或默认优先级切换。

### 2. 小程序 `TARO_APP_API`

编辑 `apps/mini-program/.env.development`（例：`http://127.0.0.1:8787`）。上线改为 **HTTPS** 并配置微信公众平台 **request 合法域名**。

### 3. 启动

```bash
pnpm install
pnpm dev:api
pnpm dev:mini
pnpm build
```

微信开发者工具调试本地 IP：详情 → 本地设置 → 关闭「校验合法域名」。

## Vercel 部署（api）

1. **Root Directory**：`apps/api`。  
2. **Install**：`cd ../.. && pnpm install`。  
3. **Build**：可留空或 `turbo run build --filter=@any-door/api`。  
4. **环境变量**：推荐 **`LLM_PROVIDER=openai`** + `OPENAI_*`。若坚持 Cursor，需自行验证 `@cursor/sdk` 是否能在该平台上构建与运行（常有原生依赖限制）。  

## 文档

- [技术决策](docs/tech-decisions.md)
- [产品与 Monorepo](docs/product-monorepo.md)
