import Taro from "@tarojs/taro"
import type { ChatMessageDTO } from "@any-door/shared"

export interface StreamHandlers {
  onDelta: (fullText: string) => void
  onDone: () => void
  onError: (message: string) => void
}

export interface StreamHandle {
  abort: () => void
}

function parseHttpErrorPayload(data: unknown): string | undefined {
  if (typeof data !== "string" || !data.trim()) return undefined
  try {
    const j = JSON.parse(data) as { detail?: string; error?: string }
    if (j.detail) return j.detail
    if (j.error) return j.error
  } catch {
    /* ignore */
  }
  return undefined
}

/** WeChat 小程序：分块接收 UTF-8 文本流（服务端需 chunked / AI SDK text stream）。 */
export function streamChatWeapp(url: string, messages: ChatMessageDTO[], handlers: StreamHandlers): StreamHandle {
  const decoder = new TextDecoder("utf-8", { fatal: false, ignoreBOM: true })
  let accumulated = ""

  const task = Taro.request({
    url,
    method: "POST",
    header: {
      "Content-Type": "application/json",
      Accept: "text/plain",
    },
    data: { messages },
    enableChunked: true,
    timeout: 180_000,
    fail(err) {
      handlers.onError(err.errMsg ?? "网络请求失败")
    },
    success(res) {
      if (res.statusCode >= 400) {
        const fromBody =
          typeof res.data === "string" ? parseHttpErrorPayload(res.data) : undefined
        handlers.onError(fromBody ?? `请求失败 HTTP ${res.statusCode}`)
        return
      }
      const tail = decoder.decode()
      if (tail) {
        accumulated += tail
        handlers.onDelta(accumulated)
      }
      handlers.onDone()
    },
  })

  task.onChunkReceived((res) => {
    const chunk = decoder.decode(res.data as ArrayBuffer, { stream: true })
    accumulated += chunk
    handlers.onDelta(accumulated)
  })

  return {
    abort() {
      task.abort()
    },
  }
}

/** H5：fetch ReadableStream */
export async function streamChatH5(
  url: string,
  messages: ChatMessageDTO[],
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/plain",
    },
    body: JSON.stringify({ messages }),
    signal,
  })

  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const j = (await res.json()) as { detail?: string; error?: string }
      if (j.detail) detail = j.detail
      else if (j.error) detail = j.error
    } catch {
      /* ignore */
    }
    handlers.onError(detail)
    return
  }

  if (!res.body) {
    handlers.onError("响应无正文")
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let accumulated = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        accumulated += decoder.decode(value, { stream: true })
        handlers.onDelta(accumulated)
      }
    }
    accumulated += decoder.decode()
    handlers.onDelta(accumulated)
    handlers.onDone()
  } catch (e) {
    if ((e as Error).name === "AbortError") return
    handlers.onError((e as Error).message ?? "读取流失败")
  }
}

export function startChatStream(
  url: string,
  messages: ChatMessageDTO[],
  handlers: StreamHandlers,
): StreamHandle {
  if (process.env.TARO_ENV === "h5") {
    const controller = new AbortController()
    streamChatH5(url, messages, handlers, controller.signal).catch((e: Error) => {
      if (e.name === "AbortError") return
      handlers.onError(e.message ?? "请求失败")
    })
    return { abort: () => controller.abort() }
  }

  return streamChatWeapp(url, messages, handlers)
}
