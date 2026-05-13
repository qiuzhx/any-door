import { createOpenAI } from "@ai-sdk/openai"
import { generateText, streamText, type ModelMessage } from "ai"

export function createOpenAIModel() {
  const apiKey = process.env.OPENAI_API_KEY!.trim()
  const openai = createOpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL?.trim() || undefined,
  })
  const modelId = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini"
  return openai(modelId)
}

export function streamOpenAI(messages: ModelMessage[], abortSignal?: AbortSignal) {
  const model = createOpenAIModel()
  const result = streamText({
    model,
    messages,
    abortSignal,
  })
  return result.toTextStreamResponse({
    headers: {
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "X-LLM-Provider": "openai",
    },
  })
}

export async function generateOpenAIText(messages: ModelMessage[], abortSignal?: AbortSignal) {
  const model = createOpenAIModel()
  const result = await generateText({
    model,
    messages,
    abortSignal,
  })
  return result.text
}
