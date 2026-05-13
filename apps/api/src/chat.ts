import type { Context } from "hono"
import type { ModelMessage } from "ai"
import { z } from "zod"
import { generateOpenAIText, streamOpenAI } from "./llm/openai-provider"
import { generateCursorText, streamCursor } from "./llm/cursor-provider"
import { describeCredentialHints, resolveLlmBackend } from "./llm/provider"

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(100_000),
})

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(80),
})

function defaultSystemPrompt(): string {
  return (
    process.env.CHAT_SYSTEM_PROMPT?.trim() ||
    "You are a concise, helpful assistant. Use GitHub-flavored Markdown when it improves readability (headings, lists, bold, `inline code`, fenced code blocks)."
  )
}

function buildMessages(body: z.infer<typeof BodySchema>): ModelMessage[] {
  const hasSystem = body.messages.some((m) => m.role === "system")
  if (hasSystem) {
    return body.messages as ModelMessage[]
  }
  const sys: ModelMessage = { role: "system", content: defaultSystemPrompt() }
  return [sys, ...(body.messages as ModelMessage[])]
}

function requireBackend(c: Context) {
  const backend = resolveLlmBackend()
  if (!backend) {
    return c.json(
      { error: "server_config", detail: "Set CURSOR_API_KEY and/or OPENAI_API_KEY (optional LLM_PROVIDER=cursor|openai)" },
      503,
    )
  }
  if (backend === "cursor" && !process.env.CURSOR_API_KEY?.trim()) {
    return c.json({ error: "server_config", detail: "LLM_PROVIDER=cursor (or auto) requires CURSOR_API_KEY" }, 503)
  }
  if (backend === "openai" && !process.env.OPENAI_API_KEY?.trim()) {
    return c.json({ error: "server_config", detail: "LLM_PROVIDER=openai (or auto) requires OPENAI_API_KEY" }, 503)
  }
  return backend
}

export async function handleChatStream(c: Context) {
  let parsed: z.infer<typeof BodySchema>
  try {
    parsed = BodySchema.parse(await c.req.json())
  } catch {
    return c.json({ error: "invalid_body", detail: "Expected { messages: [{ role, content }] }" }, 400)
  }

  const backend = requireBackend(c)
  if (backend instanceof Response) return backend

  const coreMessages = buildMessages(parsed)
  const signal = c.req.raw.signal

  try {
    if (backend === "cursor") {
      return await streamCursor(coreMessages, signal)
    }
    return streamOpenAI(coreMessages, signal)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "stream_failed"
    return c.json({ error: "upstream", detail: msg }, 502)
  }
}

export async function handleChatComplete(c: Context) {
  let parsed: z.infer<typeof BodySchema>
  try {
    parsed = BodySchema.parse(await c.req.json())
  } catch {
    return c.json({ error: "invalid_body", detail: "Expected { messages: [{ role, content }] }" }, 400)
  }

  const backend = requireBackend(c)
  if (backend instanceof Response) return backend

  const coreMessages = buildMessages(parsed)
  const signal = c.req.raw.signal

  try {
    const text =
      backend === "cursor" ? await generateCursorText(coreMessages, signal) : await generateOpenAIText(coreMessages, signal)
    return c.json({ reply: text })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "generate_failed"
    return c.json({ error: "upstream", detail: msg }, 502)
  }
}
