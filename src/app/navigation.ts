import {
  Antenna,
  BookUser,
  ChartNoAxesCombined,
  CircleGauge,
  CreditCard,
  Database,
  Globe2,
  HardDrive,
  KeyRound,
  Link2,
  List,
  type LucideIcon,
  MessageSquareText,
  Network,
  RadioTower,
  Router,
  Send,
  Settings2,
  Shield,
  ShieldCheck,
  Signal,
  SlidersHorizontal,
  TerminalSquare,
  TimerReset,
  Wifi,
  WifiOff,
} from "lucide-react";

export interface NavigationItem {
  title: string;
  description: string;
  path: string;
  icon: LucideIcon;
  capability?: "ussd" | "vpn" | "tr069" | "bandSelect";
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

export const navigation: NavigationGroup[] = [
  {
    label: "概览",
    items: [
      {
        title: "设备总览",
        description: "状态、信号与实时流量",
        path: "/",
        icon: CircleGauge,
      },
    ],
  },
  {
    label: "网络",
    items: [
      {
        title: "Wi-Fi 设置",
        description: "SSID、安全与接入控制",
        path: "/network/wifi",
        icon: Wifi,
      },
      {
        title: "流量计划",
        description: "套餐、阈值与用量校准",
        path: "/network/data-plan",
        icon: ChartNoAxesCombined,
      },
      {
        title: "连接模式",
        description: "自动/手动拨号与漫游",
        path: "/network/connection",
        icon: Network,
      },
      {
        title: "网络选择",
        description: "制式偏好与手动搜网",
        path: "/network/select",
        icon: Signal,
      },
      {
        title: "WAN",
        description: "有线 PPPoE / 静态 / 动态",
        path: "/network/wan",
        icon: Router,
      },
      {
        title: "VPN",
        description: "L2TP 与 PPTP 隧道",
        path: "/network/vpn",
        icon: ShieldCheck,
        capability: "vpn",
      },
      {
        title: "APN",
        description: "蜂窝网络拨号配置",
        path: "/network/apn",
        icon: Globe2,
      },
    ],
  },
  {
    label: "Wi-Fi",
    items: [
      {
        title: "连接设备",
        description: "客户端与黑名单",
        path: "/wifi/clients",
        icon: List,
      },
      {
        title: "副 SSID",
        description: "访客热点配置",
        path: "/wifi/guest",
        icon: WifiOff,
      },
      {
        title: "性能设置",
        description: "覆盖、休眠与定时唤醒",
        path: "/wifi/performance",
        icon: SlidersHorizontal,
      },
      {
        title: "局域网与 DHCP",
        description: "网关、地址池与 DNS",
        path: "/wifi/lan",
        icon: Router,
      },
      {
        title: "无线电设置",
        description: "模式、信道与带宽",
        path: "/wifi/radio",
        icon: RadioTower,
      },
      {
        title: "WPS",
        description: "按键与 PIN 配网",
        path: "/wifi/wps",
        icon: KeyRound,
      },
      {
        title: "MAC 过滤",
        description: "黑白名单接入控制",
        path: "/wifi/mac-filter",
        icon: Shield,
      },
      {
        title: "Internet Wi-Fi",
        description: "无线上行 / AP Station",
        path: "/wifi/ap-station",
        icon: Antenna,
      },
    ],
  },
  {
    label: "通信",
    items: [
      {
        title: "短信中心",
        description: "收件、SIM 箱与中心号",
        path: "/messages",
        icon: MessageSquareText,
      },
      {
        title: "USSD",
        description: "运营商短码交互",
        path: "/messages/ussd",
        icon: Send,
        capability: "ussd",
      },
      {
        title: "电话本",
        description: "联系人与短信快捷发送",
        path: "/network/phonebook",
        icon: BookUser,
      },
      {
        title: "外部页面",
        description: "嵌入扩展页面",
        path: "/external",
        icon: Link2,
      },
    ],
  },
  {
    label: "安全",
    items: [
      {
        title: "防火墙",
        description: "端口、DMZ、UPnP 与过滤",
        path: "/security/firewall",
        icon: Shield,
      },
      {
        title: "家长控制",
        description: "儿童组设备与上网规则",
        path: "/security/parental",
        icon: ShieldCheck,
      },
    ],
  },
  {
    label: "高级",
    items: [
      {
        title: "修改密码",
        description: "设备管理登录密码",
        path: "/account/password",
        icon: KeyRound,
      },
      {
        title: "PIN 码管理",
        description: "启用、修改与 PUK",
        path: "/advanced/pin",
        icon: CreditCard,
      },
      {
        title: "SIM 卡管理",
        description: "默认卡与自动切换",
        path: "/advanced/sim",
        icon: CreditCard,
      },
      {
        title: "蜂窝频段",
        description: "锁定 4G / 3G 频段",
        path: "/advanced/bands",
        icon: Signal,
        capability: "bandSelect",
      },
      {
        title: "系统升级",
        description: "FOTA 检测与自动更新",
        path: "/advanced/fota",
        icon: HardDrive,
      },
      {
        title: "DDNS",
        description: "动态域名服务",
        path: "/advanced/ddns",
        icon: Network,
      },
      {
        title: "TR-069",
        description: "远程设备管理",
        path: "/advanced/tr069",
        icon: Database,
        capability: "tr069",
      },
      {
        title: "AT 命令",
        description: "调试蜂窝模块",
        path: "/advanced/at",
        icon: TerminalSquare,
      },
      {
        title: "设备与时间",
        description: "维护、SNTP 与标识",
        path: "/advanced/device",
        icon: Settings2,
      },
    ],
  },
];

export const allNavigation = navigation.flatMap((group) => group.items);

export const utilityItems = {
  refresh: { title: "刷新状态", icon: TimerReset },
  send: { title: "发送", icon: Send },
  storage: { title: "存储", icon: HardDrive },
  antenna: { title: "天线", icon: Antenna },
};

export function pageForPath(pathname: string) {
  const exact = allNavigation.find((item) => item.path === pathname);
  if (exact) return exact;
  const nested = allNavigation.find(
    (item) => item.path !== "/" && pathname.startsWith(`${item.path}/`),
  );
  return nested || allNavigation[0];
}
