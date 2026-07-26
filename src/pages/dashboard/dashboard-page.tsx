import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BatteryCharging,
  ChevronRight,
  CircleGauge,
  EthernetPort,
  RadioTower,
  Signal,
  Smartphone,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { PageHeader, SettingsCard } from "@/components/page";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
  Switch,
} from "@/components/ui/primitives";
import { postApi } from "@/features/device/api";
import { useDeviceStore } from "@/features/device/store";
import {
  cn,
  formatBytes,
  formatDuration,
  formatThroughput,
  normalizeCarrier,
  resultSucceeded,
} from "@/lib/utils";

function signalLevel(value?: string) {
  const rssi = Number(value || -120);
  if (rssi >= -70) return 4;
  if (rssi >= -85) return 3;
  if (rssi >= -100) return 2;
  if (rssi >= -110) return 1;
  return 0;
}

function SignalBars({ value }: { value?: string }) {
  const level = signalLevel(value);
  return (
    <div className="flex h-9 items-end gap-1" role="img" aria-label={`信号等级 ${level} / 4`}>
      {[1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          className={cn(
            "w-1.5 rounded-full bg-muted transition-colors",
            bar <= level && "bg-primary",
          )}
          style={{ height: `${bar * 20 + 12}%` }}
        />
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "blue" | "amber" | "violet";
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", toneClass)}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function parseLimit(value?: string) {
  if (!value) return 0;
  const [amount, factor = "1"] = value.split("_");
  return Number(amount || 0) * Number(factor || 1) * 1024 * 1024;
}

export default function DashboardPage() {
  const [wifiLoading, setWifiLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const navigate = useNavigate();
  const snapshot = useDeviceStore((state) => state.snapshot);
  const network = snapshot.network;
  const info = snapshot.info;
  const signal = snapshot.signal;
  const wifiEnabled = network.wifi_cur_state === "1";
  const dataEnabled = network.ppp_status === "ppp_connected";
  const noSim = network.modem_main_state === "modem_sim_undetected";
  const connectedClients = snapshot.wifiClients.length + snapshot.lanClients.length;
  const usedBytes = Number(network.monthly_tx_bytes || 0) + Number(network.monthly_rx_bytes || 0);
  const limitBytes = parseLimit(network.data_volume_limit_size);
  const usagePercent = limitBytes ? (usedBytes / limitBytes) * 100 : 0;
  const rssi = signal.lte_rsrp || signal.rssi || info.rssi;
  const ssid = network.SSID1 || info.SSID1 || info.m_SSID || "未读取";
  const carrier = normalizeCarrier(network.network_provider, noSim);

  async function setWifi(enabled: boolean) {
    setWifiLoading(true);
    try {
      const result = await postApi({
        goformId: "SET_WIFI_INFO",
        wifiEnabled: enabled ? "1" : "0",
      });
      if (!resultSucceeded(result)) throw new Error("设备拒绝了 Wi-Fi 状态变更");
      toast.success(enabled ? "Wi-Fi 已开启" : "Wi-Fi 已关闭");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "设置失败");
    } finally {
      setWifiLoading(false);
    }
  }

  async function setMobileData(enabled: boolean) {
    setDataLoading(true);
    try {
      const result = await postApi({
        goformId: enabled ? "CONNECT_NETWORK" : "DISCONNECT_NETWORK",
        notCallback: "true",
      });
      if (!resultSucceeded(result)) throw new Error("设备拒绝了蜂窝网络状态变更");
      toast.success(enabled ? "蜂窝数据正在连接" : "蜂窝数据已断开");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "设置失败");
    } finally {
      setDataLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Live network"
        title="设备总览"
        description="从蜂窝网络、Wi-Fi 和流量三个维度查看随身设备的实时运行状态。"
        actions={
          <Badge variant={dataEnabled ? "success" : "warning"}>
            <span className="size-1.5 rounded-full bg-current" />
            {dataEnabled ? "设备在线" : "数据未连接"}
          </Badge>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="蜂窝信号"
          value={noSim ? "无 SIM" : `${rssi || "—"} dBm`}
          detail={info.sub_network_type || signal.sub_network_type || "等待网络制式"}
          icon={Signal}
        />
        <StatCard
          label="运营商"
          value={carrier}
          detail={network.network_type || "蜂窝网络"}
          icon={RadioTower}
          tone="blue"
        />
        <StatCard
          label="接入设备"
          value={`${connectedClients} 台`}
          detail={`Wi-Fi ${snapshot.wifiClients.length} · 有线 ${snapshot.lanClients.length}`}
          icon={Smartphone}
          tone="violet"
        />
        <StatCard
          label="设备电量"
          value={`${network.battery_vol_percent || network.battery_pers || "—"}%`}
          detail={network.battery_charging === "1" ? "正在充电" : "电池供电"}
          icon={BatteryCharging}
          tone="amber"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)]">
        <SettingsCard
          title="实时吞吐"
          description="最近 30 个采样点，单位 KB/s"
          actions={
            <div className="hidden items-center gap-4 text-xs sm:flex">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-full bg-primary" />
                下载
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-full bg-blue-500" />
                上传
              </span>
            </div>
          }
        >
          <div className="mb-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-background/55 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ArrowDownToLine className="size-3.5 text-primary" />
                当前下载
              </div>
              <p className="mt-2 font-mono text-lg font-semibold">
                {formatThroughput(network.realtime_rx_thrpt)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background/55 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ArrowUpFromLine className="size-3.5 text-blue-500" />
                当前上传
              </div>
              <p className="mt-2 font-mono text-lg font-semibold">
                {formatThroughput(network.realtime_tx_thrpt)}
              </p>
            </div>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={snapshot.samples}
                margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
              >
                <defs>
                  <linearGradient id="download" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="upload" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={34}
                />
                <YAxis
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--popover)",
                    color: "var(--popover-foreground)",
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${Number(value || 0).toFixed(2)} KB/s`]}
                />
                <Area
                  type="monotone"
                  dataKey="download"
                  name="下载"
                  stroke="var(--chart-1)"
                  fill="url(#download)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="upload"
                  name="上传"
                  stroke="var(--chart-2)"
                  fill="url(#upload)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SettingsCard>

        <div className="grid gap-5">
          <SettingsCard title="网络控制" description="快速切换核心无线能力">
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-border bg-background/55 p-4">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {wifiEnabled ? <Wifi /> : <WifiOff />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Wi-Fi 热点</p>
                  <p className="truncate text-xs text-muted-foreground">{ssid}</p>
                </div>
                <Switch
                  label="切换 Wi-Fi 热点"
                  checked={wifiEnabled}
                  disabled={wifiLoading}
                  onCheckedChange={setWifi}
                />
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-background/55 p-4">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
                  <RadioTower />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">蜂窝数据</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {dataEnabled ? "已连接到移动网络" : "当前未连接"}
                  </p>
                </div>
                <Switch
                  label="切换蜂窝数据"
                  checked={dataEnabled}
                  disabled={dataLoading}
                  onCheckedChange={setMobileData}
                />
              </div>
            </div>
          </SettingsCard>

          <SettingsCard
            title="信号质量"
            description={info.sub_network_type || "蜂窝无线信号"}
            actions={<SignalBars value={rssi} />}
          >
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                ["RSSI", signal.rssi || info.detail_cell_rssi],
                ["RSRP", signal.lte_rsrp || info.lte_rsrp],
                ["RSRQ", info.detail_cell_rsrq],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-muted/45 px-2 py-3">
                  <p className="text-[10px] font-semibold tracking-wider text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold">{value || "—"}</p>
                </div>
              ))}
            </div>
          </SettingsCard>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>接入设备</CardTitle>
              <CardDescription className="mt-1">最近在线的 Wi-Fi 与有线客户端</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/wifi/clients")}>
              全部设备
              <ChevronRight />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {[...snapshot.wifiClients, ...snapshot.lanClients].slice(0, 5).map((client) => (
                <div
                  key={client.mac_addr || `${client.ip_addr}-${client.hostname}`}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    {snapshot.wifiClients.includes(client) ? (
                      <Wifi className="size-4" />
                    ) : (
                      <EthernetPort className="size-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{client.hostname || "未知设备"}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {client.mac_addr || "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs">{client.ip_addr || "—"}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {formatDuration(client.duration)}
                    </p>
                  </div>
                </div>
              ))}
              {!connectedClients ? (
                <div className="py-10 text-center text-sm text-muted-foreground">暂无接入设备</div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>本月用量</CardTitle>
            <CardDescription>蜂窝数据套餐统计</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-semibold tracking-tight">{formatBytes(usedBytes)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {limitBytes ? `套餐总量 ${formatBytes(limitBytes)}` : "尚未设置流量套餐"}
                </p>
              </div>
              <CircleGauge className="size-8 text-primary" />
            </div>
            <Progress value={usagePercent} className="mt-5 h-2.5" />
            <div className="mt-3 flex justify-between text-xs text-muted-foreground">
              <span>{Math.min(usagePercent, 999).toFixed(1)}% 已用</span>
              <span>运行 {formatDuration(network.monthly_time)}</span>
            </div>
            <Button
              variant="outline"
              className="mt-5 w-full"
              onClick={() => navigate("/network/data-plan")}
            >
              管理流量计划
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>设备身份</CardTitle>
            <CardDescription>蜂窝模块与固件的只读标识信息</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["IMEI", info.imei],
              ["ICCID", info.ziccid],
              ["IMSI", info.sim_imsi || info.imsi],
              ["局域网地址", info.lan_ipaddr || network.lan_ipaddr],
              ["WAN IPv4", info.wan_ipaddr || info.static_wan_ipaddr],
              ["WAN IPv6", info.ipv6_wan_ipaddr],
              ["软件版本", info.cr_version],
              ["硬件版本", info.hw_version],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 bg-card px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 truncate font-mono text-xs" title={value || "—"}>
                  {value || "—"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
