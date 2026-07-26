# 前端架构

## 设计原则

ZXIC Console 采用按业务能力分层的单页应用结构。页面只组合界面和用户流程；设备通讯、运行时状态与反馈机制位于独立 feature 中，避免 CGI 字段散落在视图组件里。

```text
main.tsx
└── app/app.tsx
    ├── theme-provider
    ├── device/runtime
    ├── feedback/confirm-provider
    ├── app-shell
    └── pages
        ├── auth / account
        ├── dashboard（/）
        ├── wifi (+ extra-wifi-pages)
        ├── network (+ extra-network-pages)
        ├── security / firewall-pages
        └── advanced (+ extra-advanced-pages)
```

共享 UI 使用 shadcn/ui 可复制组件约定，Headless UI 承担 Dialog、Menu、Switch 等交互语义。品牌标识见 `src/components/brand-mark.tsx` 与 `public/favicon.svg`。

## 设备通讯

`src/features/device/api.ts` 是设备 CGI 的唯一入口：

- GET 与 POST 统一错误归一化与会话字段读取。
- 开发环境 `PUBLIC_BASE_URL=/api`（Rsbuild 默认 `PUBLIC_` 前缀），由 `device-proxy.ts` 以原始 TCP 转发到 `192.168.0.1`，规避跨域，并规范化固件混用 LF/CRLF 的畸形 HTTP 头（Node 22 严格解析会直接 500）。
- 生产环境使用 `.` 相对地址，适配固件内嵌 Web 根目录。
- 服务端口与资源前缀使用非公开变量 `PORT` / `ASSET_PREFIX`，仅在 `rsbuild.config.ts` 读取。
- 根据 `public/serverConfig.json` 的 `is_r186x` 选择 CGI 路径。
- 写操作保持原固件 `goformId`、字段名与 Base64 编码约定。

`store.ts` 保存认证、能力开关与设备快照；`runtime.tsx` 负责会话检查、轮询、能力探测，并导出 `refreshDeviceNow()`。

登录语义：设备 API **只校验密码**，不校验用户名。

## 页面与功能映射

路由使用 Hash Router。下表对应 `app/navigation.ts` 与 `app/app.tsx`。

| 业务域 | 路径 | 能力 |
| --- | --- | --- |
| 概览 | `/` | 状态、吞吐、开关、客户端摘要 |
| 账户 | `/account/password` | `CHANGE_PASSWORD` |
| 网络 | `/network/wifi` | 主 SSID / `SET_WIFI_SSID1_SETTINGS` |
| 网络 | `/network/data-plan` | 流量计划 |
| 网络 | `/network/connection` | 拨号模式 / 漫游 |
| 网络 | `/network/select` | 制式与搜网 |
| 网络 | `/network/wan` | 有线 WAN |
| 网络 | `/network/vpn` | VPN 连接与断开 |
| 网络 | `/network/apn` | APN |
| 网络 | `/network/phonebook` | 电话本 |
| Wi-Fi | `/wifi/clients` | 客户端、屏蔽、黑名单 |
| Wi-Fi | `/wifi/guest` | 副 SSID |
| Wi-Fi | `/wifi/performance` | 覆盖、休眠、TSW |
| Wi-Fi | `/wifi/lan` | DHCP、DNS |
| Wi-Fi | `/wifi/radio` | 无线电 |
| Wi-Fi | `/wifi/wps` | WPS |
| Wi-Fi | `/wifi/mac-filter` | MAC 黑白名单 |
| Wi-Fi | `/wifi/ap-station` | Internet Wi-Fi |
| 通信 | `/messages` | 设备/SIM 短信 + 中心设置 |
| 通信 | `/messages/ussd` | USSD（按能力显隐） |
| 通信 | `/external` | 外部嵌入页 |
| 安全 | `/security/firewall` 及子页 | 端口/DMZ/UPnP/限速/URL |
| 安全 | `/security/parental` | 家长控制 |
| 高级 | `/advanced/pin` | PIN/PUK |
| 高级 | `/advanced/sim` | 双卡切换 |
| 高级 | `/advanced/bands` | 频段锁定（按能力显隐） |
| 高级 | `/advanced/fota` | 系统升级 |
| 高级 | `/advanced/ddns` | DDNS |
| 高级 | `/advanced/tr069` | TR-069（按能力显隐） |
| 高级 | `/advanced/at` | AT 命令 |
| 高级 | `/advanced/device` | 维护、SNTP、标识 |

## UI 系统

- 颜色通过 OKLCH token 定义，支持亮/暗主题。
- 字体：Space Grotesk（显示）+ IBM Plex Sans（正文）+ IBM Plex Mono（数据）。
- 状态色：青绿=在线/健康，琥珀=提醒，红=危险。
- 桌面分组侧栏，移动端 Dialog 导航；icon 按钮需 `aria-label`；尊重 `prefers-reduced-motion`。
- 写操作提供提交态与反馈；危险操作二次确认。

## 验证边界

静态校验：Biome、TypeScript、Rsbuild 生产构建。CGI 写操作依赖真实设备与固件版本，合并前需在目标设备上回归。
