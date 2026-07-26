import path from "node:path";
import { defineConfig, loadEnv, rspack } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { createDeviceProxyMiddleware } from "./device-proxy";

const DEVICE_HOST = "192.168.0.1";
const DEVICE_PORT = 80;

export default defineConfig(({ envMode }) => {
  // 默认 prefixes 为 PUBLIC_，符合 Rsbuild 规范
  const { parsed, publicVars } = loadEnv({ mode: envMode });
  const isMock = envMode === "mock" || parsed.PUBLIC_MOCK === "true";

  return {
    plugins: [pluginReact()],
    source: {
      entry: {
        index: "./src/main.tsx",
      },
      define: {
        ...publicVars,
        "import.meta.env.PUBLIC_MOCK": JSON.stringify(isMock ? "true" : "false"),
      },
    },
    html: {
      template: "./index.html",
    },
    server: {
      host: "0.0.0.0",
      port: Number(parsed.PORT || 8848),
      setup: isMock
        ? undefined
        : ({ server }) => {
            server.middlewares.use(
              createDeviceProxyMiddleware({ host: DEVICE_HOST, port: DEVICE_PORT }),
            );
          },
    },
    output: {
      assetPrefix: parsed.ASSET_PREFIX || "./",
      distPath: {
        root: "dist",
        js: "static/js",
        css: "static/css",
        image: "static/img",
        font: "static/font",
      },
      filename: {
        js: "[name]-[contenthash:8].js",
        css: "[name]-[contenthash:8].css",
        image: "[name]-[contenthash:8][ext]",
        font: "[name]-[contenthash:8][ext]",
      },
      sourceMap: false,
    },
    performance: {
      chunkSplit: {
        strategy: "split-by-experience",
      },
    },
    tools: {
      rspack: (config) => {
        if (!isMock) {
          // 设备构建替换为 empty stub，确保 fixture 不会进入产物
          config.plugins?.push(
            new rspack.NormalModuleReplacementPlugin(
              /features[\\/]device[\\/]mock[\\/]server/,
              path.resolve(__dirname, "src/features/device/mock/empty.ts"),
            ),
          );
        }
      },
    },
  };
});
