import { defineConfig, type UserConfigExport } from "@tarojs/cli"
import type { Plugin } from "vite"
import autoprefixer from "autoprefixer"
import tailwindcss from "tailwindcss"
import devConfig from "./dev"
import prodConfig from "./prod"
import { UnifiedViteWeappTailwindcssPlugin as uvtw } from "weapp-tailwindcss/vite"

export default defineConfig<"vite">(async (merge, { command, mode }) => {
  const twPlugins = uvtw({
    rem2rpx: true,
    disabled:
      process.env.TARO_ENV === "h5" ||
      process.env.TARO_ENV === "harmony" ||
      process.env.TARO_ENV === "rn",
    injectAdditionalCssVarScope: true,
  })

  const baseConfig: UserConfigExport<"vite"> = {
    projectName: "mini-program",
    date: "2026-05-13",
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2,
    },
    sourceRoot: "src",
    outputRoot: "dist",
    plugins: ["@tarojs/plugin-generator"],
    defineConstants: {},
    copy: { patterns: [], options: {} },
    framework: "react",
    compiler: {
      type: "vite",
      vitePlugins: [
        {
          name: "postcss-config-loader-plugin",
          config(config) {
            config.css ??= {}
            const postcss = config.css.postcss
            if (typeof postcss === "object" && postcss !== null) {
              postcss.plugins ??= []
              postcss.plugins.unshift(tailwindcss(), autoprefixer())
            }
          },
        },
        ...(twPlugins ?? []),
      ] as Plugin[],
    },
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
          config: {},
        },
        cssModules: {
          enable: false,
          config: {
            namingPattern: "module",
            generateScopedName: "[name]__[local]___[hash:base64:5]",
          },
        },
      },
    },
    h5: {
      publicPath: "/",
      staticDirectory: "static",
      miniCssExtractPluginOption: {
        ignoreOrder: true,
        filename: "css/[name].[hash].css",
        chunkFilename: "css/[name].[chunkhash].css",
      },
      postcss: {
        autoprefixer: {
          enable: true,
          config: {},
        },
        cssModules: {
          enable: false,
          config: {
            namingPattern: "module",
            generateScopedName: "[name]__[local]___[hash:base64:5]",
          },
        },
      },
    },
    rn: {
      appName: "anyDoor",
      postcss: {
        cssModules: {
          enable: false,
        },
      },
    },
  }

  if (process.env.NODE_ENV === "development") {
    return merge({}, baseConfig, devConfig)
  }
  return merge({}, baseConfig, prodConfig)
})
