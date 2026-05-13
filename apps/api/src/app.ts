import { Hono } from "hono"
import { cors } from "hono/cors"
import { streamSSE } from "hono/streaming"

export const app = new Hono()

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
)

app.get("/health", (c) => c.json({ ok: true }))

/** Placeholder SSE — swap body for real LLM stream later. */
app.post("/v1/chat/stream", (c) =>
  streamSSE(c, async (stream) => {
    const chunks = ["流", "式", "占", "位", " ", "（", "替", "换", "为", "模", "型", "）"]
    for (const piece of chunks) {
      await stream.writeSSE({
        id: String(Date.now()),
        event: "message",
        data: piece,
      })
      await new Promise((r) => setTimeout(r, 60))
    }
    await stream.writeSSE({
      event: "done",
      data: "",
    })
  }),
)
