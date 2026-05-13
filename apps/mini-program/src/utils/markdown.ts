import { marked } from "marked"

marked.setOptions({
  gfm: true,
  breaks: true,
})

/** Minimal XSS hardening for RichText HTML — prefer short replies without raw HTML from model. */
export function sanitizeAssistantHtml(html: string): string {
  let s = html
  s = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
  s = s.replace(/<\/?(?:iframe|object|embed|form|input|button|meta|link)\b[^>]*>/gi, "")
  s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
  s = s.replace(/\shref\s*=\s*"\s*javascript:[^"]*"/gi, ' href="#"')
  s = s.replace(/\shref\s*=\s*'\s*javascript:[^']*'/gi, " href='#'")
  return s
}

export function markdownToHtml(markdown: string): string {
  const html = marked.parse(markdown.trimEnd(), { async: false }) as string
  return sanitizeAssistantHtml(html)
}
