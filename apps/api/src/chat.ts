import type { Context } from "hono"
import { generateText, streamText, type ModelMessage } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { z } from "zod"

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

function createModel() {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error("missing_openai_api_key")
  }
  const openai = createOpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL?.trim() || undefined,
  })
  const modelId = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini"
  return openai(modelId)
}

export async function handleChatStream(c: Context) {
  let parsed: z.infer<typeof BodySchema>
  try {
    parsed = BodySchema.parse(await c.req.json())
  } catch {
    return c.json({ error: "invalid_body", detail: "Expected { messages: [{ role, content }] }" }, 400)
  }

  let model
  try {
    model = createModel()
  } catch {
    return c.json({ error: "server_config", detail: "OPENAI_API_KEY is not set on the server" }, 503)
  }

  try {
    const coreMessages = buildMessages(parsed)
    const result = streamText({
      model,
      messages: coreMessages,
    })
    return result.toTextStreamResponse({
      headers: {
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    })
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

  let model
  try {
    model = createModel()
  } catch {
    return c.json({ error: "server_config", detail: "OPENAI_API_KEY is not set on the server" }, 503)
  }

  try {
    const coreMessages = buildMessages(parsed)
    const result = await generateText({
      model,
      messages: coreMessages,
    })
    return c.json({ reply: result.text })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "generate_failed"
    return c.json({ error: "upstream", detail: msg }, 502)
  }
}
