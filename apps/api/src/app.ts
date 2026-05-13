import { Hono } from "hono"
import { cors } from "hono/cors"
import { handleChatComplete, handleChatStream } from "./chat"

export const app = new Hono()

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Accept"],
  }),
)

app.get("/health", (c) =>
  c.json({
    ok: true,
    llm: Boolean(process.env.OPENAI_API_KEY?.trim()),
  }),
)

app.post("/v1/chat/stream", handleChatStream)
app.post("/v1/chat", handleChatComplete)
