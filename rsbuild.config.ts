import { defineConfig, loadEnv } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { createDeviceProxyMiddleware } from "./device-proxy";

const DEVICE_HOST = "192.168.0.1";
const DEVICE_PORT = 80;

export default defineConfig(({ envMode }) => {
  // 默认 prefixes 为 PUBLIC_，符合 Rsbuild 规范
  const { parsed, publicVars } = loadEnv({ mode: envMode });

  return {
    plugins: [pluginReact()],
    source: {
      entry: {
        index: "./src/main.tsx",
      },
      define: publicVars,
    },
    html: {
      template: "./index.html",
    },
    server: {
      host: "0.0.0.0",
      port: Number(parsed.PORT || 8848),
      setup: ({ server }) => {
        // 自定义代理优先于内置 middleware，规避固件畸形 HTTP 头导致的 500
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
  };
});
