import { Text, View } from "@tarojs/components"
import { useLoad } from "@tarojs/taro"
import "./index.css"

export default function Index() {
  useLoad(() => {
    console.log("Page loaded.")
  })

  const apiBase = process.env.TARO_APP_API ?? ""

  return (
    <View className="flex min-h-screen flex-col gap-4 bg-slate-950 px-4 py-6">
      <Text className="text-xl font-semibold text-white">any-door</Text>
      <Text className="text-sm leading-relaxed text-slate-300">
        首期目标：AI 对话、流式输出与 Markdown 渲染。当前为占位首页。
      </Text>
      <Text className="text-xs text-slate-500">
        TARO_APP_API={apiBase || "（未配置）"}
      </Text>
    </View>
  )
}
