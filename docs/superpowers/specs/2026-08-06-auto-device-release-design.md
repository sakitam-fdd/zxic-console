# 自动设备发布与逻辑层稳健性设计

日期：2026-08-06

## 目标

在推送 `main` 且验证通过后，自动递增 `package.json` 的 patch 版本、创建 `vX.Y.Z` Tag 和 GitHub Release，并只上传一个面向普通用户的设备资源包：

`zxic-console-vX.Y.Z-device.zip`

同时修复影响设备初始化、轮询和一键刷入可靠性的逻辑问题。

## 发布流程

`.github/workflows/ci.yml` 保留 Pull Request 和 `main`/`dev` 的验证能力。新增的发布任务仅在 `push` 到 `main` 时运行，并依赖完整验证任务成功：

1. 检出仓库并安装锁定版本的 pnpm/Node.js 依赖。
2. 执行 `pnpm check`、`pnpm typecheck`、`pnpm build:mock` 和 `pnpm build`。
3. 读取 `package.json` 版本并递增 patch，提交版本文件到 `main`。
4. 创建 `vX.Y.Z` Tag。
5. 打包 production `dist` 为 `web/`，并放入 `install.bat`、`INSTALL.md` 和 `SHA256SUMS`。
6. 创建 GitHub Release，仅上传 `zxic-console-vX.Y.Z-device.zip`。

发布任务使用最小权限 `contents: write`，并设置并发控制，避免同一分支重复发布。若 Tag 已存在，任务失败而不覆盖历史 Release。

## 资源包

ZIP 根目录包含：

- `web/`：production 构建产物。
- `install.bat`：Windows 一键刷入脚本。
- `INSTALL.md`：中文前置条件、备份、执行步骤、支持硬件、风险和恢复说明。
- `SHA256SUMS`：对包内关键文件生成的 SHA-256 校验信息。

资源包名称与 Tag 版本一致，Release 页面不额外上传 Actions artifact，降低普通用户的选择成本。

## 逻辑层修正

- `DeviceRuntime` 的启动请求具备失败兜底，初始化失败不会永久停留在 `checking`。
- 设备轮询在检测到会话失效时只执行一次状态重置和提示，并确保 polling 状态在所有提前返回路径恢复。
- 轮询生命周期清理全局刷新处理器，避免卸载后继续调用旧回调。
- 安装脚本验证 curl HTTP 请求和 JSON 结果，正确筛选 ADB 的 `device` 状态；刷写前完成备份和写入检查，刷写失败时尝试恢复原 WEB 目录。

## 验证

本地执行：

- `pnpm check`
- `pnpm typecheck`
- `pnpm build:mock`
- `pnpm build`

由于本机当前没有 `node_modules`，如依赖尚未安装则先执行 `pnpm install --frozen-lockfile`。CI 将执行同样的验证流程。
