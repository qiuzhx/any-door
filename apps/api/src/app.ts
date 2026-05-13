import { Hono } from "hono"
import { cors } from "hono/cors"
import { handleChatComplete, handleChatStream } from "./chat"
import { describeCredentialHints, resolveLlmBackend } from "./llm/provider"

export const app = new Hono()

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Accept"],
  }),
)

app.get("/health", (c) => {
  const creds = describeCredentialHints()
  return c.json({
    ok: true,
    llm: Boolean(resolveLlmBackend()),
    backend: resolveLlmBackend(),
    credentials: creds,
  })
})

app.post("/v1/chat/stream", handleChatStream)
app.post("/v1/chat", handleChatComplete)
