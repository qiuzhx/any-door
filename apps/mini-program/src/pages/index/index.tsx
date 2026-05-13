import { useCallback, useEffect, useRef, useState } from "react"
import { Button, RichText, ScrollView, Text, Textarea, View } from "@tarojs/components"
import { useLoad } from "@tarojs/taro"
import type { ChatMessageDTO } from "@any-door/shared"
import { chatStreamPath, joinApiUrl } from "@any-door/shared"
import { markdownToHtml } from "../../utils/markdown"
import { startChatStream, type StreamHandle } from "../../utils/streamChat"
import "./index.css"

type UiMessage = ChatMessageDTO & { id: string; streaming?: boolean }

function createId(): string {
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export default function Index() {
  const apiBase = (process.env.TARO_APP_API ?? "").replace(/\/$/, "")
  const streamUrl = apiBase ? joinApiUrl(apiBase, chatStreamPath()) : ""

  const [messages, setMessages] = useState<UiMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [scrollIntoView, setScrollIntoView] = useState("")
  const streamRef = useRef<StreamHandle | null>(null)

  useLoad(() => {
    if (!apiBase) {
      console.warn("TARO_APP_API is empty — configure apps/mini-program/.env.development")
    }
  })

  useEffect(() => {
    const last = messages[messages.length - 1]
    if (last) {
      setScrollIntoView(`msg-${last.id}`)
    }
  }, [messages])

  const stop = useCallback(() => {
    streamRef.current?.abort()
    streamRef.current = null
    setLoading(false)
    setMessages((prev) =>
      prev.map((m) => (m.role === "assistant" && m.streaming ? { ...m, streaming: false } : m)),
    )
  }, [])

  const send = useCallback(() => {
    const text = input.trim()
    if (!text || loading) return
    if (!streamUrl) {
      setError("请先配置 TARO_APP_API（例如本地 http://127.0.0.1:8787）")
      return
    }

    const userMsg: UiMessage = { id: createId(), role: "user", content: text }
    const assistantMsg: UiMessage = { id: createId(), role: "assistant", content: "", streaming: true }

    const prior = messages.filter((m) => !(m.role === "assistant" && m.streaming))
    const apiPayload: ChatMessageDTO[] = [
      ...prior.map(({ role, content }) => ({ role, content })),
      { role: "user", content: text },
    ]

    setInput("")
    setError("")
    setLoading(true)
    streamRef.current?.abort()

    setMessages([...prior, userMsg, assistantMsg])

    streamRef.current = startChatStream(streamUrl, apiPayload, {
      onDelta(fullText) {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: fullText } : m)),
        )
      },
      onDone() {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsg.id ? { ...m, streaming: false } : m)),
        )
        setLoading(false)
        streamRef.current = null
      },
      onError(msg) {
        setError(msg)
        setLoading(false)
        streamRef.current = null
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  streaming: false,
                  content: m.content ? `${m.content}\n\n（出错）${msg}` : `（出错）${msg}`,
                }
              : m,
          ),
        )
      },
    })
  }, [input, loading, messages, streamUrl])

  const clear = useCallback(() => {
    stop()
    setMessages([])
    setError("")
  }, [stop])

  return (
    <View className="flex h-screen flex-col bg-slate-950">
      <View className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
        <Text className="text-lg font-semibold text-white">any-door</Text>
        <Button className="m-0 bg-transparent text-xs text-slate-400" size="mini" onClick={clear}>
          清空
        </Button>
      </View>

      {!apiBase ? (
        <View className="px-4 py-2">
          <Text className="text-xs text-amber-400">
            未配置 TARO_APP_API：编辑 apps/mini-program/.env.development（本地 API 地址）。
          </Text>
        </View>
      ) : null}

      {error ? (
        <View className="px-4 py-2">
          <Text className="text-xs text-red-400">{error}</Text>
        </View>
      ) : null}

      <ScrollView
        className="min-h-0 flex-1 px-3 py-2"
        scrollY
        scrollIntoView={scrollIntoView}
        enhanced
        showScrollbar={false}
      >
        {messages.length === 0 ? (
          <Text className="mt-8 block text-center text-sm text-slate-500">
            发送第一条消息开始对话（支持流式输出；完成后渲染 Markdown）
          </Text>
        ) : null}

        {messages.map((m) => (
          <View key={m.id} id={`msg-${m.id}`} className={m.role === "user" ? "mb-3 flex justify-end" : "mb-3 flex justify-start"}>
            {m.role === "user" ? (
              <View className="max-w-[85%] rounded-2xl bg-blue-600 px-3 py-2">
                <Text selectable className="text-sm leading-relaxed text-white">
                  {m.content}
                </Text>
              </View>
            ) : (
              <View className="max-w-[92%] rounded-2xl bg-slate-900 px-3 py-2">
                {m.streaming ? (
                  <Text selectable className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">
                    {`${m.content}\u258d`}
                  </Text>
                ) : (
                  <RichText className="markdown-html text-sm leading-relaxed text-slate-100" nodes={markdownToHtml(m.content)} />
                )}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View className="shrink-0 border-t border-slate-800 bg-slate-950 px-3 pb-4 pt-2">
        <Textarea
          className="mb-2 box-border min-h-[72px] w-full rounded-xl bg-slate-900 px-3 py-2 text-sm text-white"
          placeholder="输入消息，Shift+回车换行（长按发送键发送）"
          placeholderClass="text-slate-500"
          maxlength={8000}
          value={input}
          disabled={loading}
          autoHeight
          onInput={(e) => setInput(e.detail.value)}
        />
        <View className="flex gap-2">
          <Button
            className="m-0 flex-1 border-0 bg-blue-600 text-white"
            loading={loading}
            disabled={loading || !input.trim()}
            onClick={send}
          >
            发送
          </Button>
          {loading ? (
            <Button className="m-0 bg-slate-800 text-slate-200" onClick={stop}>
              停止
            </Button>
          ) : null}
        </View>
      </View>
    </View>
  )
}
