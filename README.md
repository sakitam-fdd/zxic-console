# ZXIC Console

面向随身 Wi-Fi 设备的现代化 Web 控制台。基于 React 19、Rsbuild、Headless UI、shadcn/ui 风格组件与 Tailwind CSS 4。

## 功能

- 设备概览：联网状态、信号、流量、设备信息和实时趋势
- 快速设置：Wi-Fi 名称、密码与安全模式
- 网络管理：流量套餐、VPN、APN、终端列表、LAN/DHCP、Wi-Fi 性能与频段
- 消息管理：短信收发、草稿、已发送和设备存储
- SIM 与蜂窝：切卡、PIN 解锁、频段锁定及 R186x 设备差异适配
- 高级设置：DDNS、TR-069、AT 指令、SNTP、ADB、MAC/IMEI 修改和设备维护
- 体验能力：响应式导航、明暗主题、危险操作确认、统一反馈和无障碍交互

## 技术栈

- React 19 + TypeScript
- React Router 7 + Zustand
- Rsbuild 2
- Headless UI
- shadcn/ui 设计约定 + Tailwind CSS 4
- Recharts + Lucide
- Biome

## 开发

要求 Node.js 22+，仓库声明使用 pnpm 9.15.9。

```bash
corepack enable
pnpm install
pnpm dev
```

开发服务默认运行于 `http://localhost:8848`，并将 `/api` 代理到 `http://192.168.0.1`。设备地址可在 `rsbuild.config.ts` 中调整。

环境变量遵循 [Rsbuild 规范](https://rsbuild.rs/guide/advanced/env-vars)：客户端仅注入 `PUBLIC_*`（如 `PUBLIC_BASE_URL`）；`PORT`、`ASSET_PREFIX` 仅供构建配置读取。按 mode 使用 `.env` / `.env.development` / `.env.production` / `.env.staging` / `.env.mock`。

## Mock 离线调试

未连接设备时可使用脱敏 HAR 快照：

```bash
pnpm dev:mock
```

任意至少 4 位密码即可登录。数据源见 `src/features/device/mock/fixture.json`（已去除密码、IMEI、真实 MAC/主机名等敏感信息）。

```bash
pnpm build:mock
pnpm preview:mock
```

## 校验与构建

```bash
pnpm check
pnpm typecheck
pnpm build
pnpm build:staging
pnpm build:mock
```

生产产物位于 `dist/`。设备构建使用相对静态资源路径和 Hash Router，可直接部署到设备 Web 根目录。

CI（`.github/workflows/ci.yml`）会分别校验 **production** 与 **mock** 构建；推送到 `main`/`dev` 时额外打包设备 `auto_install` 制品。Mock 演示站由 [`.github/workflows/pages.yml`](.github/workflows/pages.yml) 部署到 GitHub Pages（需在仓库 Settings → Pages 启用 GitHub Actions）。

## 项目结构

```text
src/
├── app/          # 应用装配、路由、主题和全局样式
├── components/   # 控制台骨架、品牌标识和共享 UI
├── features/     # 设备 API、状态、反馈等业务能力
├── lib/          # 通用工具
└── pages/        # 按业务域组织的页面
```

架构和设备接口映射详见 [`docs/architecture.md`](docs/architecture.md)。

## 刷入设备

Actions 构建产物会包含 `web` 目录和 `docs/install.bat`。刷入前请安装 ADB 并配置环境变量。

手动部署：

```sh
adb pull /etc_rc/web ../web_backup
adb shell mount -o remount,rw /
adb shell rm -rf /etc_ro/web/*
adb push ./dist/* /etc_ro/web/
adb shell reboot
```

请先备份原设备页面。不同固件可能存在 CGI 字段差异，首次部署应在目标设备上逐项验证写操作。
