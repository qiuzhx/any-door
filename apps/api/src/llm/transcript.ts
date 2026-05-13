import type { ModelMessage } from "ai"

export function messagePlainText(m: ModelMessage): string {
  switch (m.role) {
    case "system":
      return m.content
    case "user": {
      const c = m.content
      return typeof c === "string" ? c : c.map((p) => (p.type === "text" ? p.text : "")).join("")
    }
    case "assistant": {
      const c = m.content
      return typeof c === "string" ? c : c.map((p) => (p.type === "text" ? p.text : "")).join("")
    }
    case "tool":
      return JSON.stringify(m.content)
    default: {
      const _never: never = m
      return JSON.stringify(_never)
    }
  }
}

export function formatTranscriptForCursor(messages: ModelMessage[]): string {
  const lines = messages.map((m) => `### ${m.role}\n${messagePlainText(m)}`)
  return [
    "You are answering inside an HTTP chat API. The sections below are the full conversation (system / user / assistant). Respond to the latest user intent; use Markdown when helpful.",
    "",
    ...lines,
  ].join("\n")
}
