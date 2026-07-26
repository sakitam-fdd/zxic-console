import {
  AlertTriangle,
  Antenna,
  Clock3,
  Code2,
  Copy,
  Cpu,
  CreditCard,
  KeyRound,
  LockKeyhole,
  Power,
  RefreshCw,
  RotateCcw,
  ServerCog,
  ShieldAlert,
  TerminalSquare,
  Unlock,
  Usb,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { HelpCard, PageHeader, SettingsCard, SettingsLayout } from "@/components/page";
import {
  Badge,
  Button,
  CheckOption,
  FormField,
  Input,
  NativeSelectWrap,
  Select,
  Switch,
  Textarea,
} from "@/components/ui/primitives";
import { getApi, getValues, postApi } from "@/features/device/api";
import { useDeviceStore } from "@/features/device/store";
import { useConfirm } from "@/features/feedback/confirm-provider";
import { resultSucceeded } from "@/lib/utils";

async function deviceAction(request: Promise<Record<string, string>>, successMessage: string) {
  const result = await request;
  if (!resultSucceeded(result)) throw new Error(String(result.result || "设备拒绝执行"));
  toast.success(successMessage);
  return result;
}

interface SimForm {
  current: string;
  defaultCard: string;
  autoSwitch: string;
  runningDetect: string;
  lockStatus: string;
  cardCount: string;
  unlockTries: string;
  unlockCode: string;
}

export function SimSwitchPage() {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<SimForm>({
    current: "0",
    defaultCard: "0",
    autoSwitch: "0",
    runningDetect: "0",
    lockStatus: "",
    cardCount: "",
    unlockTries: "0",
    unlockCode: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getValues([
        "sim_switch_number",
        "sim_auto_switch_enable",
        "sim_current_type",
        "sim_switch_running_detect",
        "sim_default_type",
        "sim_lock_status",
        "cstm_webui_simswitch",
      ]);
      let tries = "0";
      if (data.sim_lock_status !== "unlock") {
        tries = (await getApi("cmd=sim_unlock_nck_time")).sim_unlock_nck_time;
      }
      setForm((current) => ({
        ...current,
        current: data.sim_current_type,
        defaultCard: data.sim_default_type,
        autoSwitch: data.sim_auto_switch_enable,
        runningDetect: data.sim_switch_running_detect,
        lockStatus: data.sim_lock_status,
        cardCount: data.sim_switch_number,
        unlockTries: tries,
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "SIM 信息读取失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    setLoading(true);
    try {
      await deviceAction(
        postApi({
          sim_auto_switch_enable: form.autoSwitch,
          sim_default_type: form.defaultCard,
          sim_switch_running_detect: form.autoSwitch === "1" ? form.runningDetect : "0",
          goformId: "SIM_SWITCH",
        }),
        "SIM 切换策略已保存",
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "设置失败");
    } finally {
      setLoading(false);
    }
  }

  async function unlock() {
    if (!form.unlockCode) {
      toast.error("请输入 SIM 切换解锁码");
      return;
    }
    setLoading(true);
    try {
      await deviceAction(
        postApi({
          sim_unlock_code: form.unlockCode,
          notCallback: "true",
          goformId: "GORORM_UNLOCK_SIM",
        }),
        "解锁请求已发送",
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "解锁失败");
    } finally {
      setLoading(false);
    }
  }

  const cardOptions = [
    ["0", "外置 SIM 卡"],
    ["1", "内置 SIM 卡 1"],
    ["2", "内置 SIM 卡 2"],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SIM management"
        title="SIM 卡管理"
        description="选择默认 SIM 卡、配置故障自动切换，并查看当前卡槽与解锁状态。"
        actions={
          <Badge variant={form.lockStatus === "unlock" ? "success" : "warning"}>
            {form.lockStatus === "unlock" ? "已解锁" : "需要解锁"}
          </Badge>
        }
      />
      <SettingsLayout
        aside={
          <HelpCard>
            <p>默认 SIM 卡是设备启动后优先使用的卡槽。</p>
            <p>开启自动切换后，设备可在当前卡网络不可用时尝试其他卡槽。</p>
            <p>解锁码尝试次数有限，请确认解锁码来源可靠后再提交。</p>
          </HelpCard>
        }
      >
        {form.lockStatus === "unlock" ? (
          <SettingsCard
            title="卡槽策略"
            description={`设备识别到 ${form.cardCount || "—"} 个可切换卡槽`}
            loading={loading}
          >
            <div className="grid gap-5">
              <FormField label="当前 SIM 卡">
                <NativeSelectWrap>
                  <Select value={form.current} disabled>
                    {cardOptions.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </NativeSelectWrap>
              </FormField>
              <FormField label="默认 SIM 卡">
                <NativeSelectWrap>
                  <Select
                    value={form.defaultCard}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, defaultCard: event.target.value }))
                    }
                  >
                    {cardOptions.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </NativeSelectWrap>
              </FormField>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="自动切换">
                  <NativeSelectWrap>
                    <Select
                      value={form.autoSwitch}
                      onChange={(event) =>
                        setForm((value) => ({ ...value, autoSwitch: event.target.value }))
                      }
                    >
                      <option value="0">关闭</option>
                      <option value="1">启用</option>
                    </Select>
                  </NativeSelectWrap>
                </FormField>
                <FormField label="运行状态检测">
                  <NativeSelectWrap>
                    <Select
                      value={form.runningDetect}
                      disabled={form.autoSwitch !== "1"}
                      onChange={(event) =>
                        setForm((value) => ({ ...value, runningDetect: event.target.value }))
                      }
                    >
                      <option value="0">关闭</option>
                      <option value="1">启用</option>
                    </Select>
                  </NativeSelectWrap>
                </FormField>
              </div>
              <div className="flex justify-end">
                <Button onClick={submit} loading={loading}>
                  <CreditCard />
                  保存切换策略
                </Button>
              </div>
            </div>
          </SettingsCard>
        ) : (
          <SettingsCard
            title="解锁 SIM 切换"
            description={`剩余尝试次数：${form.unlockTries}`}
            loading={loading}
          >
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 p-4 text-sm leading-6 text-amber-800 dark:text-amber-200">
              <div className="flex items-center gap-2 font-medium">
                <LockKeyhole className="size-4" />
                当前设备限制了 SIM 卡切换
              </div>
              <p className="mt-1 opacity-80">错误解锁码可能耗尽尝试次数，请谨慎操作。</p>
            </div>
            <div className="mt-5">
              <FormField label="解锁码" htmlFor="sim-unlock">
                <Input
                  id="sim-unlock"
                  value={form.unlockCode}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, unlockCode: event.target.value }))
                  }
                />
              </FormField>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={unlock} loading={loading}>
                <Unlock />
                提交解锁
              </Button>
            </div>
          </SettingsCard>
        )}
      </SettingsLayout>
    </div>
  );
}

interface BandOption {
  value: string;
  name: string;
  type: "4G" | "2/3G";
  checked: boolean;
}

export function CellularBandsPage() {
  const isR186x = useDeviceStore((state) => Boolean(state.config.is_r186x));
  const [loading, setLoading] = useState(true);
  const [bands, setBands] = useState<BandOption[]>([]);
  const [r186x, setR186x] = useState({
    current: "",
    selected: "149,0,0,0,160,1,0,0",
  });
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (isR186x) {
        const [current, selected] = await Promise.all([
          getValues(["lte_band", "cell_id", "ping_google"]),
          getValues(["work_lte_band"]),
        ]);
        setR186x({
          current: current.lte_band,
          selected: selected.work_lte_band?.replace(/,\d+$/, "") || "149,0,0,0,160,1,0,0",
        });
      } else {
        const [selected, support] = await Promise.all([
          getApi("cmd=set_band_list"),
          getApi("cmd=get_support_band"),
        ]);
        const selectedValues = (selected.set_band_list || "").split(",");
        setBands(
          Object.entries(support)
            .filter(
              ([name, supported]) => supported === "1" && !["result", "success"].includes(name),
            )
            .map(([value]) => ({
              value,
              checked: selectedValues.includes(value),
              type: value.includes("LTEB") ? "4G" : "2/3G",
              name: value.includes("LTEB")
                ? value.replace("LTEB", "LTE Band ")
                : value.includes("WB")
                  ? value.replace("WB", "WCDMA Band ")
                  : value,
            })),
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "频段信息读取失败");
    } finally {
      setLoading(false);
    }
  }, [isR186x]);

  useEffect(() => {
    void load();
  }, [load]);

  async function apply() {
    if (
      !(await confirm({
        title: "锁定蜂窝频段？",
        description: "设备将重启以应用新频段。错误的频段组合可能导致无法注册移动网络。",
        confirmLabel: "应用并重启",
      }))
    )
      return;
    setLoading(true);
    try {
      if (isR186x) {
        await deviceAction(
          postApi({
            ping_google: "no",
            goformId: "SET_FREQ_BAND",
            work_lte_band: r186x.selected,
          }),
          "频段锁定请求已发送",
        );
      } else {
        const selected = bands.filter((band) => band.checked).map((band) => band.value);
        if (!selected.length) throw new Error("至少选择一个设备支持的频段");
        await deviceAction(
          postApi({ band_list: selected.join(","), goformId: "GOFORM_SET_BAND" }),
          "频段锁定请求已发送",
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "设置失败");
    } finally {
      setLoading(false);
    }
  }

  function toggleAll(type: BandOption["type"], checked: boolean) {
    setBands((current) =>
      current.map((band) => (band.type === type ? { ...band, checked } : band)),
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cellular radio"
        title="蜂窝频段"
        description="将蜂窝模块锁定到设备支持的 LTE、WCDMA 或其他频段，用于网络调优与故障排查。"
        actions={<Badge variant="warning">高级设置</Badge>}
      />
      <SettingsLayout
        aside={
          <HelpCard title="谨慎操作">
            <p>仅选择运营商在当前地区实际使用的频段。</p>
            <p>如果设备无法注册网络，请恢复为全部支持频段。</p>
            <p>保存后设备会自动重启，控制台会短暂离线。</p>
          </HelpCard>
        }
      >
        <SettingsCard
          title="频段选择"
          description={isR186x ? "R186x 专用频段模式" : "仅显示设备报告为支持的频段"}
          loading={loading}
        >
          {isR186x ? (
            <div className="grid gap-5">
              <FormField label="当前频段">
                <Input value={r186x.current} disabled />
              </FormField>
              <FormField label="目标频段">
                <NativeSelectWrap>
                  <Select
                    value={r186x.selected}
                    onChange={(event) =>
                      setR186x((value) => ({ ...value, selected: event.target.value }))
                    }
                  >
                    <option value="1,0,0,0,0,0,0,0">Band 1</option>
                    <option value="4,0,0,0,0,0,0,0">Band 3</option>
                    <option value="16,0,0,0,0,0,0,0">Band 5</option>
                    <option value="128,0,0,0,0,0,0,0">Band 8</option>
                    <option value="0,0,0,0,32,0,0,0">Band 38</option>
                    <option value="0,0,0,0,128,0,0,0">Band 40</option>
                    <option value="0,0,0,0,0,1,0,0">Band 41</option>
                    <option value="149,0,0,0,160,1,0,0">Band 1 / 3 / 5 / 8 / 38 / 40 / 41</option>
                  </Select>
                </NativeSelectWrap>
              </FormField>
            </div>
          ) : (
            <div className="grid gap-6">
              {(["4G", "2/3G"] as const).map((type) => (
                <section key={type}>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium">{type} 频段</p>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => toggleAll(type, true)}>
                        全选
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleAll(type, false)}>
                        清空
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {bands
                      .filter((band) => band.type === type)
                      .map((band) => (
                        <CheckOption
                          key={band.value}
                          checked={band.checked}
                          onChange={(checked) =>
                            setBands((current) =>
                              current.map((item) =>
                                item.value === band.value ? { ...item, checked } : item,
                              ),
                            )
                          }
                        >
                          {band.name}
                        </CheckOption>
                      ))}
                  </div>
                </section>
              ))}
            </div>
          )}
          <div className="mt-6 flex justify-end">
            <Button onClick={apply} loading={loading}>
              <Antenna />
              应用频段设置
            </Button>
          </div>
        </SettingsCard>
      </SettingsLayout>
    </div>
  );
}

interface DdnsForm {
  enabled: boolean;
  mode: string;
  provider: string;
  account: string;
  password: string;
  domain: string;
  hash: string;
  status: string;
}

export function DdnsPage() {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<DdnsForm>({
    enabled: false,
    mode: "manual",
    provider: "",
    account: "",
    password: "",
    domain: "",
    hash: "",
    status: "",
  });

  useEffect(() => {
    getValues(
      [
        "DDNS_Enable",
        "DDNS_Mode",
        "DDNSProvider",
        "DDNSAccount",
        "DDNSPassword",
        "DDNS",
        "DDNS_Hash_Value",
        "DDNS_STATUS",
      ],
      true,
    )
      .then((data) =>
        setForm({
          enabled: data.DDNS_Enable === "1",
          mode: data.DDNS_Mode || "manual",
          provider: data.DDNSProvider || "",
          account: data.DDNSAccount || "",
          password: data.DDNSPassword || "",
          domain: data.DDNS || "",
          hash: data.DDNS_Hash_Value || "",
          status: data.DDNS_STATUS || "",
        }),
      )
      .catch((error) => toast.error(error instanceof Error ? error.message : "读取失败"))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (form.enabled && (!form.provider || !form.account || !form.password || !form.domain)) {
      toast.error("启用 DDNS 时，服务商、账户、密码和域名均不能为空");
      return;
    }
    if (form.provider === "freedns.afraid.org" && !form.hash) {
      toast.error("FreeDNS 服务需要填写 Hash 值");
      return;
    }
    setLoading(true);
    try {
      await deviceAction(
        postApi({
          goformId: "DDNS",
          DDNS_Enable: form.enabled ? "1" : "0",
          DDNS_Mode: form.mode,
          DDNSProvider: form.provider,
          DDNS: form.domain,
          DDNSPassword: form.password,
          DDNSAccount: form.account,
          DDNS_Hash_Value: form.hash,
        }),
        "DDNS 设置已保存",
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
        eyebrow="Dynamic DNS"
        title="DDNS 设置"
        description="为变化的蜂窝 WAN 地址绑定固定域名，便于从外部网络定位设备。"
        actions={
          <div className="flex items-center gap-3 rounded-full border border-border bg-card px-3 py-1.5">
            <span className="text-xs font-medium">DDNS</span>
            <Switch
              label="启用 DDNS"
              checked={form.enabled}
              disabled={loading}
              onCheckedChange={(enabled) => setForm((value) => ({ ...value, enabled }))}
            />
          </div>
        }
      />
      <SettingsLayout
        aside={
          <HelpCard>
            <p>蜂窝运营商可能使用 CGNAT；即使 DDNS 更新成功，也不一定能从公网直接访问设备。</p>
            <p>FreeDNS 需要额外的 Hash 值，其他服务商通常使用账户与密码。</p>
          </HelpCard>
        }
      >
        <SettingsCard
          title="动态域名配置"
          description={form.status ? `状态：${form.status}` : "由设备定期更新域名解析"}
          loading={loading}
        >
          <form onSubmit={submit} className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="更新模式">
                <NativeSelectWrap>
                  <Select
                    value={form.mode}
                    disabled={!form.enabled}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, mode: event.target.value }))
                    }
                  >
                    <option value="manual">手动配置</option>
                    <option value="auto">自动识别</option>
                  </Select>
                </NativeSelectWrap>
              </FormField>
              <FormField label="服务商">
                <NativeSelectWrap>
                  <Select
                    value={form.provider}
                    disabled={!form.enabled}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, provider: event.target.value }))
                    }
                  >
                    <option value="">选择服务商</option>
                    <option value="dyndns.org">DynDNS</option>
                    <option value="freedns.afraid.org">FreeDNS</option>
                    <option value="zoneedit.com">ZoneEdit</option>
                    <option value="no-ip.com">No-IP</option>
                  </Select>
                </NativeSelectWrap>
              </FormField>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="账户">
                <Input
                  disabled={!form.enabled}
                  value={form.account}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, account: event.target.value }))
                  }
                />
              </FormField>
              <FormField label="密码">
                <Input
                  type="password"
                  disabled={!form.enabled}
                  value={form.password}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, password: event.target.value }))
                  }
                />
              </FormField>
            </div>
            <FormField label="域名">
              <Input
                disabled={!form.enabled}
                value={form.domain}
                onChange={(event) => setForm((value) => ({ ...value, domain: event.target.value }))}
                placeholder="router.example.com"
              />
            </FormField>
            {form.provider === "freedns.afraid.org" ? (
              <FormField label="FreeDNS Hash">
                <Input
                  disabled={!form.enabled}
                  value={form.hash}
                  onChange={(event) => setForm((value) => ({ ...value, hash: event.target.value }))}
                />
              </FormField>
            ) : null}
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <ServerCog />
                保存 DDNS
              </Button>
            </div>
          </form>
        </SettingsCard>
      </SettingsLayout>
    </div>
  );
}

interface Tr069Form {
  enabled: boolean;
  acsUser: string;
  acsPassword: string;
  acsUrl: string;
  informEnabled: boolean;
  interval: string;
  authEnabled: boolean;
  cpeUser: string;
  cpePassword: string;
}

export function Tr069Page() {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Tr069Form>({
    enabled: false,
    acsUser: "",
    acsPassword: "",
    acsUrl: "",
    informEnabled: false,
    interval: "3600",
    authEnabled: false,
    cpeUser: "",
    cpePassword: "",
  });
  const confirm = useConfirm();

  useEffect(() => {
    getValues(
      [
        "tr069_enable",
        "tr069_acs_username",
        "tr069_acs_password",
        "tr069_acs_url",
        "tr069_inform_enable",
        "tr069_inform_interval",
        "tr069_cpe_auth_enable",
        "tr069_cpe_username",
        "tr069_cpe_password",
      ],
      true,
    )
      .then((data) =>
        setForm({
          enabled: data.tr069_enable === "1",
          acsUser: data.tr069_acs_username || "",
          acsPassword: data.tr069_acs_password || "",
          acsUrl: data.tr069_acs_url || "",
          informEnabled: data.tr069_inform_enable === "1",
          interval: data.tr069_inform_interval || "3600",
          authEnabled: data.tr069_cpe_auth_enable === "1",
          cpeUser: data.tr069_cpe_username || "",
          cpePassword: data.tr069_cpe_password || "",
        }),
      )
      .catch((error) => toast.error(error instanceof Error ? error.message : "读取失败"))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (form.enabled && !form.acsUrl) {
      toast.error("启用 TR-069 时必须填写 ACS 地址");
      return;
    }
    if (form.informEnabled && Number(form.interval) < 1) {
      toast.error("定期上报周期必须大于 0 秒");
      return;
    }
    if (
      !(await confirm({
        title: "应用 TR-069 设置？",
        description: "设备将重启以应用远程管理配置，当前会话会中断。",
        confirmLabel: "保存并重启",
      }))
    )
      return;
    setLoading(true);
    try {
      await deviceAction(
        postApi({
          goformId: "GORORM_SET_TR069",
          tr069enanble: form.enabled ? "1" : "0",
          tr069AcsName: form.acsUser,
          tr069AcsPassword: form.acsPassword,
          tr069AcsAddress: form.acsUrl,
          tr069InformEnable: form.informEnabled ? "1" : "0",
          tr069InformInterval: form.interval,
          tr069AuthEnable: form.authEnabled ? "1" : "0",
          tr069CpeName: form.cpeUser,
          tr069CpePassword: form.cpePassword,
        }),
        "TR-069 设置已提交",
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
        eyebrow="Remote management"
        title="TR-069 设置"
        description="配置运营商 ACS 服务器、定期上报与 CPE 连接请求认证。"
        actions={<Badge variant="warning">远程管理</Badge>}
      />
      <SettingsLayout
        aside={
          <HelpCard title="安全提示">
            <p>只使用受信任运营商或管理员提供的 ACS 地址。</p>
            <p>启用连接请求认证并设置强密码，可以降低未授权远程管理风险。</p>
          </HelpCard>
        }
      >
        <SettingsCard title="ACS 与 CPE" description="保存设置会触发设备重启" loading={loading}>
          <form onSubmit={submit} className="grid gap-6">
            <div className="flex items-center justify-between rounded-xl border border-border bg-background/55 p-4">
              <div>
                <p className="text-sm font-medium">启用 TR-069</p>
                <p className="mt-1 text-xs text-muted-foreground">允许设备连接 ACS 远程管理平台</p>
              </div>
              <Switch
                label="启用 TR-069"
                checked={form.enabled}
                onCheckedChange={(enabled) => setForm((value) => ({ ...value, enabled }))}
              />
            </div>
            <FormField label="ACS 地址">
              <Input
                value={form.acsUrl}
                disabled={!form.enabled}
                onChange={(event) => setForm((value) => ({ ...value, acsUrl: event.target.value }))}
                placeholder="https://acs.example.com/"
              />
            </FormField>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="ACS 用户名">
                <Input
                  disabled={!form.enabled}
                  value={form.acsUser}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, acsUser: event.target.value }))
                  }
                />
              </FormField>
              <FormField label="ACS 密码">
                <Input
                  type="password"
                  disabled={!form.enabled}
                  value={form.acsPassword}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, acsPassword: event.target.value }))
                  }
                />
              </FormField>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="定期上报">
                <NativeSelectWrap>
                  <Select
                    disabled={!form.enabled}
                    value={form.informEnabled ? "1" : "0"}
                    onChange={(event) =>
                      setForm((value) => ({
                        ...value,
                        informEnabled: event.target.value === "1",
                      }))
                    }
                  >
                    <option value="1">启用</option>
                    <option value="0">关闭</option>
                  </Select>
                </NativeSelectWrap>
              </FormField>
              <FormField label="上报周期（秒）">
                <Input
                  type="number"
                  min="1"
                  disabled={!form.enabled || !form.informEnabled}
                  value={form.interval}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, interval: event.target.value }))
                  }
                />
              </FormField>
            </div>
            <div className="rounded-xl border border-border p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">连接请求认证</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    验证 ACS 主动连接设备时的身份
                  </p>
                </div>
                <Switch
                  label="连接请求认证"
                  checked={form.authEnabled}
                  disabled={!form.enabled}
                  onCheckedChange={(authEnabled) => setForm((value) => ({ ...value, authEnabled }))}
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="CPE 用户名">
                  <Input
                    disabled={!form.enabled || !form.authEnabled}
                    value={form.cpeUser}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, cpeUser: event.target.value }))
                    }
                  />
                </FormField>
                <FormField label="CPE 密码">
                  <Input
                    type="password"
                    disabled={!form.enabled || !form.authEnabled}
                    value={form.cpePassword}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, cpePassword: event.target.value }))
                    }
                  />
                </FormField>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <ServerCog />
                保存 TR-069
              </Button>
            </div>
          </form>
        </SettingsCard>
      </SettingsLayout>
    </div>
  );
}

const commonAtCommands = [
  ["AT+CGSN", "读取 IMEI"],
  ["AT+CIMI", "读取 IMSI"],
  ["AT+CSQ", "读取信号质量"],
  ["AT+COPS?", "读取当前运营商"],
  ["AT+CGDCONT?", "读取 PDP 上下文"],
];

export function AtCommandPage() {
  const [command, setCommand] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function execute(event: React.FormEvent) {
    event.preventDefault();
    if (!/^AT/i.test(command.trim())) {
      toast.error("AT 命令必须以 AT 开头");
      return;
    }
    setLoading(true);
    try {
      const response = await postApi({
        at_cmd: command.trim(),
        goformId: "EXECUTE_AT_COMMAND",
      });
      setResult(
        (current) => `${current}${current ? "\n\n" : ""}> ${command}\n${response.result || ""}`,
      );
      toast.success("AT 命令执行完成");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "执行失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Modem terminal"
        title="AT 命令"
        description="向蜂窝模块发送 AT 指令，用于读取状态与高级诊断。"
        actions={<Badge variant="warning">调试工具</Badge>}
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <SettingsCard title="命令终端" description="命令会直接交给设备蜂窝模块" loading={loading}>
          <form onSubmit={execute} className="flex gap-2">
            <Input
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              className="font-mono"
              placeholder="AT+CSQ"
            />
            <Button type="submit" loading={loading}>
              <TerminalSquare />
              执行
            </Button>
          </form>
          <div className="relative mt-5">
            <Textarea
              value={result}
              readOnly
              className="min-h-[340px] bg-slate-950 font-mono text-xs leading-6 text-emerald-300"
              placeholder="命令回复会显示在这里…"
            />
            {result ? (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 text-slate-300 hover:bg-white/10 hover:text-white"
                onClick={() => navigator.clipboard.writeText(result)}
                aria-label="复制命令结果"
              >
                <Copy />
              </Button>
            ) : null}
          </div>
        </SettingsCard>
        <SettingsCard title="常用命令" description="点击即可填入终端">
          <div className="space-y-2">
            {commonAtCommands.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setCommand(value)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-background/50 px-3 py-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
              >
                <div>
                  <p className="font-mono text-xs font-semibold">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                </div>
                <Code2 className="size-4 text-muted-foreground" />
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/8 p-4 text-xs leading-5 text-amber-800 dark:text-amber-200">
            写入型或复位型命令可能改变模块配置。不了解命令含义时，请勿执行。
          </div>
        </SettingsCard>
      </div>
    </div>
  );
}

const TIME_ZONES = [
  ["<-12>12_0", "(GMT-12:00) 日界线西"],
  ["SST11_0", "(GMT-11:00) 中途岛，萨摩亚"],
  ["<-10>10_0", "(GMT-10:00) 夏威夷"],
  ["<-09>9_0", "(GMT-09:00) 阿拉斯加"],
  ["PST8PDT,M3.2.0,M11.1.0_0", "(GMT-08:00) 太平洋时间"],
  ["<-07>7_0", "(GMT-07:00) 山地时间"],
  ["<-06>6_1", "(GMT-06:00) 中部时间"],
  ["<-05>5_1", "(GMT-05:00) 东部时间"],
  ["AST4ADT,M3.2.0,M11.1.0_0", "(GMT-04:00) 大西洋时间"],
  ["NST3:30NDT,M3.2.0,M11.1.0_0", "(GMT-03:30) 纽芬兰"],
  ["<-03>3_0", "(GMT-03:00) 巴西利亚"],
  ["<-02>2_0", "(GMT-02:00) 中大西洋"],
  ["<-01>1_0", "(GMT-01:00) 佛得角群岛"],
  ["GMT0IST,M3.5.0/1,M10.5.0_0", "(GMT+00:00) 伦敦，里斯本"],
  ["CET-1CEST,M3.5.0,M10.5.0/3_0", "(GMT+01:00) 柏林，巴黎，罗马"],
  ["EET-2EEST,M3.5.0/3,M10.5.0/4_0", "(GMT+02:00) 雅典，布加勒斯特"],
  ["<+03>-3_0", "(GMT+03:00) 巴格达，莫斯科"],
  ["<+0330>-3:30<+0430>,J80/0,J264/0_0", "(GMT+03:30) 德黑兰"],
  ["<+04>-4_0", "(GMT+04:00) 阿布扎比，马斯喀特"],
  ["<+0430>-4:30_0", "(GMT+04:30) 喀布尔"],
  ["PKT-5_1", "(GMT+05:00) 伊斯兰堡，卡拉奇"],
  ["<+0530>-5:30_0", "(GMT+05:30) 孟买，新德里"],
  ["<+0545>-5:45_0", "(GMT+05:45) 加德满都"],
  ["<+06>-6_1", "(GMT+06:00) 达卡，阿斯塔纳"],
  ["<+0630>-6:30_0", "(GMT+06:30) 仰光"],
  ["<+07>-7_1", "(GMT+07:00) 曼谷，河内，雅加达"],
  ["CST-8_0", "(GMT+08:00) 北京，香港，乌鲁木齐"],
  ["JST-9_0", "(GMT+09:00) 东京，大阪"],
  ["ACST-9:30_1", "(GMT+09:30) 达尔文"],
  ["AEST-10_0", "(GMT+10:00) 布里斯班"],
  ["<+11>-11_0", "(GMT+11:00) 所罗门群岛"],
  ["<+12>-12_0", "(GMT+12:00) 奥克兰，惠灵顿"],
  ["<+13>-13_0", "(GMT+13:00) 努库阿洛法"],
] as const;

interface DeviceForm {
  fastBoot: boolean;
  mac: string;
  imei: string;
  timeMode: "auto" | "manual";
  currentTime: string;
  manualTime: string;
  server1: string;
  server2: string;
  server3: string;
  timezone: string;
  daylight: string;
  passwords: Record<string, string>;
}

export function DeviceSettingsPage() {
  const info = useDeviceStore((state) => state.snapshot.info);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<DeviceForm>({
    fastBoot: false,
    mac: "",
    imei: info.imei || "",
    timeMode: "auto",
    currentTime: "",
    manualTime: "",
    server1: "",
    server2: "",
    server3: "",
    timezone: "CST-8_0",
    daylight: "0",
    passwords: {},
  });
  const confirm = useConfirm();

  useEffect(() => {
    if (info.imei) setForm((value) => ({ ...value, imei: info.imei }));
  }, [info.imei]);

  useEffect(() => {
    async function load() {
      try {
        const [time, power, passwords] = await Promise.all([
          getValues([
            "sntp_year",
            "sntp_month",
            "sntp_day",
            "sntp_hour",
            "sntp_minute",
            "sntp_second",
            "sntp_time_set_mode",
            "sntp_server0",
            "sntp_server1",
            "sntp_server2",
            "sntp_timezone",
            "sntp_timezone_index",
            "sntp_dst_enable",
          ]),
          getValues(["mgmt_quicken_power_on", "need_hard_reboot", "need_sim_pin"]),
          getValues(["current_Password", "admin_Password", "root_Password"]),
        ]);
        const currentTime = `${time.sntp_year}-${time.sntp_month}-${time.sntp_day}T${time.sntp_hour}:${time.sntp_minute}:${time.sntp_second}`;
        setForm((value) => ({
          ...value,
          fastBoot: power.mgmt_quicken_power_on === "1",
          timeMode: time.sntp_time_set_mode === "manual" ? "manual" : "auto",
          currentTime: currentTime.replace("T", " "),
          manualTime: currentTime,
          server1: time.sntp_server0,
          server2: time.sntp_server1,
          server3: time.sntp_server2,
          timezone: `${time.sntp_timezone}_${time.sntp_timezone_index}`,
          daylight: time.sntp_dst_enable || "0",
          passwords,
        }));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "设备设置读取失败");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function command(
    goformId: string,
    title: string,
    description: string,
    destructive = false,
    extra: Record<string, string> = {},
  ) {
    if (
      !(await confirm({
        title,
        description,
        confirmLabel: destructive ? "确认执行" : "继续",
        destructive,
      }))
    )
      return;
    setLoading(true);
    try {
      await deviceAction(postApi({ goformId, ...extra }), `${title}请求已发送`);
      if (goformId === "SET_DEVICE_MODE") {
        const reboot = await confirm({
          title: "现在重启设备？",
          description: "ADB 模式需要重启后才能完全生效。",
          confirmLabel: "立即重启",
        });
        if (reboot) await deviceAction(postApi({ goformId: "REBOOT_DEVICE" }), "设备正在重启");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    } finally {
      setLoading(false);
    }
  }

  async function toggleFastBoot(enabled: boolean) {
    setForm((value) => ({ ...value, fastBoot: enabled }));
    setLoading(true);
    try {
      await deviceAction(
        postApi({
          goformId: "MGMT_CONTROL_POWER_ON_SPEED",
          mgmt_quicken_power_on: enabled ? "1" : "0",
        }),
        enabled ? "快速开机已启用" : "快速开机已关闭",
      );
    } catch (error) {
      setForm((value) => ({ ...value, fastBoot: !enabled }));
      toast.error(error instanceof Error ? error.message : "设置失败");
    } finally {
      setLoading(false);
    }
  }

  async function updateMac() {
    if (
      !(await confirm({
        title: "修改 USB 网卡 MAC？",
        description: "该操作需要重启设备。请确认地址格式正确且不会与局域网设备冲突。",
        confirmLabel: "提交修改",
      }))
    )
      return;
    setLoading(true);
    try {
      await deviceAction(
        postApi({ goformId: "SET_USB_MAC_ADDRESS", mac: form.mac }),
        "USB 网卡 MAC 修改请求已发送",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "修改失败");
    } finally {
      setLoading(false);
    }
  }

  async function updateImei() {
    if (!/^\d{15}$/.test(form.imei)) {
      toast.error("IMEI 必须为 15 位数字");
      return;
    }
    if (
      !(await confirm({
        title: "修改设备 IMEI？",
        description: "该操作需要恢复出厂设置，可能受当地法规或运营商规则限制。",
        confirmLabel: "确认修改",
        destructive: true,
      }))
    )
      return;
    setLoading(true);
    try {
      await deviceAction(
        postApi({ goformId: "SET_IMEI_NUM", imei: form.imei }),
        "IMEI 修改请求已发送",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "修改失败");
    } finally {
      setLoading(false);
    }
  }

  async function saveTime(event: React.FormEvent) {
    event.preventDefault();
    const [timezone, timezoneIndex = "0"] = form.timezone.split("_");
    const date = new Date(form.manualTime);
    if (form.timeMode === "manual" && Number.isNaN(date.getTime())) {
      toast.error("请选择有效的手动时间");
      return;
    }
    setLoading(true);
    try {
      await deviceAction(
        postApi({
          goformId: "SNTP",
          manualsettime: form.timeMode,
          sntp_server1_ip: form.server1,
          sntp_server2_ip: form.server2,
          sntp_server3_ip: form.server3,
          sntp_other_server0: "",
          sntp_other_server1: "",
          sntp_other_server2: "",
          timezone,
          sntp_timezone_index: timezoneIndex,
          DaylightEnabled: form.daylight,
          time_year: date.getFullYear(),
          time_month: String(date.getMonth() + 1).padStart(2, "0"),
          time_day: String(date.getDate()).padStart(2, "0"),
          time_hour: String(date.getHours()).padStart(2, "0"),
          time_minute: String(date.getMinutes()).padStart(2, "0"),
          sntp_second: String(date.getSeconds()).padStart(2, "0"),
        }),
        "设备时间设置已保存",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "时间设置失败");
    } finally {
      setLoading(false);
    }
  }

  const passwordEntries = useMemo(
    () => Object.entries(form.passwords).filter(([, value]) => value),
    [form.passwords],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Device operations"
        title="设备与时间"
        description="执行设备维护操作、管理调试模式、修改设备标识并配置 SNTP 时间同步。"
        actions={<Badge variant="warning">高权限区域</Badge>}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <SettingsCard title="设备维护" description="电源、复位与调试模式" loading={loading}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              className="h-auto justify-start p-4"
              onClick={() =>
                command(
                  "SET_DEVICE_MODE",
                  "开启中兴微 ADB",
                  "设备重启后将开放 ADB 调试接口。",
                  false,
                  { debug_enable: "1" },
                )
              }
            >
              <Usb className="size-5" />
              <span className="text-left">
                <span className="block">开启 ADB</span>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  需要重启
                </span>
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto justify-start p-4"
              onClick={() =>
                command(
                  "SET_DEVICE_MODE",
                  "关闭中兴微 ADB",
                  "关闭调试接口可减少设备暴露面。",
                  false,
                  { debug_enable: "0" },
                )
              }
            >
              <ShieldAlert className="size-5" />
              <span className="text-left">
                <span className="block">关闭 ADB</span>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  需要重启
                </span>
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto justify-start p-4"
              onClick={() =>
                command("REBOOT_DEVICE", "重启设备", "设备会短暂离线并重新建立网络连接。")
              }
            >
              <RefreshCw className="size-5" />
              <span>重启设备</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto justify-start p-4"
              onClick={() =>
                command("TURN_OFF_DEVICE", "关闭设备", "关闭后需要通过物理按键重新开机。")
              }
            >
              <Power className="size-5" />
              <span>关闭设备</span>
            </Button>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-background/55 p-4">
            <div>
              <p className="text-sm font-medium">快速开机</p>
              <p className="mt-1 text-xs text-muted-foreground">缩短设备冷启动时间</p>
            </div>
            <Switch
              label="切换快速开机"
              checked={form.fastBoot}
              disabled={loading}
              onCheckedChange={toggleFastBoot}
            />
          </div>
          <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertTriangle className="size-4" />
              危险操作
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              恢复出厂会清除自定义 Wi-Fi、APN 与高级设置。
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="mt-3"
              onClick={() =>
                command(
                  "RESTORE_FACTORY_SETTINGS",
                  "恢复出厂设置",
                  "所有自定义配置都会被清除，设备将恢复初始状态。",
                  true,
                )
              }
            >
              <RotateCcw />
              恢复出厂设置
            </Button>
          </div>
        </SettingsCard>

        <SettingsCard
          title="设备标识"
          description="修改 USB 虚拟网卡地址与蜂窝模块 IMEI"
          loading={loading}
        >
          <div className="grid gap-5">
            <FormField label="USB 虚拟网卡 MAC 地址">
              <div className="flex gap-2">
                <Input
                  value={form.mac}
                  onChange={(event) => setForm((value) => ({ ...value, mac: event.target.value }))}
                  placeholder="00:11:22:33:44:55"
                  className="font-mono"
                />
                <Button variant="outline" onClick={updateMac}>
                  <Usb />
                  应用
                </Button>
              </div>
            </FormField>
            <FormField label="设备 IMEI">
              <div className="flex gap-2">
                <Input
                  value={form.imei}
                  maxLength={15}
                  onChange={(event) => setForm((value) => ({ ...value, imei: event.target.value }))}
                  className="font-mono"
                />
                <Button variant="outline" onClick={updateImei}>
                  <Cpu />
                  应用
                </Button>
              </div>
            </FormField>
            {passwordEntries.length ? (
              <details className="rounded-xl border border-border bg-muted/25 p-4">
                <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <KeyRound className="size-4 text-primary" />
                  查看设备报告的可能密码
                </summary>
                <div className="mt-4 grid gap-2">
                  {passwordEntries.map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-lg bg-background px-3 py-2"
                    >
                      <span className="text-xs text-muted-foreground">{key}</span>
                      <code className="text-xs">{value}</code>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        </SettingsCard>
      </div>

      <SettingsLayout
        aside={
          <HelpCard title="时间设置">
            <p>自动模式通过 SNTP 服务器同步，适合绝大多数场景。</p>
            <p>手动模式可直接指定设备日期与时间；切换时区后请同时检查夏时制设置。</p>
          </HelpCard>
        }
      >
        <SettingsCard
          title="SNTP 与时区"
          description={`设备当前时间：${form.currentTime || "读取中…"}`}
          loading={loading}
        >
          <form onSubmit={saveTime} className="grid gap-5">
            <FormField label="时间设置模式">
              <NativeSelectWrap>
                <Select
                  value={form.timeMode}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      timeMode: event.target.value as "auto" | "manual",
                    }))
                  }
                >
                  <option value="auto">自动同步 SNTP</option>
                  <option value="manual">手动设置时间</option>
                </Select>
              </NativeSelectWrap>
            </FormField>
            {form.timeMode === "auto" ? (
              <>
                <div className="grid gap-5 sm:grid-cols-3">
                  {(["server1", "server2", "server3"] as const).map((key, index) => (
                    <FormField key={key} label={`SNTP 服务器 ${index + 1}`}>
                      <Input
                        value={form[key]}
                        onChange={(event) =>
                          setForm((value) => ({ ...value, [key]: event.target.value }))
                        }
                      />
                    </FormField>
                  ))}
                </div>
                <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_180px]">
                  <FormField label="时区">
                    <NativeSelectWrap>
                      <Select
                        value={form.timezone}
                        onChange={(event) =>
                          setForm((value) => ({ ...value, timezone: event.target.value }))
                        }
                      >
                        {TIME_ZONES.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    </NativeSelectWrap>
                  </FormField>
                  <FormField label="夏时制">
                    <NativeSelectWrap>
                      <Select
                        value={form.daylight}
                        onChange={(event) =>
                          setForm((value) => ({ ...value, daylight: event.target.value }))
                        }
                      >
                        <option value="0">禁用</option>
                        <option value="1">启用</option>
                      </Select>
                    </NativeSelectWrap>
                  </FormField>
                </div>
              </>
            ) : (
              <FormField label="手动时间">
                <Input
                  type="datetime-local"
                  step="1"
                  value={form.manualTime}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, manualTime: event.target.value }))
                  }
                />
              </FormField>
            )}
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <Clock3 />
                保存时间设置
              </Button>
            </div>
          </form>
        </SettingsCard>
      </SettingsLayout>
    </div>
  );
}
