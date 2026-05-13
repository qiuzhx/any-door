/** Shared API paths / chat types */

export const API_VERSION_PREFIX = "/v1"

export type ChatRole = "user" | "assistant" | "system"

/** Payload aligned with POST /v1/chat & /v1/chat/stream */
export interface ChatMessageDTO {
  role: ChatRole
  content: string
}

export function chatStreamPath(): string {
  return `${API_VERSION_PREFIX}/chat/stream`
}

export function chatCompletePath(): string {
  return `${API_VERSION_PREFIX}/chat`
}

/** Join absolute URL for Taro.request / fetch */
export function joinApiUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "")
  const p = path.startsWith("/") ? path : `/${path}`
  return `${b}${p}`
}
