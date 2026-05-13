export type LlmBackend = "cursor" | "openai"

/** Explicit override: LLM_PROVIDER=cursor|openai. Otherwise prefer Cursor when CURSOR_API_KEY is set. */
export function resolveLlmBackend(): LlmBackend | null {
  const explicit = process.env.LLM_PROVIDER?.trim().toLowerCase()
  if (explicit === "cursor" || explicit === "openai") {
    return explicit
  }
  if (process.env.CURSOR_API_KEY?.trim()) return "cursor"
  if (process.env.OPENAI_API_KEY?.trim()) return "openai"
  return null
}

export function describeCredentialHints(): { cursor: boolean; openai: boolean } {
  return {
    cursor: Boolean(process.env.CURSOR_API_KEY?.trim()),
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
  }
}
