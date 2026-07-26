import {
  Ban,
  Gauge,
  Laptop,
  PencilLine,
  RadioTower,
  RefreshCw,
  Router,
  Save,
  Smartphone,
  Wifi,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState, HelpCard, PageHeader, SettingsCard, SettingsLayout } from "@/components/page";
import {
  Badge,
  Button,
  FormField,
  Input,
  NativeSelectWrap,
  Select,
  Switch,
} from "@/components/ui/primitives";
import { getValues, getWifiClients, postApi } from "@/features/device/api";
import { refreshDeviceInfo } from "@/features/device/runtime";
import { useDeviceStore } from "@/features/device/store";
import { useConfirm } from "@/features/feedback/confirm-provider";
import {
  formatBytes,
  formatDuration,
  isIpv4,
  isPoolValid,
  resultSucceeded,
  safeAtob,
  safeBtoa,
} from "@/lib/utils";

async function requireSuccess(task: Promise<Record<string, string>>, successMessage: string) {
  const result = await task;
  if (!resultSucceeded(result)) throw new Error("设备未接受此次设置");
  toast.success(successMessage);
  return result;
}

function parseBlackList(macList = "", hostnameList = "") {
  const macs = macList
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
  const hostnames = hostnameList.split(";");
  return macs.map((mac, index) => ({
    mac,
    hostname: (hostnames[index] || "").trim() || "未知设备",
  }));
}

function cipherForSecurity(security: string) {
  if (security === "WPA2PSK" || security === "WPA3Personal" || security === "WPA2WPA3") return "1";
  if (security === "WPAPSKWPA2PSK" || security === "WPAPSK") return "2";
  return "1";
}

export function QuickWifiPage() {
  const info = useDeviceStore((state) => state.snapshot.info);
  const network = useDeviceStore((state) => state.snapshot.network);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    ssid: "",
    password: "",
    security: "WPA2PSK",
    broadcast: "broadcast",
    maxClients: "10",
    showSsidOnLcd: true,
    showQrcode: true,
    apIsolation: false,
  });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await getValues(
          [
            "SSID1",
            "m_SSID",
            "AuthMode",
            "m_AuthMode",
            "HideSSID",
            "m_HideSSID",
            "WPAPSK1_encode",
            "m_WPAPSK1_encode",
            "MAX_Access_num",
            "show_ssid_on_lcd",
            "show_qrcode_flag",
            "m_show_qrcode_flag",
            "NoForwarding",
            "EncrypType",
          ],
          true,
        );
        if (!active) return;
        const ssid = data.SSID1 || data.m_SSID || network.SSID1 || info.SSID1 || info.m_SSID || "";
        const password = safeAtob(
          data.WPAPSK1_encode ||
            data.m_WPAPSK1_encode ||
            info.WPAPSK1_encode ||
            info.m_WPAPSK1_encode,
        );
        const security =
          data.AuthMode || data.m_AuthMode || info.AuthMode || info.m_AuthMode || "WPA2PSK";
        const hidden = data.HideSSID || data.m_HideSSID || info.HideSSID || info.m_HideSSID;
        const lcd = data.show_ssid_on_lcd;
        setForm({
          ssid,
          password,
          security,
          broadcast: hidden === "1" ? "hidden" : "broadcast",
          maxClients: data.MAX_Access_num || info.MAX_Access_num || "10",
          showSsidOnLcd: lcd !== "no" && lcd !== "0",
          showQrcode: (data.show_qrcode_flag || data.m_show_qrcode_flag || "1") === "1",
          apIsolation: data.NoForwarding === "1",
        });
      } catch {
        const ssid = network.SSID1 || info.SSID1 || info.m_SSID;
        if (!ssid || !active) return;
        setForm((current) => ({
          ...current,
          ssid,
          password: safeAtob(info.WPAPSK1_encode || info.m_WPAPSK1_encode),
          security: info.AuthMode || info.m_AuthMode || "WPA2PSK",
          broadcast: (info.HideSSID || info.m_HideSSID) === "1" ? "hidden" : "broadcast",
          maxClients: info.MAX_Access_num || current.maxClients,
        }));
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [
    info.AuthMode,
    info.HideSSID,
    info.MAX_Access_num,
    info.SSID1,
    info.WPAPSK1_encode,
    info.m_AuthMode,
    info.m_HideSSID,
    info.m_SSID,
    info.m_WPAPSK1_encode,
    network.SSID1,
  ]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const ssidPattern =
      /^[a-zA-Z0-9!#()+\-./%=?@^_{|}~](?:[a-zA-Z0-9!#()+\-./%=?@^_{|}~ ]{0,30}[a-zA-Z0-9!#()+\-./%=?@^_{|}~])?$/;
    if (!ssidPattern.test(form.ssid)) {
      toast.error("SSID 需为 1–32 位有效字符，且首尾不能有空格");
      return;
    }
    if (form.security !== "OPEN" && !/^[0-9a-zA-Z!#()+\-./%=?@^_{|}~]{4,63}$/.test(form.password)) {
      toast.error("Wi-Fi 密码需为 4–63 位有效字符");
      return;
    }
    const maxClients = Number(form.maxClients);
    if (!Number.isFinite(maxClients) || maxClients < 1 || maxClients > 32) {
      toast.error("最大接入数需在 1–32 之间");
      return;
    }
    setLoading(true);
    try {
      const cipher = cipherForSecurity(form.security);
      const payload: Record<string, string> = {
        goformId: "SET_WIFI_SSID1_SETTINGS",
        ssid: form.ssid,
        broadcastSsidEnabled: form.broadcast === "broadcast" ? "0" : "1",
        MAX_Access_num: String(maxClients),
        security_mode: form.security,
        cipher,
        NoForwarding: form.apIsolation ? "1" : "0",
        show_qrcode_flag: form.showQrcode ? "1" : "0",
        show_ssid_on_lcd: form.showSsidOnLcd ? "1" : "0",
      };
      if (form.security !== "OPEN") {
        const encoded = safeBtoa(form.password);
        payload.WPAPSK1 = encoded;
        payload.passphrase = encoded;
        payload.security_shared_mode = cipher;
      }
      await requireSuccess(postApi(payload), "Wi-Fi 配置已提交，已连接设备可能需要重新连接");
      await refreshDeviceInfo();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "设置失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Wireless network"
        title="Wi-Fi 快速设置"
        description="修改热点名称、广播、安全、最大接入数、LCD/二维码显示与 AP 隔离。保存后客户端可能需要重新连接。"
      />
      <SettingsLayout
        aside={
          <HelpCard>
            <p>
              <strong className="text-foreground">网络名称：</strong>支持 1–32
              位字符，首尾不能使用空格。
            </p>
            <p>
              <strong className="text-foreground">SSID 广播：</strong>
              隐藏后，新设备需要手动输入网络名称。
            </p>
            <p>
              <strong className="text-foreground">AP 隔离：</strong>
              开启后，接入客户端之间不能互相访问。
            </p>
          </HelpCard>
        }
      >
        <SettingsCard
          title="热点配置"
          description={`当前热点：${form.ssid || network.SSID1 || info.m_SSID || "未读取"}`}
          loading={loading}
        >
          <form onSubmit={submit} className="grid gap-5">
            <FormField label="网络名称（SSID）" htmlFor="ssid">
              <Input
                id="ssid"
                value={form.ssid}
                maxLength={32}
                onChange={(event) => setForm((value) => ({ ...value, ssid: event.target.value }))}
                placeholder="输入 Wi-Fi 名称"
              />
            </FormField>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="SSID 广播" htmlFor="broadcast">
                <NativeSelectWrap>
                  <Select
                    id="broadcast"
                    value={form.broadcast}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, broadcast: event.target.value }))
                    }
                  >
                    <option value="broadcast">广播网络名称</option>
                    <option value="hidden">隐藏网络名称</option>
                  </Select>
                </NativeSelectWrap>
              </FormField>
              <FormField label="安全模式" htmlFor="security">
                <NativeSelectWrap>
                  <Select
                    id="security"
                    value={form.security}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, security: event.target.value }))
                    }
                  >
                    <option value="OPEN">开放网络（不推荐）</option>
                    <option value="WPA2PSK">WPA2 (AES)-PSK</option>
                    <option value="WPAPSKWPA2PSK">WPA/WPA2 混合模式</option>
                  </Select>
                </NativeSelectWrap>
              </FormField>
            </div>
            <FormField
              label="Wi-Fi 密码"
              htmlFor="wifi-password"
              description={
                form.security === "OPEN"
                  ? "开放网络无需密码。"
                  : "建议使用 8 位以上的字母与数字组合。"
              }
            >
              <Input
                id="wifi-password"
                type="password"
                value={form.password}
                disabled={form.security === "OPEN"}
                onChange={(event) =>
                  setForm((value) => ({ ...value, password: event.target.value }))
                }
                placeholder="输入 Wi-Fi 密码"
              />
            </FormField>
            <FormField
              label="最大接入数"
              htmlFor="max-clients"
              description="允许同时连接热点的设备数量。"
            >
              <Input
                id="max-clients"
                type="number"
                min="1"
                max="32"
                value={form.maxClients}
                onChange={(event) =>
                  setForm((value) => ({ ...value, maxClients: event.target.value }))
                }
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2.5">
                <span className="text-sm">LCD 显示 SSID</span>
                <Switch
                  label="LCD 显示 SSID"
                  checked={form.showSsidOnLcd}
                  onCheckedChange={(checked) =>
                    setForm((value) => ({ ...value, showSsidOnLcd: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2.5">
                <span className="text-sm">显示连接二维码</span>
                <Switch
                  label="显示连接二维码"
                  checked={form.showQrcode}
                  onCheckedChange={(checked) =>
                    setForm((value) => ({ ...value, showQrcode: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2.5">
                <span className="text-sm">AP 隔离</span>
                <Switch
                  label="AP 隔离"
                  checked={form.apIsolation}
                  onCheckedChange={(checked) =>
                    setForm((value) => ({ ...value, apIsolation: checked }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <Save />
                应用配置
              </Button>
            </div>
          </form>
        </SettingsCard>
      </SettingsLayout>
    </div>
  );
}

export function WifiClientsPage() {
  const storeClients = useDeviceStore((state) => state.snapshot.wifiClients);
  const [clients, setClients] = useState(storeClients);
  const [blacklist, setBlacklist] = useState<{ mac: string; hostname: string }[]>([]);
  const [aclMode, setAclMode] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingMac, setEditingMac] = useState<string | null>(null);
  const [hostnameDraft, setHostnameDraft] = useState("");
  const confirm = useConfirm();

  const loadBlacklist = useCallback(async () => {
    const data = await getValues(
      ["ACL_mode", "wifi_mac_black_list", "wifi_hostname_black_list"],
      true,
    );
    setAclMode(data.ACL_mode || "");
    setBlacklist(parseBlackList(data.wifi_mac_black_list, data.wifi_hostname_black_list));
  }, []);

  useEffect(() => setClients(storeClients), [storeClients]);

  useEffect(() => {
    void loadBlacklist().catch((error) =>
      toast.error(error instanceof Error ? error.message : "黑名单读取失败"),
    );
  }, [loadBlacklist]);

  async function refresh() {
    setLoading(true);
    try {
      const [nextClients] = await Promise.all([getWifiClients(), loadBlacklist()]);
      setClients(nextClients);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "读取失败");
    } finally {
      setLoading(false);
    }
  }

  async function blockClient(mac: string, hostname: string) {
    if (!mac) {
      toast.error("无法识别该设备的 MAC 地址");
      return;
    }
    if (
      !(await confirm({
        title: "屏蔽此设备？",
        description: `${hostname || mac} 将被加入黑名单，并断开当前连接。`,
        confirmLabel: "屏蔽",
        destructive: true,
      }))
    )
      return;
    setLoading(true);
    try {
      await requireSuccess(postApi({ goformId: "ADD_DEVICE", mac }), "设备已屏蔽");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "屏蔽失败");
    } finally {
      setLoading(false);
    }
  }

  async function unblockClient(mac: string) {
    if (!mac) return;
    setLoading(true);
    try {
      await requireSuccess(postApi({ goformId: "DEL_DEVICE", mac }), "已解除屏蔽");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "解除失败");
    } finally {
      setLoading(false);
    }
  }

  async function saveHostname(mac: string) {
    const hostname = hostnameDraft.trim();
    if (!mac || !hostname) {
      toast.error("主机名不能为空");
      return;
    }
    setLoading(true);
    try {
      await requireSuccess(postApi({ goformId: "EDIT_HOSTNAME", mac, hostname }), "主机名已更新");
      setEditingMac(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "主机名修改失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Connected clients"
        title="Wi-Fi 连接设备"
        description="查看在线客户端，屏蔽或解除黑名单设备，并可编辑主机名。"
        actions={
          <Button variant="outline" onClick={refresh} loading={loading}>
            <RefreshCw />
            刷新列表
          </Button>
        }
      />
      <SettingsCard
        title="在线客户端"
        description={`当前共 ${clients.length} 台设备`}
        actions={<Badge variant="success">{clients.length} online</Badge>}
        loading={loading}
      >
        {clients.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="pb-3 font-medium">设备</th>
                  <th className="pb-3 font-medium">IP 地址</th>
                  <th className="pb-3 font-medium">MAC 地址</th>
                  <th className="pb-3 font-medium">连接时间</th>
                  <th className="pb-3 font-medium">接收</th>
                  <th className="pb-3 font-medium">发送</th>
                  <th className="pb-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((client) => {
                  const mac = client.mac_addr || "";
                  const editing = editingMac === mac;
                  return (
                    <tr key={mac || `${client.ip_addr}-${client.hostname}`} className="group">
                      <td className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                            {client.dev_type?.toLowerCase().includes("phone") ? (
                              <Smartphone className="size-4" />
                            ) : (
                              <Laptop className="size-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            {editing ? (
                              <Input
                                value={hostnameDraft}
                                onChange={(event) => setHostnameDraft(event.target.value)}
                                className="h-8 max-w-[180px]"
                                aria-label="编辑主机名"
                              />
                            ) : (
                              <>
                                <p className="font-medium">{client.hostname || "未知设备"}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {client.ip_type || "IPv4"}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 font-mono text-xs">{client.ip_addr || "—"}</td>
                      <td className="py-3.5 font-mono text-xs">{mac || "—"}</td>
                      <td className="py-3.5">{formatDuration(client.duration)}</td>
                      <td className="py-3.5">{formatBytes(client.rx)}</td>
                      <td className="py-3.5">{formatBytes(client.tx)}</td>
                      <td className="py-3.5">
                        <div className="flex justify-end gap-1">
                          {editing ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => void saveHostname(mac)}
                              >
                                保存
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setEditingMac(null)}>
                                取消
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="编辑主机名"
                                onClick={() => {
                                  setEditingMac(mac);
                                  setHostnameDraft(client.hostname || "");
                                }}
                              >
                                <PencilLine />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => void blockClient(mac, client.hostname)}
                              >
                                <Ban />
                                屏蔽
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="暂无在线客户端" description="设备连接到热点后，会显示在这里。" />
        )}
      </SettingsCard>

      <SettingsCard
        title="黑名单"
        description={
          aclMode
            ? `ACL 模式 ${aclMode} · 共 ${blacklist.length} 台被屏蔽设备`
            : `共 ${blacklist.length} 台被屏蔽设备`
        }
        loading={loading}
      >
        {blacklist.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="pb-3 font-medium">主机名</th>
                  <th className="pb-3 font-medium">MAC 地址</th>
                  <th className="pb-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {blacklist.map((item) => (
                  <tr key={item.mac}>
                    <td className="py-3.5">{item.hostname}</td>
                    <td className="py-3.5 font-mono text-xs">{item.mac}</td>
                    <td className="py-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void unblockClient(item.mac)}
                      >
                        解除
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="黑名单为空" description="屏蔽在线客户端后，会显示在这里。" />
        )}
      </SettingsCard>
    </div>
  );
}

const coverageOptions = [
  { value: "short_mode", label: "近距离 · 最佳电池续航", icon: Gauge },
  { value: "medium_mode", label: "中距离 · 平衡模式", icon: Wifi },
  { value: "long_mode", label: "远距离 · 最大覆盖", icon: RadioTower },
];

function normalizeClock(value?: string) {
  if (!value) return "00:00";
  if (value.includes(":")) {
    const [hour = "00", minute = "00"] = value.split(":");
    return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  }
  if (value.length >= 4) return `${value.slice(0, 2)}:${value.slice(2, 4)}`;
  return "00:00";
}

export function WifiPerformancePage() {
  const info = useDeviceStore((state) => state.snapshot.info);
  const [coverage, setCoverage] = useState(info.wifi_coverage || "medium_mode");
  const [sleep, setSleep] = useState(info.Sleep_interval || "-1");
  const [tsw, setTsw] = useState({
    openEnable: false,
    closeEnable: false,
    openTime: "08:00",
    closeTime: "23:00",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (info.wifi_coverage) setCoverage(info.wifi_coverage);
    if (info.Sleep_interval) setSleep(info.Sleep_interval);
  }, [info.Sleep_interval, info.wifi_coverage]);

  useEffect(() => {
    getValues(["openEnable", "closeEnable", "openTime", "closeTime"], true)
      .then((data) =>
        setTsw({
          openEnable: data.openEnable === "1",
          closeEnable: data.closeEnable === "1",
          openTime: normalizeClock(data.openTime),
          closeTime: normalizeClock(data.closeTime),
        }),
      )
      .catch(() => {
        /* 部分固件无 TSW 字段，保留默认值 */
      });
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const tasks: Promise<Record<string, string>>[] = [];
      if (coverage !== info.wifi_coverage) {
        tasks.push(postApi({ goformId: "SET_WIFI_COVERAGE", wifi_coverage: coverage }));
      }
      if (sleep !== info.Sleep_interval) {
        tasks.push(postApi({ goformId: "SET_WIFI_SLEEP_INFO", sysIdleTimeToSleep: sleep }));
      }
      const tswPayload: Record<string, string> = {
        goformId: "SAVE_TSW",
        openEnable: tsw.openEnable ? "1" : "0",
        closeEnable: tsw.closeEnable ? "1" : "0",
      };
      if (tsw.openEnable) {
        tswPayload.openTime = tsw.openTime;
        tswPayload.closeTime = tsw.closeTime;
      }
      tasks.push(postApi(tswPayload));

      const results = await Promise.all(tasks);
      if (results.some((result) => !resultSucceeded(result)))
        throw new Error("部分设置未被设备接受");
      await refreshDeviceInfo();
      toast.success("Wi-Fi 性能设置已更新");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "设置失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Radio performance"
        title="Wi-Fi 性能设置"
        description="在无线覆盖与电池续航之间取得平衡，并设置空闲休眠与定时开关。"
      />
      <SettingsLayout
        aside={
          <HelpCard>
            <p>覆盖范围越远，发射功率与能耗通常越高。</p>
            <p>空闲休眠只在没有客户端连接时生效；定时休眠可按每天固定时间开关热点。</p>
          </HelpCard>
        }
      >
        <SettingsCard title="性能策略" description="针对日常携带场景调整热点行为" loading={loading}>
          <form onSubmit={submit} className="space-y-6">
            <div>
              <p className="text-sm font-medium">覆盖范围</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {coverageOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCoverage(option.value)}
                    className={`rounded-xl border p-4 text-left transition ${
                      coverage === option.value
                        ? "border-primary/40 bg-primary/8 ring-2 ring-primary/10"
                        : "border-border bg-background/55 hover:border-primary/25"
                    }`}
                  >
                    <option.icon className="size-5 text-primary" />
                    <p className="mt-3 text-sm font-medium">{option.label}</p>
                  </button>
                ))}
              </div>
            </div>
            <FormField label="自动休眠" htmlFor="sleep">
              <NativeSelectWrap>
                <Select id="sleep" value={sleep} onChange={(event) => setSleep(event.target.value)}>
                  <option value="-1">从不休眠</option>
                  <option value="5">5 分钟</option>
                  <option value="10">10 分钟</option>
                  <option value="20">20 分钟</option>
                  <option value="30">30 分钟</option>
                  <option value="60">1 小时</option>
                  <option value="120">2 小时</option>
                </Select>
              </NativeSelectWrap>
            </FormField>

            <div className="space-y-4 rounded-xl border border-border/70 p-4">
              <div>
                <p className="text-sm font-medium">定时开关（TSW）</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  按每天固定时间唤醒与关闭 Wi-Fi，时间格式为 HH:MM。
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5">
                  <span className="text-sm">启用定时唤醒</span>
                  <Switch
                    label="启用定时唤醒"
                    checked={tsw.openEnable}
                    onCheckedChange={(checked) =>
                      setTsw((value) => ({ ...value, openEnable: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5">
                  <span className="text-sm">启用定时关闭</span>
                  <Switch
                    label="启用定时关闭"
                    checked={tsw.closeEnable}
                    onCheckedChange={(checked) =>
                      setTsw((value) => ({ ...value, closeEnable: checked }))
                    }
                  />
                </div>
              </div>
              {tsw.openEnable ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="唤醒时间" htmlFor="open-time">
                    <Input
                      id="open-time"
                      type="time"
                      value={tsw.openTime}
                      onChange={(event) =>
                        setTsw((value) => ({ ...value, openTime: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="关闭时间" htmlFor="close-time">
                    <Input
                      id="close-time"
                      type="time"
                      value={tsw.closeTime}
                      onChange={(event) =>
                        setTsw((value) => ({ ...value, closeTime: event.target.value }))
                      }
                    />
                  </FormField>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <Save />
                保存性能策略
              </Button>
            </div>
          </form>
        </SettingsCard>
      </SettingsLayout>
    </div>
  );
}

interface LanForm {
  ip: string;
  mask: string;
  dhcp: boolean;
  start: string;
  end: string;
  lease: string;
  dnsManual: boolean;
  dhcpDns: string;
}

const initialLan: LanForm = {
  ip: "",
  mask: "255.255.255.0",
  dhcp: true,
  start: "",
  end: "",
  lease: "24",
  dnsManual: false,
  dhcpDns: "",
};

export function LanSettingsPage() {
  const [form, setForm] = useState<LanForm>(initialLan);
  const [loading, setLoading] = useState(true);
  const confirm = useConfirm();

  useEffect(() => {
    getValues([
      "lan_ipaddr",
      "lan_netmask",
      "mac_address",
      "dhcpEnabled",
      "dhcpStart",
      "dhcpEnd",
      "dhcpLease_hour",
      "dns_manual_enable",
      "dhcpDns",
    ])
      .then((data) =>
        setForm({
          ip: data.lan_ipaddr,
          mask: data.lan_netmask,
          dhcp: data.dhcpEnabled === "1",
          start: data.dhcpStart,
          end: data.dhcpEnd,
          lease: data.dhcpLease_hour,
          dnsManual: data.dns_manual_enable === "1",
          dhcpDns: data.dhcpDns || "",
        }),
      )
      .catch((error) => toast.error(error instanceof Error ? error.message : "读取失败"))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (![form.ip, form.mask].every(isIpv4) || (form.dhcp && !isPoolValid(form.start, form.end))) {
      toast.error("请检查网关、子网掩码与 DHCP 地址池格式");
      return;
    }
    if (form.dnsManual && !isIpv4(form.dhcpDns)) {
      toast.error("请输入有效的主 DNS 地址");
      return;
    }
    const accepted = await confirm({
      title: "应用局域网设置？",
      description: "设备将重启，当前管理连接会暂时中断。网关地址变化后，请使用新地址重新访问。",
      confirmLabel: "应用并重启",
    });
    if (!accepted) return;
    setLoading(true);
    try {
      await requireSuccess(
        postApi({
          goformId: "DNS_SETTING",
          dns_manual_enable: form.dnsManual ? "1" : "0",
          dhcpDns: form.dnsManual ? form.dhcpDns : "",
        }),
        "DNS 设置已更新",
      );
      await requireSuccess(
        postApi(
          form.dhcp
            ? {
                goformId: "DHCP_SETTING",
                lanIp: form.ip,
                lanNetmask: form.mask,
                lanDhcpType: "SERVER",
                dhcpStart: form.start,
                dhcpEnd: form.end,
                dhcpLease: form.lease,
                dhcp_reboot_flag: "1",
              }
            : {
                goformId: "DHCP_SETTING",
                lanIp: form.ip,
                lanNetmask: form.mask,
                lanDhcpType: "DISABLE",
                dhcp_reboot_flag: "1",
              },
        ),
        "局域网设置已提交，设备即将重启",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "设置失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Local network"
        title="局域网与 DHCP"
        description="配置设备管理地址、子网掩码、DHCP 地址池，以及下发给客户端的 DNS。"
      />
      <SettingsLayout
        aside={
          <HelpCard>
            <p>修改网关地址会改变后续访问控制台的地址，并触发设备重启。</p>
            <p>DHCP 地址池必须位于网关所处的子网中，且起始地址不能大于结束地址。</p>
            <p>手动 DNS 会覆盖运营商自动下发的解析服务器。</p>
          </HelpCard>
        }
      >
        <SettingsCard title="局域网参数" description="这些设置会影响所有接入设备" loading={loading}>
          <form onSubmit={submit} className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="网关 IP 地址" htmlFor="lan-ip">
                <Input
                  id="lan-ip"
                  value={form.ip}
                  onChange={(event) => setForm((value) => ({ ...value, ip: event.target.value }))}
                  placeholder="192.168.0.1"
                />
              </FormField>
              <FormField label="子网掩码" htmlFor="lan-mask">
                <Input
                  id="lan-mask"
                  value={form.mask}
                  onChange={(event) => setForm((value) => ({ ...value, mask: event.target.value }))}
                  placeholder="255.255.255.0"
                />
              </FormField>
            </div>
            <FormField label="DHCP 服务" htmlFor="dhcp">
              <NativeSelectWrap>
                <Select
                  id="dhcp"
                  value={form.dhcp ? "1" : "0"}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, dhcp: event.target.value === "1" }))
                  }
                >
                  <option value="1">启用 · 自动分配地址</option>
                  <option value="0">关闭 · 客户端手动配置</option>
                </Select>
              </NativeSelectWrap>
            </FormField>
            {form.dhcp ? (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="地址池开始" htmlFor="dhcp-start">
                    <Input
                      id="dhcp-start"
                      value={form.start}
                      onChange={(event) =>
                        setForm((value) => ({ ...value, start: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="地址池结束" htmlFor="dhcp-end">
                    <Input
                      id="dhcp-end"
                      value={form.end}
                      onChange={(event) =>
                        setForm((value) => ({ ...value, end: event.target.value }))
                      }
                    />
                  </FormField>
                </div>
                <FormField label="租期（小时）" htmlFor="lease">
                  <Input
                    id="lease"
                    type="number"
                    min="1"
                    value={form.lease}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, lease: event.target.value }))
                    }
                  />
                </FormField>
              </>
            ) : null}

            <FormField label="DNS 模式" htmlFor="dns-mode">
              <NativeSelectWrap>
                <Select
                  id="dns-mode"
                  value={form.dnsManual ? "1" : "0"}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      dnsManual: event.target.value === "1",
                    }))
                  }
                >
                  <option value="0">自动 · 使用运营商 DNS</option>
                  <option value="1">手动 · 指定主 DNS</option>
                </Select>
              </NativeSelectWrap>
            </FormField>
            {form.dnsManual ? (
              <FormField label="主 DNS" htmlFor="dhcp-dns" description="下发给客户端的首选 DNS。">
                <Input
                  id="dhcp-dns"
                  value={form.dhcpDns}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, dhcpDns: event.target.value }))
                  }
                  placeholder="例如 223.5.5.5"
                />
              </FormField>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <Router />
                应用局域网设置
              </Button>
            </div>
          </form>
        </SettingsCard>
      </SettingsLayout>
    </div>
  );
}

interface RadioForm {
  mode: string;
  bandwidth: string;
  country: string;
  channel: string;
  band: string;
  maxClients: string;
  maxGuestClients: string;
}

const channels = Array.from({ length: 13 }, (_, index) => {
  const channel = index + 1;
  return { value: String(channel), label: `${2407 + channel * 5} MHz（信道 ${channel}）` };
});

export function WifiRadioPage() {
  const [form, setForm] = useState<RadioForm>({
    mode: "6",
    bandwidth: "1",
    country: "CN",
    channel: "0",
    band: "2.4G",
    maxClients: "10",
    maxGuestClients: "0",
  });
  const [loading, setLoading] = useState(true);
  const confirm = useConfirm();

  useEffect(() => {
    getValues([
      "WirelessMode",
      "wifi_band",
      "CountryCode",
      "MAX_Access_num",
      "m_MAX_Access_num",
      "Channel",
      "wifi_11n_cap",
      "wifi_sta_connection",
    ])
      .then((data) =>
        setForm({
          mode: data.WirelessMode,
          bandwidth: data.wifi_11n_cap,
          country: data.CountryCode,
          channel: data.Channel,
          band: data.wifi_band === "b" ? "2.4G" : data.wifi_band,
          maxClients: data.MAX_Access_num,
          maxGuestClients: data.m_MAX_Access_num,
        }),
      )
      .catch((error) => toast.error(error instanceof Error ? error.message : "读取失败"))
      .finally(() => setLoading(false));
  }, []);

  const modeLabel = useMemo(
    () =>
      ({
        "6": "802.11 b/g/n/ax",
        "4": "802.11 b/g/n",
        "5": "仅 802.11 a",
        "2": "仅 802.11 n",
      })[form.mode] || form.mode,
    [form.mode],
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (
      !(await confirm({
        title: "应用无线电设置？",
        description: "当前连接到热点的所有设备会短暂断开，并需要重新连接。",
        confirmLabel: "继续应用",
      }))
    )
      return;
    setLoading(true);
    try {
      await requireSuccess(
        postApi({
          wifiMode: form.mode,
          countryCode: form.country,
          MAX_Access_num: form.maxClients,
          m_MAX_Access_num: form.maxGuestClients,
          wifi_band: form.band === "2.4G" ? "b" : form.band,
          selectedChannel: form.channel,
          abg_rate: "0",
          wifi_11n_cap: form.bandwidth,
          goformId: "SET_WIFI_INFO",
        }),
        "无线电设置已更新",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "设置失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Wireless radio"
        title="无线电设置"
        description="调整无线协议、信道、带宽与地区代码，优化热点兼容性和抗干扰能力。"
        actions={<Badge variant="secondary">{modeLabel}</Badge>}
      />
      <SettingsLayout
        aside={
          <HelpCard>
            <p>Wi-Fi 6 模式可提升兼容设备的效率；老旧终端无法连接时可改用 b/g/n。</p>
            <p>自动信道适合大多数场景。固定信道可用于规避已知干扰源。</p>
            <p>地区代码决定可用信道与发射限制，请选择设备实际使用地区。</p>
          </HelpCard>
        }
      >
        <SettingsCard title="无线电参数" description="更改后热点会短暂重启" loading={loading}>
          <form onSubmit={submit} className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="频段" htmlFor="radio-band">
                <NativeSelectWrap>
                  <Select
                    id="radio-band"
                    value={form.band}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, band: event.target.value }))
                    }
                  >
                    <option value="2.4G">2.4 GHz</option>
                    <option value="5G">5 GHz</option>
                  </Select>
                </NativeSelectWrap>
              </FormField>
              <FormField label="网络模式" htmlFor="radio-mode">
                <NativeSelectWrap>
                  <Select
                    id="radio-mode"
                    value={form.mode}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, mode: event.target.value }))
                    }
                  >
                    <option value="6">802.11 b/g/n/ax</option>
                    <option value="4">802.11 b/g/n</option>
                    <option value="5">仅 802.11 a</option>
                    <option value="2">仅 802.11 n</option>
                  </Select>
                </NativeSelectWrap>
              </FormField>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="信道带宽" htmlFor="bandwidth">
                <NativeSelectWrap>
                  <Select
                    id="bandwidth"
                    value={form.bandwidth}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, bandwidth: event.target.value }))
                    }
                  >
                    <option value="0">20 MHz</option>
                    <option value="1">20 / 40 MHz 自动</option>
                  </Select>
                </NativeSelectWrap>
              </FormField>
              <FormField label="国家 / 地区" htmlFor="country">
                <NativeSelectWrap>
                  <Select
                    id="country"
                    value={form.country}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, country: event.target.value }))
                    }
                  >
                    <option value="CN">中国大陆</option>
                    <option value="TW">中国台湾</option>
                    <option value="HK">中国香港</option>
                    <option value="MO">中国澳门</option>
                    <option value="JP">日本</option>
                  </Select>
                </NativeSelectWrap>
              </FormField>
            </div>
            <FormField label="无线信道" htmlFor="channel">
              <NativeSelectWrap>
                <Select
                  id="channel"
                  value={form.channel}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, channel: event.target.value }))
                  }
                >
                  <option value="0">自动选择</option>
                  {channels.map((channel) => (
                    <option key={channel.value} value={channel.value}>
                      {channel.label}
                    </option>
                  ))}
                </Select>
              </NativeSelectWrap>
            </FormField>
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <RadioTower />
                应用无线电设置
              </Button>
            </div>
          </form>
        </SettingsCard>
      </SettingsLayout>
    </div>
  );
}
