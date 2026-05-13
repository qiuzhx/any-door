# any-door

面向微信小程序的 AI 对话（首期：流式 + Markdown），服务端计划部署于 Vercel（Hono）。

## 仓库结构

| 路径 | 说明 |
|------|------|
| [apps/api](apps/api) | Hono API（本地 `pnpm dev:api`，Vercel 将 Root Directory 指向此处） |
| [apps/mini-program](apps/mini-program) | Taro 4 + Vite + Tailwind（微信小程序） |
| [packages/shared](packages/shared) | 共享常量 / 契约占位 |

工程管理：**pnpm workspaces** + **Turborepo**。根目录将 **`turbo` 锁定为 `2.9.6`**，以便与本机的 `@turbo/darwin-*`、`@turbo/linux-*` 等原生包版本一致（避免出现「找不到平台 turbo 二进制」）。构建微信小程序时 **`weapp-tailwindcss` 建议使用 Node `^20.19` 或 `>=22.12`**。

## 常用命令（仓库根目录）

```bash
pnpm install
pnpm dev:api    # http://127.0.0.1:8787 — GET /health、POST /v1/chat/stream（SSE 占位）
pnpm dev:mini   # 微信小程序 watch；用微信开发者工具打开 apps/mini-program/dist
pnpm build      # turbo 串联各包 build
```

## Vercel 部署（api）

1. 新建项目，**Root Directory** 设为 `apps/api`。  
2. **Install Command**：`cd ../.. && pnpm install`（或 Monorepo 推荐写法按 Vercel 文档微调）。  
3. **Build Command**：可按需留空或用 `cd ../.. && pnpm exec turbo run build --filter=@any-door/api`。  
4. 环境变量：后续接入模型时再配置。

## 文档

- [技术决策](docs/tech-decisions.md)
- [产品与 Monorepo](docs/product-monorepo.md)
