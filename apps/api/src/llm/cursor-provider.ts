import path from "node:path"
import { fileURLToPath } from "node:url"
import { Agent } from "@cursor/sdk"
import type { ModelMessage } from "ai"
import { formatTranscriptForCursor } from "./transcript"

/** Working directory for **local** Cursor agents (needs real filesystem). Default: monorepo root `any-door/`. */
function cursorAgentCwd(): string {
  const fromEnv = process.env.CURSOR_AGENT_CWD?.trim()
  if (fromEnv) return path.resolve(fromEnv)
  const here = path.dirname(fileURLToPath(import.meta.url))
  // apps/api/src/llm -> ../../../.. is workspace root? llm is apps/api/src/llm -> .. -> apps/api/src -> .. -> apps/api -> .. -> repo root
  return path.resolve(here, "../../../..")
}

export async function streamCursor(messages: ModelMessage[], abortSignal?: AbortSignal): Promise<Response> {
  const apiKey = process.env.CURSOR_API_KEY!.trim()
  const modelId = process.env.CURSOR_MODEL?.trim() || "composer-2"
  const cwd = cursorAgentCwd()
  const prompt = formatTranscriptForCursor(messages)

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      let agent: Awaited<ReturnType<typeof Agent.create>> | undefined
      let abortedListener: (() => void) | undefined

      const safeEnqueue = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          /* closed */
        }
      }

      try {
        agent = await Agent.create({
          apiKey,
          model: { id: modelId },
          local: { cwd },
        })

        const run = await agent.send(prompt, {
          onDelta: ({ update }) => {
            if (update.type === "text-delta") {
              safeEnqueue(update.text)
            }
          },
        })

        abortedListener = () => {
          void run.cancel()
        }
        abortSignal?.addEventListener("abort", abortedListener)

        const finished = await run.wait()
        if (finished.status === "error") {
          safeEnqueue("\n[cursor: run ended with status error]")
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        safeEnqueue(`\n[cursor: ${msg}]`)
      } finally {
        if (abortedListener && abortSignal) {
          abortSignal.removeEventListener("abort", abortedListener)
        }
        if (agent) {
          await agent[Symbol.asyncDispose]().catch(() => {})
        }
        try {
          controller.close()
        } catch {
          /* already closed */
        }
      }
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "X-LLM-Provider": "cursor",
    },
  })
}

export async function generateCursorText(messages: ModelMessage[], abortSignal?: AbortSignal): Promise<string> {
  const apiKey = process.env.CURSOR_API_KEY!.trim()
  const modelId = process.env.CURSOR_MODEL?.trim() || "composer-2"
  const cwd = cursorAgentCwd()
  const prompt = formatTranscriptForCursor(messages)

  const agent = await Agent.create({
    apiKey,
    model: { id: modelId },
    local: { cwd },
  })

  try {
    const run = await agent.send(prompt)
    const kill = () => void run.cancel()
    abortSignal?.addEventListener("abort", kill)
    try {
      const result = await run.wait()
      if (result.status === "error") {
        throw new Error("Cursor run finished with error status")
      }
      return result.result ?? run.result ?? ""
    } finally {
      abortSignal?.removeEventListener("abort", kill)
    }
  } finally {
    await agent[Symbol.asyncDispose]().catch(() => {})
  }
}
