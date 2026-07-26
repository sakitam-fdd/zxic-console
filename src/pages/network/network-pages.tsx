import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import {
  ChartNoAxesCombined,
  ExternalLink,
  FilePenLine,
  MessageSquareText,
  Plus,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState, HelpCard, PageHeader, SettingsCard, SettingsLayout } from "@/components/page";
import {
  Badge,
  Button,
  FormField,
  Input,
  NativeSelectWrap,
  Progress,
  Select,
  Switch,
  Textarea,
} from "@/components/ui/primitives";
import { getApi, getMessages, getValues, postApi } from "@/features/device/api";
import { useDeviceStore } from "@/features/device/store";
import type { SmsMessage } from "@/features/device/types";
import { useConfirm } from "@/features/feedback/confirm-provider";
import {
  asciiToHex,
  bytesFrom,
  dataLimitValue,
  formatBytes,
  formatDuration,
  resultSucceeded,
  sleep,
  smsTime,
} from "@/lib/utils";

async function submitDevice(request: Promise<Record<string, string>>, successMessage: string) {
  const result = await request;
  if (!resultSucceeded(result)) throw new Error("设备没有接受此次操作");
  toast.success(successMessage);
  return result;
}

function parseStoredLimit(value?: string) {
  const [amount = "0", factor = "1"] = (value || "").split("_");
  const factorNumber = Number(factor);
  const unit = factorNumber >= 1048576 ? "TB" : factorNumber >= 1024 ? "GB" : "MB";
  return { amount, unit };
}

function usedDisplay(bytes: number) {
  if (bytes >= 1024 ** 4) return { amount: (bytes / 1024 ** 4).toFixed(2), unit: "TB" };
  if (bytes >= 1024 ** 3) return { amount: (bytes / 1024 ** 3).toFixed(2), unit: "GB" };
  return { amount: (bytes / 1024 ** 2).toFixed(2), unit: "MB" };
}

export function DataPlanPage() {
  const network = useDeviceStore((state) => state.snapshot.network);
  const [loading, setLoading] = useState(false);
  const [editingUsed, setEditingUsed] = useState(false);
  const [form, setForm] = useState({
    type: "data",
    packageSize: "0",
    packageUnit: "GB",
    threshold: "80",
    used: "0",
    usedUnit: "GB",
  });

  const usedBytes = Number(network.monthly_tx_bytes || 0) + Number(network.monthly_rx_bytes || 0);
  const enabled = network.data_volume_limit_switch === "1";
  const stored = parseStoredLimit(network.data_volume_limit_size);

  useEffect(() => {
    if (!network.data_volume_limit_unit) return;
    const used =
      network.data_volume_limit_unit === "time"
        ? { amount: (Number(network.monthly_time || 0) / 3600).toFixed(2), unit: "小时" }
        : usedDisplay(usedBytes);
    setForm((current) => ({
      ...current,
      type: network.data_volume_limit_unit,
      packageSize: stored.amount,
      packageUnit: network.data_volume_limit_unit === "time" ? "小时" : stored.unit,
      threshold: network.data_volume_alert_percent || "80",
      used: used.amount,
      usedUnit: used.unit,
    }));
  }, [
    network.data_volume_alert_percent,
    network.data_volume_limit_unit,
    network.monthly_time,
    stored.amount,
    stored.unit,
    usedBytes,
  ]);

  const total =
    form.type === "data"
      ? bytesFrom(Number(form.packageSize || 0), form.packageUnit)
      : Number(form.packageSize || 0) * 3600;
  const consumed = form.type === "data" ? usedBytes : Number(network.monthly_time || 0);
  const percent = total ? (consumed / total) * 100 : 0;

  async function toggle(enabledValue: boolean) {
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "DATA_LIMIT_SETTING",
          data_volume_limit_switch: enabledValue ? "1" : "0",
          data_volume_limit_unit: network.data_volume_limit_unit || form.type,
          data_volume_limit_size: network.data_volume_limit_size || "0_1",
          data_volume_alert_percent: network.data_volume_alert_percent || form.threshold,
        }),
        enabledValue ? "流量管理已启用" : "流量管理已关闭",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "设置失败");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const threshold = Number(form.threshold);
    const packageSize = Number(form.packageSize);
    if (!packageSize || threshold <= 0 || threshold > 100) {
      toast.error("套餐大小需大于 0，提醒阈值需在 1–100% 之间");
      return;
    }
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "DATA_LIMIT_SETTING",
          data_volume_limit_switch: enabled ? "1" : "0",
          data_volume_limit_unit: form.type,
          data_volume_alert_percent: form.threshold,
          data_volume_limit_size:
            form.type === "data"
              ? `${form.packageSize}_${
                  form.packageUnit === "TB" ? "1048576" : form.packageUnit === "GB" ? "1024" : "1"
                }`
              : form.packageSize,
        }),
        "流量计划已更新",
      );
      if (editingUsed) {
        const calibrationData =
          form.type === "data"
            ? dataLimitValue(Number(form.used || 0), form.usedUnit)
            : Number(form.used || 0);
        await submitDevice(
          postApi({
            goformId: "FLOW_CALIBRATION_MANUAL",
            calibration_way: form.type,
            time: form.type === "time" ? calibrationData : 0,
            data: form.type === "data" ? calibrationData : 0,
          }),
          "已用量已校准",
        );
        setEditingUsed(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "设置失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Data allowance"
        title="流量计划"
        description="设置月度流量或在线时长套餐、用量提醒阈值，并在统计有偏差时进行手动校准。"
        actions={
          <div className="flex items-center gap-3 rounded-full border border-border bg-card px-3 py-1.5">
            <span className="text-xs font-medium">流量管理</span>
            <Switch
              label="切换流量管理"
              checked={enabled}
              disabled={loading}
              onCheckedChange={toggle}
            />
          </div>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <SettingsCard
          title="套餐配置"
          description="设备按月累计蜂窝流量与在线时间"
          loading={loading}
        >
          <form onSubmit={submit} className="grid gap-5">
            <FormField label="套餐类型" htmlFor="plan-type">
              <NativeSelectWrap>
                <Select
                  id="plan-type"
                  value={form.type}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      type: event.target.value,
                      packageUnit: event.target.value === "data" ? "GB" : "小时",
                      usedUnit: event.target.value === "data" ? "GB" : "小时",
                    }))
                  }
                >
                  <option value="data">按流量统计</option>
                  <option value="time">按在线时间统计</option>
                </Select>
              </NativeSelectWrap>
            </FormField>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="套餐大小" htmlFor="package-size">
                <div className="flex gap-2">
                  <Input
                    id="package-size"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.packageSize}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, packageSize: event.target.value }))
                    }
                  />
                  <NativeSelectWrap>
                    <Select
                      aria-label="套餐单位"
                      className="w-28"
                      value={form.packageUnit}
                      onChange={(event) =>
                        setForm((value) => ({ ...value, packageUnit: event.target.value }))
                      }
                    >
                      {form.type === "data" ? (
                        <>
                          <option value="MB">MB</option>
                          <option value="GB">GB</option>
                          <option value="TB">TB</option>
                        </>
                      ) : (
                        <option value="小时">小时</option>
                      )}
                    </Select>
                  </NativeSelectWrap>
                </div>
              </FormField>
              <FormField
                label="提醒阈值"
                htmlFor="threshold"
                description="达到此用量百分比时提醒。"
              >
                <div className="relative">
                  <Input
                    id="threshold"
                    type="number"
                    min="1"
                    max="100"
                    value={form.threshold}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, threshold: event.target.value }))
                    }
                    className="pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    %
                  </span>
                </div>
              </FormField>
            </div>
            <FormField
              label="已使用"
              htmlFor="used"
              description={
                editingUsed ? "修改后保存将向设备提交手动校准。" : "点击“校准”可修正设备统计。"
              }
            >
              <div className="flex gap-2">
                <Input
                  id="used"
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={!editingUsed}
                  value={form.used}
                  onChange={(event) => setForm((value) => ({ ...value, used: event.target.value }))}
                />
                <NativeSelectWrap>
                  <Select
                    aria-label="已使用单位"
                    className="w-28"
                    disabled={!editingUsed}
                    value={form.usedUnit}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, usedUnit: event.target.value }))
                    }
                  >
                    {form.type === "data" ? (
                      <>
                        <option value="MB">MB</option>
                        <option value="GB">GB</option>
                        <option value="TB">TB</option>
                      </>
                    ) : (
                      <option value="小时">小时</option>
                    )}
                  </Select>
                </NativeSelectWrap>
                <Button
                  type="button"
                  variant={editingUsed ? "secondary" : "outline"}
                  onClick={() => setEditingUsed((value) => !value)}
                >
                  <FilePenLine />
                  {editingUsed ? "取消" : "校准"}
                </Button>
              </div>
            </FormField>
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <Save />
                保存流量计划
              </Button>
            </div>
          </form>
        </SettingsCard>

        <SettingsCard
          title="当前用量"
          description={form.type === "data" ? "本月蜂窝流量" : "本月在线时间"}
        >
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ChartNoAxesCombined />
          </div>
          <p className="mt-5 text-3xl font-semibold tracking-tight">
            {form.type === "data" ? formatBytes(usedBytes) : formatDuration(network.monthly_time)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            套餐总量 {form.packageSize || 0} {form.packageUnit}
          </p>
          <Progress value={percent} className="mt-5 h-2.5" />
          <div className="mt-3 flex justify-between text-xs text-muted-foreground">
            <span>{Math.min(percent, 999).toFixed(1)}% 已用</span>
            <span>阈值 {form.threshold}%</span>
          </div>
          <div className="mt-6 rounded-xl bg-muted/45 p-4">
            <p className="text-xs text-muted-foreground">剩余可用</p>
            <p className="mt-1 font-semibold">
              {form.type === "data"
                ? formatBytes(Math.max(0, total - usedBytes))
                : formatDuration(Math.max(0, total - Number(network.monthly_time || 0)))}
            </p>
          </div>
        </SettingsCard>
      </div>
    </div>
  );
}

export function VpnPage() {
  const network = useDeviceStore((state) => state.snapshot.network);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    username: "",
    password: "",
    server: "",
    type: "l2tp",
  });
  const [status, setStatus] = useState({ vpn_state: "", connect_status: "" });

  useEffect(() => {
    getValues(
      [
        "vpn_name",
        "vpn_password",
        "vpn_server_ip",
        "vpn_state",
        "vpn_type",
        "vpn_mode",
        "connect_status",
        "vpn_status",
      ],
      true,
    )
      .then((data) => {
        setForm({
          username: data.vpn_name || "",
          password: data.vpn_password || "",
          server: data.vpn_server_ip || "",
          type: data.vpn_type || "l2tp",
        });
        setStatus({
          vpn_state: data.vpn_state || "",
          connect_status: data.connect_status || "",
        });
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "读取失败"))
      .finally(() => setLoading(false));
  }, []);

  const connected =
    status.vpn_state === "1" ||
    status.connect_status === "connected" ||
    network.vpn_state === "1" ||
    network.connect_status === "connected";

  async function connect(event: React.FormEvent) {
    event.preventDefault();
    if (!form.server) {
      toast.error("请输入 VPN 服务器地址");
      return;
    }
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "GOFORM_OPEN_VPN",
          vpn_name: form.username,
          vpn_type: form.type,
          vpn_password: form.password,
          vpn_server_ip: form.server,
        }),
        "VPN 连接请求已发送",
      );
      setStatus({ vpn_state: "1", connect_status: "connected" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "连接失败");
    } finally {
      setLoading(false);
    }
  }

  async function disconnect() {
    setLoading(true);
    try {
      await submitDevice(postApi({ goformId: "GOFORM_CLOSE_VPN" }), "VPN 已断开");
      setStatus({ vpn_state: "0", connect_status: "disconnected" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "断开失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Private tunnel"
        title="VPN 设置"
        description="配置设备级 L2TP 或 PPTP 隧道，所有通过热点访问互联网的客户端将共用此连接。"
        actions={
          <Badge variant={connected ? "success" : "secondary"}>
            {connected ? "已连接" : "未连接"}
          </Badge>
        }
      />
      <SettingsLayout
        aside={
          <HelpCard>
            <p>VPN 服务器地址、用户名与密码由服务提供商给出。</p>
            <p>L2TP 通常具有更好的兼容性；PPTP 安全性较低，仅建议用于旧环境。</p>
          </HelpCard>
        }
      >
        <SettingsCard title="隧道配置" description="连接请求由设备蜂窝网络发起" loading={loading}>
          <form onSubmit={connect} className="grid gap-5">
            <FormField label="服务器地址" htmlFor="vpn-server">
              <Input
                id="vpn-server"
                value={form.server}
                onChange={(event) => setForm((value) => ({ ...value, server: event.target.value }))}
                placeholder="vpn.example.com 或 IP 地址"
              />
            </FormField>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="用户名" htmlFor="vpn-user">
                <Input
                  id="vpn-user"
                  value={form.username}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, username: event.target.value }))
                  }
                />
              </FormField>
              <FormField label="密码" htmlFor="vpn-password">
                <Input
                  id="vpn-password"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, password: event.target.value }))
                  }
                />
              </FormField>
            </div>
            <FormField label="协议类型" htmlFor="vpn-type">
              <NativeSelectWrap>
                <Select
                  id="vpn-type"
                  value={form.type}
                  onChange={(event) => setForm((value) => ({ ...value, type: event.target.value }))}
                >
                  <option value="l2tp">L2TP · 第二层隧道协议</option>
                  <option value="pptp">PPTP · 点对点隧道协议</option>
                </Select>
              </NativeSelectWrap>
            </FormField>
            <div className="flex flex-wrap justify-end gap-2">
              {connected ? (
                <Button type="button" variant="destructive" loading={loading} onClick={disconnect}>
                  <X />
                  断开 VPN
                </Button>
              ) : (
                <Button type="submit" loading={loading}>
                  <ShieldCheck />
                  连接 VPN
                </Button>
              )}
            </div>
          </form>
        </SettingsCard>
      </SettingsLayout>
    </div>
  );
}

interface ApnProfile {
  index: number;
  name: string;
  apn: string;
  dial: string;
  auth: string;
  username: string;
  password: string;
  pdp: string;
}

function parseProfile(raw: string, index: number): ApnProfile {
  const parts = (raw || "").split("($)");
  return {
    index,
    name: parts[0] || "",
    apn: parts[1] || "",
    dial: parts[3] || "*99#",
    auth: parts[4] || "",
    username: parts[5] || "",
    password: parts[6] || "",
    pdp: parts[7] || "IP",
  };
}

const emptyProfile: ApnProfile = {
  index: -1,
  name: "",
  apn: "",
  dial: "*99#",
  auth: "",
  username: "",
  password: "",
  pdp: "IP",
};

export function ApnPage() {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("auto");
  const [currentName, setCurrentName] = useState("");
  const [profiles, setProfiles] = useState<ApnProfile[]>([]);
  const [selected, setSelected] = useState(0);
  const [adding, setAdding] = useState(false);
  const [profile, setProfile] = useState<ApnProfile>(emptyProfile);
  const confirm = useConfirm();

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const fields = [
        ...Array.from({ length: 20 }, (_, index) => `APN_config${index}`),
        "apn_auto_config",
        "m_profile_name",
        "profile_name",
        "apn_mode",
        "Current_index",
      ];
      const data = await getValues(fields);
      const nextProfiles = Array.from({ length: 20 }, (_, index) =>
        parseProfile(data[`APN_config${index}`], index),
      ).filter((item) => item.name);
      const autoProfile = parseProfile(data.apn_auto_config, -1);
      const nextMode = data.apn_mode || "auto";
      setMode(nextMode);
      setCurrentName(data.m_profile_name || data.profile_name || autoProfile.name);
      setProfiles(nextProfiles);
      if (nextMode === "auto") {
        setProfile(autoProfile);
      } else {
        const currentIndex = Math.max(0, Number(data.Current_index || 0));
        const found = nextProfiles.find((item) => item.index === currentIndex) || nextProfiles[0];
        if (found) {
          setSelected(found.index);
          setProfile(found);
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "APN 配置读取失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  function selectProfile(index: number) {
    setSelected(index);
    const found = profiles.find((item) => item.index === index);
    if (found) setProfile(found);
  }

  async function apply() {
    setLoading(true);
    try {
      if (mode === "auto") {
        await submitDevice(
          postApi({ goformId: "APN_PROC_EX", apn_mode: "auto" }),
          "APN 已切换为自动获取",
        );
      } else {
        const accepted = await confirm({
          title: "应用此 APN 配置？",
          description: "蜂窝网络会短暂断开，配置切换完成后将自动重新连接。",
          confirmLabel: "断开并应用",
        });
        if (!accepted) return;
        await submitDevice(
          postApi({
            goformId: "DISCONNECT_NETWORK",
            notCallback: "true",
          }),
          "蜂窝网络已断开",
        );
        await submitDevice(
          postApi({
            goformId: "APN_PROC_EX",
            apn_action: "set_default",
            apn_mode: "manual",
            set_default_flag: "manual",
            pdp_type: profile.pdp,
            index: profile.index,
          }),
          "APN 配置已应用",
        );
        await sleep(1500);
        await submitDevice(
          postApi({ goformId: "CONNECT_NETWORK", notCallback: "true" }),
          "蜂窝网络正在重新连接",
        );
      }
      await loadProfiles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "APN 设置失败");
    } finally {
      setLoading(false);
    }
  }

  async function addProfile() {
    if (!profile.name || profile.name === "Default" || !profile.apn) {
      toast.error("配置名称与 APN 不能为空，名称不能使用 Default");
      return;
    }
    if (profiles.some((item) => item.name === profile.name)) {
      toast.error("配置文件名称不能重复");
      return;
    }
    const freeIndex = Array.from({ length: 20 }, (_, index) => index).find(
      (index) => !profiles.some((item) => item.index === index),
    );
    if (freeIndex === undefined) {
      toast.error("设备 APN 配置槽已满");
      return;
    }
    setLoading(true);
    try {
      const common = {
        goformId: "APN_PROC_EX",
        apn_action: "save",
        apn_mode: "manual",
        profile_name: profile.name,
        wan_dial: profile.dial || "*99#",
        pdp_type: profile.pdp,
        pdp_select: "auto",
        index: freeIndex,
      };
      const ipv4 =
        profile.pdp === "IP" || profile.pdp === "IPv4v6"
          ? {
              wan_apn: profile.apn,
              ppp_auth_mode: profile.auth || "none",
              ppp_username: profile.username,
              ppp_passwd: profile.password,
            }
          : {};
      const ipv6 =
        profile.pdp === "IPv6" || profile.pdp === "IPv4v6"
          ? {
              ipv6_wan_apn: profile.apn,
              ipv6_ppp_auth_mode: profile.auth || "none",
              ipv6_ppp_username: profile.username,
              ipv6_ppp_passwd: profile.password,
            }
          : {};
      await submitDevice(postApi({ ...common, ...ipv4, ...ipv6 }), "APN 配置已新增");
      setAdding(false);
      await loadProfiles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "新增失败");
    } finally {
      setLoading(false);
    }
  }

  async function deleteProfile() {
    if (profile.index <= 0) {
      toast.error("默认配置不能删除");
      return;
    }
    if (
      !(await confirm({
        title: "删除 APN 配置？",
        description: `配置“${profile.name}”将从设备中永久删除。`,
        confirmLabel: "删除配置",
        destructive: true,
      }))
    )
      return;
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "APN_PROC_EX",
          apn_action: "delete",
          index: profile.index,
          apn_mode: "manual",
        }),
        "APN 配置已删除",
      );
      await loadProfiles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setLoading(false);
    }
  }

  const editable = adding;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cellular profile"
        title="APN 设置"
        description="管理运营商接入点配置，支持自动识别、手动配置、新增、应用与删除。"
        actions={<Badge variant="secondary">当前：{currentName || "未识别"}</Badge>}
      />
      <SettingsLayout
        aside={
          <HelpCard>
            <p>如果运营商未提供固定 APN，建议保持自动模式。</p>
            <p>PDP 类型决定使用 IPv4、IPv6 或双栈；鉴权参数由运营商提供。</p>
            <p>应用手动配置时，蜂窝网络会先断开再重新连接。</p>
          </HelpCard>
        }
      >
        <SettingsCard
          title="接入点配置"
          description="设备最多保存 20 个 APN 配置"
          loading={loading}
        >
          <div className="grid gap-5">
            <FormField label="配置模式" htmlFor="apn-mode">
              <NativeSelectWrap>
                <Select
                  id="apn-mode"
                  value={mode}
                  onChange={(event) => {
                    setMode(event.target.value);
                    setAdding(false);
                    if (event.target.value === "manual" && profiles[0]) {
                      selectProfile(profiles[0].index);
                    }
                  }}
                >
                  <option value="auto">自动获取</option>
                  <option value="manual">手动配置</option>
                </Select>
              </NativeSelectWrap>
            </FormField>

            {mode === "manual" ? (
              <FormField label="配置文件" htmlFor="apn-profile">
                <div className="flex gap-2">
                  <NativeSelectWrap>
                    <Select
                      id="apn-profile"
                      value={selected}
                      disabled={adding}
                      onChange={(event) => selectProfile(Number(event.target.value))}
                    >
                      {profiles.map((item) => (
                        <option key={item.index} value={item.index}>
                          {item.name}
                        </option>
                      ))}
                    </Select>
                  </NativeSelectWrap>
                  <Button
                    type="button"
                    variant={adding ? "secondary" : "outline"}
                    onClick={() => {
                      setAdding((value) => !value);
                      if (!adding) setProfile(emptyProfile);
                      else if (profiles[0]) selectProfile(profiles[0].index);
                    }}
                  >
                    {adding ? <X /> : <Plus />}
                    {adding ? "取消" : "新增"}
                  </Button>
                </div>
              </FormField>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="PDP 类型" htmlFor="pdp">
                <NativeSelectWrap>
                  <Select
                    id="pdp"
                    value={profile.pdp}
                    disabled={!editable || mode === "auto"}
                    onChange={(event) =>
                      setProfile((value) => ({ ...value, pdp: event.target.value }))
                    }
                  >
                    <option value="IP">IPv4</option>
                    <option value="IPv6">IPv6</option>
                    <option value="IPv4v6">IPv4 / IPv6 双栈</option>
                  </Select>
                </NativeSelectWrap>
              </FormField>
              <FormField label="配置名称" htmlFor="profile-name">
                <Input
                  id="profile-name"
                  value={profile.name}
                  disabled={!editable || mode === "auto"}
                  onChange={(event) =>
                    setProfile((value) => ({ ...value, name: event.target.value }))
                  }
                />
              </FormField>
            </div>
            <FormField label="APN" htmlFor="apn">
              <Input
                id="apn"
                value={profile.apn}
                disabled={!editable || mode === "auto"}
                onChange={(event) => setProfile((value) => ({ ...value, apn: event.target.value }))}
                placeholder="例如 3gnet"
              />
            </FormField>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="鉴权方式" htmlFor="apn-auth">
                <NativeSelectWrap>
                  <Select
                    id="apn-auth"
                    value={profile.auth}
                    disabled={!editable || mode === "auto"}
                    onChange={(event) =>
                      setProfile((value) => ({ ...value, auth: event.target.value }))
                    }
                  >
                    <option value="">NONE</option>
                    <option value="chap">CHAP</option>
                    <option value="pap">PAP</option>
                    <option value="pap_chap">PAP / CHAP</option>
                  </Select>
                </NativeSelectWrap>
              </FormField>
              <FormField label="拨号号码" htmlFor="dial">
                <Input id="dial" value={profile.dial} disabled />
              </FormField>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="用户名" htmlFor="apn-user">
                <Input
                  id="apn-user"
                  value={profile.username}
                  disabled={!editable || mode === "auto"}
                  onChange={(event) =>
                    setProfile((value) => ({ ...value, username: event.target.value }))
                  }
                />
              </FormField>
              <FormField label="密码" htmlFor="apn-password">
                <Input
                  id="apn-password"
                  type="password"
                  value={profile.password}
                  disabled={!editable || mode === "auto"}
                  onChange={(event) =>
                    setProfile((value) => ({ ...value, password: event.target.value }))
                  }
                />
              </FormField>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {adding ? (
                <Button type="button" onClick={addProfile} loading={loading}>
                  <Plus />
                  添加配置
                </Button>
              ) : (
                <>
                  {mode === "manual" && profile.index > 0 ? (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={deleteProfile}
                      loading={loading}
                    >
                      <Trash2 />
                      删除
                    </Button>
                  ) : null}
                  <Button type="button" onClick={apply} loading={loading}>
                    <Save />
                    应用配置
                  </Button>
                </>
              )}
            </div>
          </div>
        </SettingsCard>
      </SettingsLayout>
    </div>
  );
}

const tagMeta: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "secondary" }
> = {
  "0": { label: "已接收", variant: "default" },
  "1": { label: "未读", variant: "success" },
  "2": { label: "已发送", variant: "warning" },
  "4": { label: "草稿", variant: "secondary" },
};

export function MessagesPage() {
  const storeMessages = useDeviceStore((state) => state.snapshot.messages);
  const [tab, setTab] = useState<"device" | "sim" | "settings">("device");
  const [messages, setMessages] = useState<SmsMessage[]>(storeMessages);
  const [simMessages, setSimMessages] = useState<SmsMessage[]>([]);
  const [capacity, setCapacity] = useState({ used: 0, total: 0, simUsed: 0, simTotal: 0 });
  const [settings, setSettings] = useState({
    validity: "twelve_hours",
    center: "",
    report: "0",
  });
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<SmsMessage | null>(null);
  const [number, setNumber] = useState("");
  const [content, setContent] = useState("");
  const confirm = useConfirm();

  useEffect(() => {
    setMessages(storeMessages.filter((message) => message.number !== "Config"));
  }, [storeMessages]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [capacityData, nextMessages, centerData, simData] = await Promise.all([
        getApi("cmd=sms_capacity_info", true),
        getMessages(),
        getValues(["sms_center_num", "sms_validity", "sms_delivery_report"], true).catch(
          () => ({}) as Record<string, string>,
        ),
        getApi(
          "cmd=sms_data_total&page=0&data_per_page=500&mem_store=0&tags=10&order_by=order+by+id+desc",
          true,
        ).catch(() => ({ messages: [] as unknown as SmsMessage[] })),
      ]);
      setCapacity({
        total: Number(capacityData.sms_nv_total || 0),
        used:
          Number(capacityData.sms_nv_draftbox_total || 0) +
          Number(capacityData.sms_nv_rev_total || 0) +
          Number(capacityData.sms_nv_send_total || 0),
        simTotal: Number(capacityData.sms_sim_total || 0),
        simUsed:
          Number(capacityData.sms_sim_draftbox_total || 0) +
          Number(capacityData.sms_sim_rev_total || 0) +
          Number(capacityData.sms_sim_send_total || 0),
      });
      setMessages(nextMessages.filter((message) => message.number !== "Config"));
      const simList = ((simData.messages || []) as unknown as SmsMessage[]).filter(
        (message) => message.number !== "Config",
      );
      setSimMessages(simList);
      const center = centerData as Record<string, string>;
      setSettings({
        validity: center.sms_validity || "twelve_hours",
        center: center.sms_center_num || "",
        report: center.sms_delivery_report || "0",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "短信读取失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "SET_MESSAGE_CENTER",
          save_time: settings.validity,
          MessageCenter: settings.center,
          status_save: settings.report,
          save_location: "native",
          notCallback: "true",
        }),
        "短信中心设置已保存",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  function compose() {
    setSelectedMessage(null);
    setNumber("");
    setContent("");
    setDialogOpen(true);
  }

  async function openMessage(message: SmsMessage) {
    setSelectedMessage(message);
    setNumber(message.number);
    setContent(message.tag === "4" ? message.content : "");
    setDialogOpen(true);
    if (message.tag === "1") {
      try {
        await postApi({ tag: "0", msg_id: `${message.id};`, goformId: "SET_MSG_READ" });
      } catch {
        toast.warning("短信已打开，但设备未确认已读状态");
      }
    }
  }

  async function sendMessage() {
    if (number.length <= 3 || !content.trim()) {
      toast.error("请输入有效号码与短信内容");
      return;
    }
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          ID: "-1",
          notCallback: "true",
          goformId: "SEND_SMS",
          SMSNumber: number,
          encode_type: "GSM7_default",
          sms_time: smsTime(),
          SMSMessage: asciiToHex(content),
        }),
        "短信已提交发送",
      );
      setDialogOpen(false);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "发送失败");
    } finally {
      setLoading(false);
    }
  }

  async function saveDraft() {
    if (number.length <= 3 || !content.trim()) {
      toast.error("号码与草稿内容不能为空");
      return;
    }
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          Index: "-1",
          draft_group_id: "",
          notCallback: "true",
          goformId: "SAVE_SMS",
          SMSNumber: number,
          encode_type: "GSM7_default",
          sms_time: smsTime(),
          SMSMessage: asciiToHex(content),
        }),
        "草稿已保存",
      );
      setDialogOpen(false);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function deleteMessage(message: SmsMessage) {
    if (
      !(await confirm({
        title: "删除这条短信？",
        description: `来自 ${message.number || "未知号码"} 的短信将从设备中删除。`,
        confirmLabel: "删除短信",
        destructive: true,
      }))
    )
      return;
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          msg_id: `${message.id};`,
          notCallback: "true",
          goformId: "DELETE_SMS",
        }),
        "短信已删除",
      );
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setLoading(false);
    }
  }

  const list = tab === "sim" ? simMessages : messages;
  const tabs = [
    { id: "device" as const, label: "设备侧" },
    { id: "sim" as const, label: "SIM 卡侧" },
    { id: "settings" as const, label: "设置" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SMS center"
        title="短信中心"
        description="设备侧与 SIM 卡侧短信、中心号码与发送报告设置。"
        actions={
          <>
            <Button variant="outline" onClick={refresh} loading={loading}>
              <RefreshCw />
              刷新
            </Button>
            {tab !== "settings" ? (
              <Button onClick={compose}>
                <Plus />
                新建短信
              </Button>
            ) : null}
          </>
        }
      />
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="短信分区">
        {tabs.map((item) => (
          <Button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            variant={tab === item.id ? "default" : "outline"}
            size="sm"
            className="min-h-11"
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      {tab === "settings" ? (
        <SettingsCard title="短信设置" description="对应原厂短信中心号与有效期" loading={loading}>
          <form onSubmit={saveSettings} className="grid max-w-xl gap-5">
            <FormField label="有效期" htmlFor="sms-validity">
              <NativeSelectWrap>
                <Select
                  id="sms-validity"
                  value={settings.validity}
                  onChange={(event) =>
                    setSettings((value) => ({ ...value, validity: event.target.value }))
                  }
                >
                  <option value="twelve_hours">12 小时</option>
                  <option value="one_day">1 天</option>
                  <option value="one_week">1 周</option>
                  <option value="largest">最长</option>
                </Select>
              </NativeSelectWrap>
            </FormField>
            <FormField label="中心号码" htmlFor="sms-center">
              <Input
                id="sms-center"
                value={settings.center}
                onChange={(event) =>
                  setSettings((value) => ({ ...value, center: event.target.value }))
                }
              />
            </FormField>
            <FormField label="发送报告">
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={settings.report === "1"}
                    onChange={() => setSettings((value) => ({ ...value, report: "1" }))}
                  />
                  启用
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={settings.report !== "1"}
                    onChange={() => setSettings((value) => ({ ...value, report: "0" }))}
                  />
                  关闭
                </label>
              </div>
            </FormField>
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <Save />
                保存设置
              </Button>
            </div>
          </form>
        </SettingsCard>
      ) : (
        <SettingsCard
          title={tab === "sim" ? "SIM 侧短信" : "设备侧短信"}
          description={
            tab === "sim"
              ? `存储空间 ${capacity.simUsed} / ${capacity.simTotal || "—"}`
              : `存储空间 ${capacity.used} / ${capacity.total || "—"}`
          }
          loading={loading}
        >
          {list.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="pb-3 font-medium">号码</th>
                    <th className="pb-3 font-medium">类型</th>
                    <th className="pb-3 font-medium">内容</th>
                    <th className="pb-3 font-medium">时间</th>
                    <th className="pb-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.map((message) => {
                    const meta = tagMeta[message.tag] || {
                      label: "未知",
                      variant: "secondary" as const,
                    };
                    return (
                      <tr key={`${tab}-${message.id}`}>
                        <td className="py-3.5 font-mono text-xs">{message.number}</td>
                        <td className="py-3.5">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </td>
                        <td className="max-w-[360px] truncate py-3.5">{message.content}</td>
                        <td className="py-3.5 text-xs text-muted-foreground">{message.date}</td>
                        <td className="py-3.5">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openMessage(message)}>
                              查看 / 回复
                            </Button>
                            {tab === "device" ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => deleteMessage(message)}
                                aria-label="删除短信"
                              >
                                <Trash2 />
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="短信箱为空"
              description="收到或发送短信后，会在这里按时间显示。"
              action={
                <Button variant="outline" onClick={compose}>
                  <MessageSquareText />
                  发送第一条短信
                </Button>
              }
            />
          )}
        </SettingsCard>
      )}

      <Dialog open={dialogOpen} onClose={setDialogOpen} className="relative z-[75]">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm transition data-closed:opacity-0"
        />
        <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
          <DialogPanel
            transition
            className="w-full max-w-xl rounded-2xl border border-border bg-card p-5 shadow-2xl transition data-closed:translate-y-3 data-closed:scale-95 data-closed:opacity-0"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="font-semibold">
                  {selectedMessage ? "短信详情" : "新建短信"}
                </DialogTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  最多输入 765 个字符，发送编码由设备处理。
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDialogOpen(false)}
                aria-label="关闭短信窗口"
              >
                <X />
              </Button>
            </div>
            <div className="mt-6 grid gap-5">
              <FormField label="号码" htmlFor="sms-number">
                <Input
                  id="sms-number"
                  inputMode="tel"
                  value={number}
                  onChange={(event) => setNumber(event.target.value)}
                />
              </FormField>
              {selectedMessage && selectedMessage.tag !== "4" ? (
                <FormField label="原短信">
                  <Textarea value={selectedMessage.content} readOnly className="bg-muted/40" />
                </FormField>
              ) : null}
              <FormField
                label={selectedMessage && selectedMessage.tag !== "4" ? "回复内容" : "短信内容"}
              >
                <Textarea
                  maxLength={765}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="输入短信内容"
                  className="min-h-32"
                />
                <p className="text-right text-xs text-muted-foreground">{content.length} / 765</p>
              </FormField>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={saveDraft} loading={loading}>
                <FilePenLine />
                保存草稿
              </Button>
              <Button onClick={sendMessage} loading={loading}>
                <Send />
                发送短信
              </Button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}

export function ExternalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [input, setInput] = useState(searchParams.get("url") || "");
  const url = searchParams.get("url") || "";

  function open(event: React.FormEvent) {
    event.preventDefault();
    if (!input) {
      toast.error("请输入要加载的页面地址");
      return;
    }
    try {
      const parsed = new URL(input, window.location.href);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      setSearchParams({ url: parsed.toString() });
    } catch {
      toast.error("请输入有效的 HTTP 或 HTTPS 地址");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Embedded page"
        title="外部页面"
        description="在控制台中嵌入设备扩展页面或同一局域网内的管理工具。"
      />
      <SettingsCard title="页面地址" description="目标网站可能会通过安全策略阻止嵌入">
        <form onSubmit={open} className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="http://192.168.0.1/example.html"
          />
          <Button type="submit">
            <ExternalLink />
            打开页面
          </Button>
        </form>
      </SettingsCard>
      {url ? (
        <div className="h-[calc(100vh-280px)] min-h-[520px] overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <iframe src={url} title="外部设备页面" className="size-full border-0" />
        </div>
      ) : (
        <EmptyState title="尚未加载页面" description="输入页面地址后，内容会显示在这里。" />
      )}
    </div>
  );
}
