# any-door 技术决策说明

本文记录截至目前在技术选型上的结论与暂缓事项，便于团队对齐与后续回溯。**不涉及具体实现代码。**

---

## 1. 项目与仓库

| 项 | 决策 |
|----|------|
| 仓库名 | **`any-door`** |
| 命名寓意 | 「哆啦 A 梦 · 任意门」意象：通向多样化能力与外部集成 |

---

## 2. 托管与运行时边界

| 层 | 决策 |
|----|------|
| API / 服务端 | 计划在 **`apps/api`**（或等价命名的服务端应用目录）内交付，并部署至 **Vercel**。 |
| 小程序端 | **不由 Vercel 承载**。构建、预览与上架遵循微信开放平台 / Taro 工作流。 |

服务端运行时：**TypeScript**；HTTP 框架：**Hono**。

### Vercel + Hono 集成原则

- 采用适用于 Serverless 的 **Vercel 适配入口**，由平台挂载路由执行函数。
- **不在平台侧维持常驻 `listen` 进程**；与传统单机部署的长生命周期服务器心智区分对待。
- **默认优先考虑 Node.js Runtime**，以降低常用 npm 依赖与流式响应的兼容性成本；若后续确有边缘场景需求，再单独评估 Edge Runtime 与依赖白名单。

---

## 3. 首期不包含的范围（暂缓）

以下能力 **不在首期交付的技术必选清单内**，避免过早拉高复杂度：

- **LangGraph / LangChain 编排**（复杂 Agent、状态机等）
- **RAG**（检索增强）
- **向量数据库 / pgvector 等嵌入检索链路**

可在产品与路线图中单列为二期及以上。

---

## 4. Monorepo 底座

| 项 | 决策 |
|----|------|
| 包管理 / Workspace | **pnpm workspaces** |
| 任务编排与缓存 | **Turborepo** |

典型根目录工件包含：**根级 `package.json`、`pnpm-workspace.yaml`、`turbo.json`**。具体应用与子包的拆分见 [`product-monorepo.md`](./product-monorepo.md)。

---

## 5. 模型接入（Cursor SDK + Vercel AI SDK 并存）

服务端 **`POST /v1/chat/stream` / `/v1/chat`** 支持两套后端，对外均为 **`text/plain` 分块文本流**（小程序侧解析方式不变）：

| 后端 | 典型用途 |
|------|-----------|
| **Vercel AI SDK**（`ai` + `@ai-sdk/openai`） | OpenAI 兼容网关；**Vercel Serverless** 友好 |
| **Cursor SDK**（`@cursor/sdk`） | Cursor Agent **本地**运行时（`local` + 工作目录）；HTTP 无状态下将 `messages` **折叠为 transcript** 单次 `send` |

环境与 **`LLM_PROVIDER`** 详见仓库根 **[README](../README.md)**。**注意**：`@cursor/sdk` 携带本地运行时与原生依赖，**不一定能在 Vercel Serverless 上可靠构建或运行**；线上默认推荐 OpenAI 路径。

---

## 6. 架构心法：与 Java DDD 的关系

- **默认形态**：**单体部署优先**，在仓库内通过目录与模块做清晰分层即可。
- **DDD**：可取之处在于 **限界上下文、通用语言、基础设施外置**（模型网关、日志等视作适配层）；无需在早期照搬大型企业常见的全套战术模型（如大而全的聚合、仓储泛滥）。
- **微服务**：对外仅需 Chat API 时，**不必为首期拆分多个运行时服务**；后续若有独立扩缩容或多团队边界再演进。

---

## 文档维护

若变更托管形态、模型后端组合或纳入 LangGraph/RAG，请在本文件追加 **修订日期 + 变更摘要**，保持单一事实来源。
