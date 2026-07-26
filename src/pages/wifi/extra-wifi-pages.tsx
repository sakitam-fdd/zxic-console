import { Link2, RadioTower, Save, Shield, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { HelpCard, PageHeader, SettingsCard, SettingsLayout } from "@/components/page";
import {
  Badge,
  Button,
  FormField,
  Input,
  NativeSelectWrap,
  Select,
  Switch,
  Textarea,
} from "@/components/ui/primitives";
import { submitDevice } from "@/features/device/actions";
import { getValues, postApi } from "@/features/device/api";
import { useDeviceStore } from "@/features/device/store";
import { safeAtob, safeBtoa } from "@/lib/utils";

/** WPS 快速连接 · 原厂 #wlan_wps */
export function WifiWpsPage() {
  const info = useDeviceStore((state) => state.snapshot.info);
  const network = useDeviceStore((state) => state.snapshot.network);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    ssid: "",
    mode: "PBC",
    pin: "",
    index: "0",
  });

  useEffect(() => {
    setForm((current) => ({
      ...current,
      ssid: network.SSID1 || info.SSID1 || info.m_SSID || current.ssid,
    }));
  }, [info.SSID1, info.m_SSID, network.SSID1]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.ssid) {
      toast.error("请填写 WPS 对应的 SSID");
      return;
    }
    if (form.mode === "PIN" && !/^\d{4,8}$/.test(form.pin)) {
      toast.error("请输入 4–8 位 WPS PIN");
      return;
    }
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "WIFI_WPS_SET",
          WPS_SSID: form.ssid,
          wps_mode: form.mode,
          wifi_wps_index: form.index,
          ...(form.mode === "PIN" ? { wps_pin: form.pin } : {}),
        }),
        form.mode === "PBC" ? "已启动 WPS 按钮模式" : "已提交 WPS PIN",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "WPS 设置失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Wi-Fi WPS"
        title="WPS 设置"
        description="通过按键（PBC）或 PIN 码让客户端快速加入热点。"
      />
      <SettingsLayout
        aside={
          <HelpCard>
            <p>PBC 模式：在设备端启动后，于两分钟内在客户端按下 WPS。</p>
            <p>PIN 模式：输入客户端显示的 WPS PIN，兼容性因终端而异。</p>
          </HelpCard>
        }
      >
        <SettingsCard title="WPS 参数" description="WIFI_WPS_SET" loading={loading}>
          <form onSubmit={submit} className="grid gap-5">
            <FormField label="SSID" htmlFor="wps-ssid">
              <Input
                id="wps-ssid"
                value={form.ssid}
                onChange={(event) => setForm((value) => ({ ...value, ssid: event.target.value }))}
              />
            </FormField>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="WPS 模式" htmlFor="wps-mode">
                <NativeSelectWrap>
                  <Select
                    id="wps-mode"
                    value={form.mode}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, mode: event.target.value }))
                    }
                  >
                    <option value="PBC">PBC · 按键模式</option>
                    <option value="PIN">PIN · 密码模式</option>
                  </Select>
                </NativeSelectWrap>
              </FormField>
              <FormField label="SSID 索引" htmlFor="wps-index">
                <NativeSelectWrap>
                  <Select
                    id="wps-index"
                    value={form.index}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, index: event.target.value }))
                    }
                  >
                    <option value="0">主 SSID</option>
                    <option value="1">访客 SSID</option>
                  </Select>
                </NativeSelectWrap>
              </FormField>
            </div>
            {form.mode === "PIN" ? (
              <FormField label="WPS PIN" htmlFor="wps-pin">
                <Input
                  id="wps-pin"
                  inputMode="numeric"
                  value={form.pin}
                  onChange={(event) => setForm((value) => ({ ...value, pin: event.target.value }))}
                />
              </FormField>
            ) : null}
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <RadioTower />
                启动 WPS
              </Button>
            </div>
          </form>
        </SettingsCard>
      </SettingsLayout>
    </div>
  );
}

/** 访客 / 副 SSID · 原厂 #wlan_guset */
export function WifiGuestPage() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [form, setForm] = useState({
    ssid: "",
    hide: "0",
    maxClients: "5",
    authMode: "WPA2PSK",
    cipher: "1",
    noForwarding: "0",
    showQr: "0",
    password: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getValues(
        [
          "m_ssid_enable",
          "m_SSID",
          "m_HideSSID",
          "m_MAX_Access_num",
          "m_AuthMode",
          "m_WPAPSK1_encode",
          "m_WPAPSK1",
          "m_NoForwarding",
          "m_show_qrcode_flag",
          "cipher",
        ],
        true,
      );
      setEnabled(data.m_ssid_enable === "1");
      setForm({
        ssid: data.m_SSID || "",
        hide: data.m_HideSSID || "0",
        maxClients: data.m_MAX_Access_num || "5",
        authMode: data.m_AuthMode || "WPA2PSK",
        cipher: data.cipher || "1",
        noForwarding: data.m_NoForwarding || "0",
        showQr: data.m_show_qrcode_flag || "0",
        password: safeAtob(data.m_WPAPSK1_encode || data.m_WPAPSK1),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "访客网络读取失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleMultiSsid(next: boolean) {
    setEnabled(next);
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "SET_WIFI_INFO",
          m_ssid_enable: next ? "1" : "0",
        }),
        next ? "访客网络已启用" : "访客网络已关闭",
      );
    } catch (error) {
      setEnabled(!next);
      toast.error(error instanceof Error ? error.message : "切换失败");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.ssid.trim()) {
      toast.error("请填写访客 SSID");
      return;
    }
    if (form.authMode !== "OPEN" && !/^[0-9a-zA-Z!#()+\-./%=?@^_{|}~]{4,63}$/.test(form.password)) {
      toast.error("访客密码需为 4–63 位有效字符");
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        goformId: "SET_WIFI_SSID2_SETTINGS",
        m_SSID: form.ssid,
        m_HideSSID: form.hide,
        m_MAX_Access_num: form.maxClients,
        m_AuthMode: form.authMode,
        cipher: form.cipher,
        m_NoForwarding: form.noForwarding,
        m_show_qrcode_flag: form.showQr,
      };
      if (form.authMode !== "OPEN") {
        payload.m_EncrypType = form.cipher;
        payload.m_WPAPSK1 = safeBtoa(form.password);
      }
      await submitDevice(postApi(payload), "访客网络设置已保存");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Guest SSID"
        title="访客网络"
        description="配置副 SSID、安全模式、最大接入数与客户端隔离。"
        actions={
          <div className="flex items-center gap-3 rounded-full border border-border bg-card px-3 py-1.5">
            <span className="text-xs font-medium">访客 SSID</span>
            <Switch
              label="启用访客网络"
              checked={enabled}
              disabled={loading}
              onCheckedChange={toggleMultiSsid}
            />
          </div>
        }
      />
      <SettingsLayout
        aside={
          <HelpCard>
            <p>访客网络与主热点共用射频，建议限制最大接入数。</p>
            <p>开启客户端隔离后，访客设备之间通常无法互相访问。</p>
          </HelpCard>
        }
      >
        <SettingsCard title="访客热点" description="SET_WIFI_SSID2_SETTINGS" loading={loading}>
          <form onSubmit={submit} className="grid gap-5">
            <FormField label="网络名称（SSID）" htmlFor="guest-ssid">
              <Input
                id="guest-ssid"
                maxLength={32}
                value={form.ssid}
                disabled={!enabled}
                onChange={(event) => setForm((value) => ({ ...value, ssid: event.target.value }))}
              />
            </FormField>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="SSID 广播" htmlFor="guest-hide">
                <NativeSelectWrap>
                  <Select
                    id="guest-hide"
                    value={form.hide}
                    disabled={!enabled}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, hide: event.target.value }))
                    }
                  >
                    <option value="0">广播</option>
                    <option value="1">隐藏</option>
                  </Select>
                </NativeSelectWrap>
              </FormField>
              <FormField label="最大接入数" htmlFor="guest-max">
                <Input
                  id="guest-max"
                  type="number"
                  min="1"
                  max="32"
                  value={form.maxClients}
                  disabled={!enabled}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, maxClients: event.target.value }))
                  }
                />
              </FormField>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="安全模式" htmlFor="guest-auth">
                <NativeSelectWrap>
                  <Select
                    id="guest-auth"
                    value={form.authMode}
                    disabled={!enabled}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, authMode: event.target.value }))
                    }
                  >
                    <option value="OPEN">开放网络</option>
                    <option value="WPA2PSK">WPA2-PSK</option>
                    <option value="WPAPSKWPA2PSK">WPA/WPA2 混合</option>
                  </Select>
                </NativeSelectWrap>
              </FormField>
              <FormField label="加密算法" htmlFor="guest-cipher">
                <NativeSelectWrap>
                  <Select
                    id="guest-cipher"
                    value={form.cipher}
                    disabled={!enabled || form.authMode === "OPEN"}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, cipher: event.target.value }))
                    }
                  >
                    <option value="1">AES</option>
                    <option value="0">TKIP</option>
                    <option value="2">TKIP+AES</option>
                  </Select>
                </NativeSelectWrap>
              </FormField>
            </div>
            <FormField label="密码" htmlFor="guest-pass">
              <Input
                id="guest-pass"
                type="password"
                value={form.password}
                disabled={!enabled || form.authMode === "OPEN"}
                onChange={(event) =>
                  setForm((value) => ({ ...value, password: event.target.value }))
                }
              />
            </FormField>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="客户端隔离" htmlFor="guest-iso">
                <NativeSelectWrap>
                  <Select
                    id="guest-iso"
                    value={form.noForwarding}
                    disabled={!enabled}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, noForwarding: event.target.value }))
                    }
                  >
                    <option value="0">关闭</option>
                    <option value="1">启用</option>
                  </Select>
                </NativeSelectWrap>
              </FormField>
              <FormField label="显示二维码" htmlFor="guest-qr">
                <NativeSelectWrap>
                  <Select
                    id="guest-qr"
                    value={form.showQr}
                    disabled={!enabled}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, showQr: event.target.value }))
                    }
                  >
                    <option value="0">关闭</option>
                    <option value="1">启用</option>
                  </Select>
                </NativeSelectWrap>
              </FormField>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={loading} disabled={!enabled}>
                <Users />
                保存访客设置
              </Button>
            </div>
          </form>
        </SettingsCard>
      </SettingsLayout>
    </div>
  );
}

/** MAC 黑白名单 · 原厂 #filter_mac */
export function WifiMacFilterPage() {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("0");
  const [listText, setListText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getValues(
        ["ACL_mode", "wifi_mac_black_list", "wifi_mac_white_list"],
        true,
      );
      const nextMode = data.ACL_mode || "0";
      setMode(nextMode);
      const list =
        nextMode === "1"
          ? data.wifi_mac_white_list || ""
          : nextMode === "2"
            ? data.wifi_mac_black_list || ""
            : "";
      setListText(
        list
          .split(";")
          .map((item) => item.trim())
          .filter(Boolean)
          .join("\n"),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "MAC 过滤读取失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const macs = listText
      .split(/[\n;]+/)
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
    for (const mac of macs) {
      if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(mac)) {
        toast.error(`MAC 地址格式无效：${mac}`);
        return;
      }
    }
    setLoading(true);
    try {
      const joined = macs.join(";");
      const payload: Record<string, unknown> = {
        goformId: "WIFI_MAC_FILTER",
        ACL_mode: mode,
      };
      if (mode === "1") payload.wifi_mac_white_list = joined;
      if (mode === "2") payload.wifi_mac_black_list = joined;
      await submitDevice(postApi(payload), "MAC 过滤已保存");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="MAC filter"
        title="MAC 过滤"
        description="禁用、白名单或黑名单方式限制可连接热点的设备。"
      />
      <SettingsLayout
        aside={
          <HelpCard>
            <p>模式 0 关闭过滤；1 仅允许白名单；2 拒绝黑名单。</p>
            <p>每行一个 MAC，格式如 AA:BB:CC:DD:EE:FF，保存时以分号提交。</p>
          </HelpCard>
        }
      >
        <SettingsCard title="过滤规则" description="WIFI_MAC_FILTER" loading={loading}>
          <form onSubmit={submit} className="grid gap-5">
            <FormField label="过滤模式" htmlFor="acl-mode">
              <NativeSelectWrap>
                <Select
                  id="acl-mode"
                  value={mode}
                  onChange={(event) => setMode(event.target.value)}
                >
                  <option value="0">关闭</option>
                  <option value="1">白名单</option>
                  <option value="2">黑名单</option>
                </Select>
              </NativeSelectWrap>
            </FormField>
            <FormField
              label={mode === "1" ? "白名单 MAC" : mode === "2" ? "黑名单 MAC" : "MAC 列表"}
              htmlFor="mac-list"
              description="每行一个地址"
            >
              <Textarea
                id="mac-list"
                className="min-h-40 font-mono text-xs"
                disabled={mode === "0"}
                value={listText}
                onChange={(event) => setListText(event.target.value)}
                placeholder={"AA:BB:CC:DD:EE:FF\n11:22:33:44:55:66"}
              />
            </FormField>
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <Shield />
                保存 MAC 过滤
              </Button>
            </div>
          </form>
        </SettingsCard>
      </SettingsLayout>
    </div>
  );
}

/** Internet Wi-Fi / AP Station · 原厂 #wlan_station */
export function WifiApStationPage() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState({
    ssid: "",
    ipStatus: "",
    profile: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getValues(
        ["wifi_sta_connection", "EX_SSID1", "sta_ip_status", "EX_wifi_profile", "ap_station_mode"],
        true,
      );
      setEnabled(data.wifi_sta_connection === "1");
      setStatus({
        ssid: data.EX_SSID1 || "",
        ipStatus: data.sta_ip_status || "",
        profile: data.EX_wifi_profile || data.ap_station_mode || "",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AP Station 读取失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(next: boolean) {
    setEnabled(next);
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "WIFI_STA_CONTROL",
          wifi_sta_connection: next ? "1" : "0",
        }),
        next ? "已启用 Wi-Fi 上行" : "已关闭 Wi-Fi 上行",
      );
      await load();
    } catch (error) {
      setEnabled(!next);
      toast.error(error instanceof Error ? error.message : "设置失败");
    } finally {
      setLoading(false);
    }
  }

  async function disconnect() {
    setLoading(true);
    try {
      await submitDevice(postApi({ goformId: "WLAN_SET_STA_DISCON" }), "已请求断开上行 Wi-Fi");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "断开失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AP Station"
        title="Wi-Fi 上行"
        description="将设备作为客户端接入上级 Wi-Fi，用于中继或备用上网。"
        actions={
          <div className="flex items-center gap-3 rounded-full border border-border bg-card px-3 py-1.5">
            <span className="text-xs font-medium">STA 模式</span>
            <Switch
              label="启用 Wi-Fi 上行"
              checked={enabled}
              disabled={loading}
              onCheckedChange={toggle}
            />
          </div>
        }
      />
      <SettingsLayout
        aside={
          <HelpCard>
            <p>启用后设备可扫描并连接外部 Wi-Fi；具体连网界面因固件而异。</p>
            <p>与热点同时开启时，部分机型会限制射频能力或重启无线。</p>
          </HelpCard>
        }
      >
        <SettingsCard title="连接状态" description="WIFI_STA_CONTROL" loading={loading}>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/55 p-4">
              <p className="text-xs text-muted-foreground">上级 SSID</p>
              <p className="mt-1 font-medium">{status.ssid || "—"}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/55 p-4">
              <p className="text-xs text-muted-foreground">IP 状态</p>
              <p className="mt-1 font-medium">{status.ipStatus || "—"}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/55 p-4">
              <p className="text-xs text-muted-foreground">配置 / 模式</p>
              <p className="mt-1 font-medium">{status.profile || "—"}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Badge variant={enabled ? "success" : "secondary"}>
              {enabled ? "已启用" : "已关闭"}
            </Badge>
            <div className="flex gap-2">
              <Button variant="outline" onClick={load} loading={loading}>
                刷新状态
              </Button>
              <Button variant="outline" onClick={disconnect} loading={loading} disabled={!enabled}>
                <Link2 />
                断开连接
              </Button>
              {!enabled ? (
                <Button onClick={() => toggle(true)} loading={loading}>
                  <Save />
                  启用上行
                </Button>
              ) : null}
            </div>
          </div>
        </SettingsCard>
      </SettingsLayout>
    </div>
  );
}
