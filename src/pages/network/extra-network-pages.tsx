import { BookUser, Cable, Radio, RefreshCw, Save, Search, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState, HelpCard, PageHeader, SettingsCard, SettingsLayout } from "@/components/page";
import {
  Badge,
  Button,
  CheckOption,
  FormField,
  Input,
  NativeSelectWrap,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import { submitDevice } from "@/features/device/actions";
import { getApi, getValues, postApi } from "@/features/device/api";
import { useConfirm } from "@/features/feedback/confirm-provider";
import { asciiToHex, isIpv4, sleep } from "@/lib/utils";

interface NetworkScanItem {
  state: number;
  name: string;
  numeric: string;
  rat: number;
  subrat: number;
}

function parseNetworkScan(raw: string): NetworkScanItem[] {
  if (!raw.trim()) return [];
  const normalized = raw
    .split(";")
    .filter(Boolean)
    .map((item) => (item.split(",").length === 4 ? `${item},NON` : item))
    .join(";");
  const pattern = /([^,;]*),([^,]*),([^,]*),([^,]*),([^,;]*)/g;
  const items: NetworkScanItem[] = [];
  for (const match of normalized.matchAll(pattern)) {
    items.push({
      state: Number.parseInt(match[1], 10) || 0,
      name: match[2].replace(/"/g, ""),
      numeric: match[3].replace(/\D/g, ""),
      rat: Number.parseInt(match[4], 10) || 0,
      subrat: Number.parseInt(match[5], 10) || 0,
    });
  }
  return items;
}

/** 蜂窝连接模式与漫游 · 原厂 #conn_set */
export function ConnectionModePage() {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("auto_dial");
  const [roaming, setRoaming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getValues(
        ["ConnectionMode", "connectionMode", "roam_setting_option", "autoConnectWhenRoaming"],
        true,
      );
      const nextMode = data.ConnectionMode || data.connectionMode || "auto_dial";
      const roam = data.roam_setting_option || data.autoConnectWhenRoaming || "off";
      setMode(nextMode);
      setRoaming(roam === "on" || roam === "1");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "读取失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "SET_CONNECTION_MODE",
          ConnectionMode: mode,
          roam_setting_option: mode === "auto_dial" ? (roaming ? "on" : "off") : "off",
        }),
        "连接模式已保存",
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "设置失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cellular dial"
        title="连接模式"
        description="选择蜂窝自动拨号或手动拨号，并配置漫游时是否自动连接。"
      />
      <SettingsLayout
        aside={
          <HelpCard>
            <p>自动拨号适合大多数场景，设备会在信号可用时自行建立数据连接。</p>
            <p>漫游选项仅在自动拨号模式下生效，开启后可能产生额外漫游费用。</p>
          </HelpCard>
        }
      >
        <SettingsCard title="拨号策略" description="对应原厂连接设置" loading={loading}>
          <form onSubmit={submit} className="grid gap-5">
            <FormField label="连接模式" htmlFor="connection-mode">
              <NativeSelectWrap>
                <Select
                  id="connection-mode"
                  value={mode}
                  onChange={(event) => setMode(event.target.value)}
                >
                  <option value="auto_dial">自动拨号</option>
                  <option value="manual_dial">手动拨号</option>
                </Select>
              </NativeSelectWrap>
            </FormField>
            <CheckOption checked={roaming} disabled={mode !== "auto_dial"} onChange={setRoaming}>
              漫游时允许自动连接
            </CheckOption>
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <Save />
                保存连接模式
              </Button>
            </div>
          </form>
        </SettingsCard>
      </SettingsLayout>
    </div>
  );
}

/** 网络制式与手动选网 · 原厂 #network_choose */
export function NetworkSelectPage() {
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selectMode, setSelectMode] = useState<"auto_select" | "manual_select">("auto_select");
  const [bearer, setBearer] = useState("NETWORK_auto");
  const [networks, setNetworks] = useState<NetworkScanItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getValues(
        ["net_select", "net_select_mode", "m_netselect_save", "m_netselect_contents"],
        true,
      );
      setBearer(data.net_select || "NETWORK_auto");
      const mode = data.net_select_mode || data.m_netselect_save || "auto_select";
      setSelectMode(mode === "manual_select" ? "manual_select" : "auto_select");
      if (data.m_netselect_contents) {
        setNetworks(parseNetworkScan(data.m_netselect_contents));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "读取失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveBearer(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "SET_BEARER_PREFERENCE",
          BearerPreference: bearer,
        }),
        "网络制式已保存",
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "设置失败");
    } finally {
      setLoading(false);
    }
  }

  async function scanNetworks() {
    setScanning(true);
    setNetworks([]);
    try {
      await submitDevice(postApi({ goformId: "SCAN_NETWORK" }), "正在扫描可用网络");
      const deadline = Date.now() + 90000;
      while (Date.now() < deadline) {
        await sleep(1500);
        const status = await getApi("cmd=m_netselect_status", true);
        if (status.m_netselect_status !== "manual_selecting") break;
      }
      const contents = await getApi("cmd=m_netselect_contents", true);
      const list = parseNetworkScan(contents.m_netselect_contents || "");
      setNetworks(list);
      setSelectMode("manual_select");
      toast.success(list.length ? `扫描完成，发现 ${list.length} 个网络` : "扫描完成，暂无结果");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "扫描失败");
    } finally {
      setScanning(false);
    }
  }

  async function register(item: NetworkScanItem) {
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "SET_NETWORK",
          NetworkNumber: item.numeric,
          Rat: item.rat,
          nSubrat: Number.isNaN(item.subrat) ? "" : item.subrat,
        }),
        "正在注册所选网络",
      );
      const deadline = Date.now() + 60000;
      while (Date.now() < deadline) {
        await sleep(1500);
        const result = await getApi("cmd=m_netselect_result", true);
        if (result.m_netselect_result === "manual_success") {
          toast.success("网络注册成功");
          await load();
          return;
        }
        if (result.m_netselect_result === "manual_fail") {
          throw new Error("网络注册失败");
        }
      }
      toast.warning("注册仍在进行，请稍后刷新状态");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "注册失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Network select"
        title="网络选择"
        description="设置优先制式，或手动扫描并注册可用运营商网络。"
        actions={
          <Badge variant="secondary">
            {selectMode === "manual_select" ? "手动选网" : "自动选网"}
          </Badge>
        }
      />
      <SettingsLayout
        aside={
          <HelpCard>
            <p>自动模式下设备按偏好制式选择网络；手动模式需先扫描再注册。</p>
            <p>扫描与注册期间蜂窝连接可能短暂中断，请保持页面打开直至完成。</p>
          </HelpCard>
        }
      >
        <SettingsCard title="制式偏好" description="写入 SET_BEARER_PREFERENCE" loading={loading}>
          <form onSubmit={saveBearer} className="grid gap-5">
            <FormField label="选网方式">
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["auto_select", "自动选择"],
                    ["manual_select", "手动选择"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectMode(value)}
                    className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                      selectMode === value
                        ? "border-primary/40 bg-primary/8 ring-2 ring-primary/10"
                        : "border-border bg-background/55 hover:border-primary/25"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </FormField>
            <FormField label="网络制式" htmlFor="bearer">
              <NativeSelectWrap>
                <Select
                  id="bearer"
                  value={bearer}
                  onChange={(event) => setBearer(event.target.value)}
                >
                  <option value="NETWORK_auto">自动</option>
                  <option value="Only_LTE">仅 4G / LTE</option>
                  <option value="Only_WCDMA">仅 3G / WCDMA</option>
                  <option value="Only_GSM">仅 2G / GSM</option>
                  <option value="NETWORK_LTE">NETWORK_LTE</option>
                  <option value="NETWORK_WCDMA">NETWORK_WCDMA</option>
                </Select>
              </NativeSelectWrap>
            </FormField>
            <div className="flex flex-wrap justify-end gap-2">
              {selectMode === "manual_select" ? (
                <Button type="button" variant="outline" onClick={scanNetworks} loading={scanning}>
                  <Search />
                  扫描网络
                </Button>
              ) : null}
              <Button type="submit" loading={loading}>
                <Save />
                保存制式
              </Button>
            </div>
          </form>
        </SettingsCard>

        {selectMode === "manual_select" ? (
          <SettingsCard
            title="扫描结果"
            description="选择网络后提交注册"
            loading={scanning || loading}
            className="mt-5"
          >
            {networks.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="pb-3 font-medium">运营商</th>
                      <th className="pb-3 font-medium">编号</th>
                      <th className="pb-3 font-medium">RAT</th>
                      <th className="pb-3 text-right font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {networks.map((item) => (
                      <tr key={`${item.numeric}-${item.rat}-${item.name}`}>
                        <td className="py-3.5">{item.name || "未知"}</td>
                        <td className="py-3.5 font-mono text-xs">{item.numeric || "—"}</td>
                        <td className="py-3.5">{item.rat}</td>
                        <td className="py-3.5 text-right">
                          <Button size="sm" onClick={() => register(item)} loading={loading}>
                            <Radio />
                            注册
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="暂无扫描结果"
                description="点击“扫描网络”获取附近可用运营商列表。"
                action={
                  <Button variant="outline" onClick={scanNetworks} loading={scanning}>
                    <Search />
                    开始扫描
                  </Button>
                }
              />
            )}
          </SettingsCard>
        ) : null}
      </SettingsLayout>
    </div>
  );
}

/** USSD 发送与回复 · 原厂 #usat */
export function UssdPage() {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [reply, setReply] = useState("");
  const [content, setContent] = useState("");
  const [action, setAction] = useState("");

  async function pollResult() {
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      await sleep(1200);
      try {
        const data = await getApi("cmd=ussd_data_info", true);
        if (data.ussd_data || data.ussd_content || data.ussd_action) {
          setContent(data.ussd_data || data.ussd_content || "");
          setAction(data.ussd_action || data.ussd_action_result || "");
          return;
        }
        if (data.ussd_action_result && data.ussd_action_result !== "1") {
          setAction(data.ussd_action_result);
          setContent(data.ussd_content || "");
          return;
        }
      } catch {
        // keep polling
      }
    }
  }

  async function send() {
    if (!code.trim()) {
      toast.error("请输入 USSD 指令");
      return;
    }
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "USSD_PROCESS",
          USSD_operator: "ussd_send",
          USSD_send_number: code.trim(),
          notCallback: "true",
        }),
        "USSD 已发送",
      );
      await pollResult();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "发送失败");
    } finally {
      setLoading(false);
    }
  }

  async function replyUssd() {
    if (!reply.trim()) {
      toast.error("请输入回复内容");
      return;
    }
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "USSD_PROCESS",
          USSD_operator: "ussd_reply",
          USSD_reply_number: reply.trim(),
          notCallback: "true",
        }),
        "USSD 回复已发送",
      );
      setReply("");
      await pollResult();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "回复失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="USSD"
        title="USSD"
        description="向运营商发送 USSD 指令（如 *100#），并在需要时回复交互菜单。"
      />
      <SettingsLayout
        aside={
          <HelpCard>
            <p>常见查询余额、流量套餐等指令由运营商提供，格式通常为 *数字#。</p>
            <p>若返回交互菜单，可在下方回复数字或选项后继续。</p>
          </HelpCard>
        }
      >
        <SettingsCard title="发送指令" description="USSD_PROCESS · ussd_send" loading={loading}>
          <div className="grid gap-5">
            <FormField label="USSD 指令" htmlFor="ussd-code">
              <Input
                id="ussd-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="例如 *100#"
              />
            </FormField>
            <div className="flex justify-end">
              <Button onClick={send} loading={loading}>
                <Send />
                发送
              </Button>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          title="运营商回复"
          description={action ? `状态：${action}` : "等待设备返回内容"}
          className="mt-5"
          loading={loading}
        >
          <Textarea
            readOnly
            value={content}
            placeholder="回复内容会显示在这里…"
            className="min-h-32 bg-muted/40"
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Input
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="交互回复（可选）"
            />
            <Button variant="outline" onClick={replyUssd} loading={loading}>
              回复
            </Button>
          </div>
        </SettingsCard>
      </SettingsLayout>
    </div>
  );
}

/** 有线 WAN 接入 · 原厂 #network_set */
export function WanPage() {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    mode: "DHCP",
    username: "",
    password: "",
    dialMode: "auto_dial",
    ip: "",
    mask: "255.255.255.0",
    gateway: "",
    dns1: "",
    dns2: "",
    status: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getValues(
        [
          "ethwan_mode",
          "pppoe_username",
          "pppoe_cc",
          "ethwan_dialmode",
          "ppp_status",
          "static_wan_ipaddr",
          "static_wan_netmask",
          "static_wan_gateway",
          "static_wan_primary_dns",
          "static_wan_secondary_dns",
          "rj45_state",
        ],
        true,
      );
      setForm({
        mode: (data.ethwan_mode || "DHCP").toUpperCase(),
        username: data.pppoe_username || "",
        password: data.pppoe_cc || "",
        dialMode: data.ethwan_dialmode === "manual" ? "manual_dial" : "auto_dial",
        ip: data.static_wan_ipaddr || "",
        mask: data.static_wan_netmask || "255.255.255.0",
        gateway: data.static_wan_gateway || "",
        dns1: data.static_wan_primary_dns || "",
        dns2: data.static_wan_secondary_dns || "",
        status: data.rj45_state || data.ppp_status || "",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "读取失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      let payload: Record<string, unknown>;
      if (form.mode === "PPPOE") {
        if (!form.username) {
          toast.error("请输入 PPPoE 用户名");
          setLoading(false);
          return;
        }
        payload = {
          goformId: "WAN_GATEWAYMODE_PPPOE",
          pppoe_username: form.username,
          pppoe_cc: form.password,
          action_link: "connect",
          dial_mode: form.dialMode,
        };
      } else if (form.mode === "AUTO") {
        payload = {
          goformId: "WAN_GATEWAYMODE_AUTO",
          pppoe_username: form.username,
          pppoe_cc: form.password,
          action_link: "connect",
          dial_mode: form.dialMode,
        };
      } else if (form.mode === "STATIC") {
        if (![form.ip, form.mask, form.gateway].every(isIpv4)) {
          toast.error("请检查静态 IP、掩码与网关格式");
          setLoading(false);
          return;
        }
        payload = {
          goformId: "WAN_GATEWAYMODE_STATIC",
          static_wan_ipaddr: form.ip,
          static_wan_netmask: form.mask,
          static_wan_gateway: form.gateway,
          static_wan_primary_dns: form.dns1,
          static_wan_secondary_dns: form.dns2,
          WAN_MODE: "STATIC",
          action_link: "connect",
          dial_mode: form.dialMode,
        };
      } else {
        payload = {
          goformId: "WAN_GATEWAYMODE_DHCP",
          action_link: "connect",
          dial_mode: form.dialMode,
        };
      }
      await submitDevice(postApi(payload), "WAN 设置已提交");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "设置失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ethernet WAN"
        title="WAN 设置"
        description="配置有线口 PPPoE、自动、静态 IP 或 DHCP 接入方式。"
        actions={<Badge variant="secondary">{form.status || "未知状态"}</Badge>}
      />
      <SettingsLayout
        aside={
          <HelpCard>
            <p>仅在设备通过 RJ45 接入上级网络时生效。</p>
            <p>静态地址需与上级网关同网段，且避免与局域网地址冲突。</p>
          </HelpCard>
        }
      >
        <SettingsCard title="接入方式" description={`当前模式：${form.mode}`} loading={loading}>
          <form onSubmit={submit} className="grid gap-5">
            <FormField label="WAN 模式" htmlFor="wan-mode">
              <NativeSelectWrap>
                <Select
                  id="wan-mode"
                  value={form.mode}
                  onChange={(event) => setForm((value) => ({ ...value, mode: event.target.value }))}
                >
                  <option value="DHCP">DHCP 自动获取</option>
                  <option value="PPPOE">PPPoE 拨号</option>
                  <option value="STATIC">静态 IP</option>
                  <option value="AUTO">自动识别</option>
                </Select>
              </NativeSelectWrap>
            </FormField>

            {form.mode === "PPPOE" || form.mode === "AUTO" ? (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="用户名" htmlFor="pppoe-user">
                    <Input
                      id="pppoe-user"
                      value={form.username}
                      onChange={(event) =>
                        setForm((value) => ({ ...value, username: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="密码" htmlFor="pppoe-pass">
                    <Input
                      id="pppoe-pass"
                      type="password"
                      value={form.password}
                      onChange={(event) =>
                        setForm((value) => ({ ...value, password: event.target.value }))
                      }
                    />
                  </FormField>
                </div>
                <FormField label="拨号方式" htmlFor="dial-mode">
                  <NativeSelectWrap>
                    <Select
                      id="dial-mode"
                      value={form.dialMode}
                      onChange={(event) =>
                        setForm((value) => ({ ...value, dialMode: event.target.value }))
                      }
                    >
                      <option value="auto_dial">自动拨号</option>
                      <option value="manual_dial">手动拨号</option>
                    </Select>
                  </NativeSelectWrap>
                </FormField>
              </>
            ) : null}

            {form.mode === "STATIC" ? (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="IP 地址" htmlFor="wan-ip">
                    <Input
                      id="wan-ip"
                      value={form.ip}
                      onChange={(event) =>
                        setForm((value) => ({ ...value, ip: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="子网掩码" htmlFor="wan-mask">
                    <Input
                      id="wan-mask"
                      value={form.mask}
                      onChange={(event) =>
                        setForm((value) => ({ ...value, mask: event.target.value }))
                      }
                    />
                  </FormField>
                </div>
                <FormField label="默认网关" htmlFor="wan-gw">
                  <Input
                    id="wan-gw"
                    value={form.gateway}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, gateway: event.target.value }))
                    }
                  />
                </FormField>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="主 DNS" htmlFor="wan-dns1">
                    <Input
                      id="wan-dns1"
                      value={form.dns1}
                      onChange={(event) =>
                        setForm((value) => ({ ...value, dns1: event.target.value }))
                      }
                    />
                  </FormField>
                  <FormField label="备 DNS" htmlFor="wan-dns2">
                    <Input
                      id="wan-dns2"
                      value={form.dns2}
                      onChange={(event) =>
                        setForm((value) => ({ ...value, dns2: event.target.value }))
                      }
                    />
                  </FormField>
                </div>
              </>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <Cable />
                应用 WAN 设置
              </Button>
            </div>
          </form>
        </SettingsCard>
      </SettingsLayout>
    </div>
  );
}

interface PhoneContact {
  id: string;
  name: string;
  mobile: string;
  group: string;
}

/** 设备电话本 · 原厂 #pb_main */
export function PhonebookPage() {
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<PhoneContact[]>([]);
  const [form, setForm] = useState({ name: "", mobile: "", group: "common" });
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getApi(
        "cmd=pbm_data_info&page=0&data_per_page=200&mem_store=1&orderBy=name&isAsc=true",
        true,
      );
      const raw = (data.pbm_data || []) as Array<Record<string, string>>;
      setContacts(
        raw.map((item, index) => ({
          id: String(item.pbm_id ?? item.index ?? index),
          name: item.pbm_name || item.name || "",
          mobile: item.pbm_number || item.mobilephone_num || item.mobile || "",
          group: item.pbm_group || item.group || "common",
        })),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "电话本读取失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addContact(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.mobile.trim()) {
      toast.error("姓名与手机号不能为空");
      return;
    }
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "PBM_CONTACT_ADD",
          notCallback: "true",
          location: "1",
          name: asciiToHex(form.name.trim()),
          mobilephone_num: form.mobile.trim(),
          homephone_num: "",
          officephone_num: "",
          email: "",
          groupchoose: form.group || "common",
          add_index_pc: "",
        }),
        "联系人已添加",
      );
      setForm({ name: "", mobile: "", group: "common" });
      await sleep(800);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "添加失败");
    } finally {
      setLoading(false);
    }
  }

  async function removeContact(contact: PhoneContact) {
    if (
      !(await confirm({
        title: "删除联系人？",
        description: `将删除“${contact.name || contact.mobile}”。`,
        confirmLabel: "删除",
        destructive: true,
      }))
    )
      return;
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "PBM_CONTACT_DEL",
          notCallback: "true",
          del_option: "delete_num",
          delete_id: contact.id,
        }),
        "联系人已删除",
      );
      await sleep(800);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phonebook"
        title="电话本"
        description="管理设备侧联系人，支持新增与删除。"
        actions={
          <Button variant="outline" onClick={load} loading={loading}>
            <RefreshCw />
            刷新
          </Button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <SettingsCard title="联系人列表" description={`共 ${contacts.length} 条`} loading={loading}>
          {contacts.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="pb-3 font-medium">姓名</th>
                    <th className="pb-3 font-medium">手机号</th>
                    <th className="pb-3 font-medium">分组</th>
                    <th className="pb-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {contacts.map((contact) => (
                    <tr key={contact.id}>
                      <td className="py-3.5">{contact.name || "—"}</td>
                      <td className="py-3.5 font-mono text-xs">{contact.mobile || "—"}</td>
                      <td className="py-3.5">{contact.group}</td>
                      <td className="py-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => removeContact(contact)}
                          aria-label="删除联系人"
                        >
                          <Trash2 />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="电话本为空" description="在右侧表单添加第一个联系人。" />
          )}
        </SettingsCard>

        <SettingsCard title="新增联系人" description="PBM_CONTACT_ADD" loading={loading}>
          <form onSubmit={addContact} className="grid gap-4">
            <FormField label="姓名" htmlFor="pb-name">
              <Input
                id="pb-name"
                value={form.name}
                onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
              />
            </FormField>
            <FormField label="手机号" htmlFor="pb-mobile">
              <Input
                id="pb-mobile"
                inputMode="tel"
                value={form.mobile}
                onChange={(event) => setForm((value) => ({ ...value, mobile: event.target.value }))}
              />
            </FormField>
            <FormField label="分组" htmlFor="pb-group">
              <NativeSelectWrap>
                <Select
                  id="pb-group"
                  value={form.group}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, group: event.target.value }))
                  }
                >
                  <option value="common">普通</option>
                  <option value="family">家庭</option>
                  <option value="friend">朋友</option>
                  <option value="colleague">同事</option>
                </Select>
              </NativeSelectWrap>
            </FormField>
            <Button type="submit" loading={loading}>
              <BookUser />
              添加联系人
            </Button>
          </form>
        </SettingsCard>
      </div>
    </div>
  );
}
