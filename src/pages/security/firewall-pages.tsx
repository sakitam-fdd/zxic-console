import {
  ArrowRightLeft,
  Baby,
  Filter,
  Gauge,
  Globe2,
  Link2,
  MapPinned,
  Network,
  Plus,
  Save,
  Shield,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
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
import { submitDevice } from "@/features/device/actions";
import { getApi, getValues, postApi } from "@/features/device/api";
import { useConfirm } from "@/features/feedback/confirm-provider";
import { cn, isIpv4 } from "@/lib/utils";

const firewallLinks = [
  {
    path: "/security/port-filter",
    title: "端口过滤",
    description: "按 IP / 端口 / 协议放行或拦截",
    icon: Filter,
  },
  {
    path: "/security/port-forward",
    title: "端口转发",
    description: "将外网端口映射到内网主机",
    icon: ArrowRightLeft,
  },
  {
    path: "/security/port-map",
    title: "端口映射",
    description: "虚拟服务器 / Port Map 规则",
    icon: MapPinned,
  },
  {
    path: "/security/upnp",
    title: "UPnP",
    description: "允许应用自动申请端口映射",
    icon: Network,
  },
  {
    path: "/security/dmz",
    title: "DMZ",
    description: "将一台主机暴露到公网侧",
    icon: Shield,
  },
  {
    path: "/security/rate-limit",
    title: "速率限制",
    description: "限制指定 IP 的上下行速度",
    icon: Gauge,
  },
  {
    path: "/security/url-filter",
    title: "URL 过滤",
    description: "按网址关键字拦截访问",
    icon: Globe2,
  },
  {
    path: "/security/parental",
    title: "家长控制",
    description: "儿童组设备与站点白名单",
    icon: Baby,
  },
];

/** 防火墙入口 · 原厂 #filter_main */
export function FirewallHubPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Security"
        title="防火墙"
        description="管理端口过滤、转发、映射、UPnP、DMZ、限速与家长控制。"
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {firewallLinks.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "rounded-2xl border border-border bg-card p-4 transition hover:border-primary/30 hover:bg-primary/5",
                isActive && "border-primary/40 bg-primary/8",
              )
            }
          >
            <item.icon className="size-5 text-primary" />
            <p className="mt-3 font-medium">{item.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
          </NavLink>
        ))}
      </div>
    </div>
  );
}

interface NamedRule {
  index: number;
  raw: string;
}

function collectRules(data: Record<string, string>, prefix: string, count = 10): NamedRule[] {
  const rules: NamedRule[] = [];
  for (let index = 0; index < count; index += 1) {
    const raw = data[`${prefix}${index}`];
    if (raw) rules.push({ index, raw });
  }
  return rules;
}

/** IP / 端口过滤 */
export function PortFilterPage() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [policy, setPolicy] = useState("0");
  const [rules, setRules] = useState<NamedRule[]>([]);
  const [form, setForm] = useState({
    mac: "",
    destIp: "",
    sourceIp: "",
    destFrom: "0",
    destTo: "0",
    sourceFrom: "0",
    sourceTo: "0",
    action: "Drop",
    protocol: "TCP",
    comment: "",
    ipVersion: "ipv4",
  });
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fields = [
        "IPPortFilterEnable",
        "DefaultFirewallPolicy",
        ...Array.from({ length: 10 }, (_, index) => `IPPortFilterRules_${index}`),
      ];
      const data = await getValues(fields, true);
      setEnabled(data.IPPortFilterEnable === "1");
      setPolicy(data.DefaultFirewallPolicy || "0");
      setRules(collectRules(data, "IPPortFilterRules_"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "读取失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveBasic() {
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "BASIC_SETTING",
          portFilterEnabled: enabled ? "1" : "0",
          defaultFirewallPolicy: policy,
        }),
        "端口过滤开关已保存",
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function addRule(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "ADD_IP_PORT_FILETER_V4V6",
          ip_version: form.ipVersion,
          mac_address: form.mac,
          dip_address: form.destIp,
          sip_address: form.sourceIp,
          dFromPort: form.destFrom,
          dToPort: form.destTo,
          sFromPort: form.sourceFrom,
          sToPort: form.sourceTo,
          action: form.action,
          protocol: form.protocol,
          comment: form.comment,
        }),
        "过滤规则已添加",
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "添加失败");
    } finally {
      setLoading(false);
    }
  }

  async function deleteRule(index: number) {
    if (
      !(await confirm({
        title: "删除过滤规则？",
        description: `将删除索引 ${index} 的规则。`,
        confirmLabel: "删除",
        destructive: true,
      }))
    )
      return;
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "DEL_IP_PORT_FILETER_V4V6",
          delete_id: `${index};`,
        }),
        "规则已删除",
      );
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
        eyebrow="Port filter"
        title="端口过滤"
        description="按地址、端口与协议允许或丢弃流量。"
        actions={
          <NavLink
            to="/security/firewall"
            className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition hover:bg-muted"
          >
            返回防火墙
          </NavLink>
        }
      />
      <SettingsLayout
        aside={
          <HelpCard>
            <p>默认策略决定未匹配规则时的行为。</p>
            <p>规则字段需与固件一致；复杂场景建议先在原厂页面核对。</p>
          </HelpCard>
        }
      >
        <SettingsCard title="过滤开关" description="BASIC_SETTING" loading={loading}>
          <div className="grid gap-5">
            <div className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <p className="text-sm font-medium">启用端口过滤</p>
                <p className="mt-1 text-xs text-muted-foreground">关闭后规则不生效</p>
              </div>
              <Switch label="启用端口过滤" checked={enabled} onCheckedChange={setEnabled} />
            </div>
            <FormField label="默认策略">
              <NativeSelectWrap>
                <Select value={policy} onChange={(event) => setPolicy(event.target.value)}>
                  <option value="0">接受（Accept）</option>
                  <option value="1">丢弃（Drop）</option>
                </Select>
              </NativeSelectWrap>
            </FormField>
            <div className="flex justify-end">
              <Button onClick={saveBasic} loading={loading}>
                <Save />
                保存开关
              </Button>
            </div>
          </div>
        </SettingsCard>

        <div className="mt-5">
          <SettingsCard title="添加规则" description="ADD_IP_PORT_FILETER_V4V6" loading={loading}>
            <form onSubmit={addRule} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="协议">
                  <NativeSelectWrap>
                    <Select
                      value={form.protocol}
                      onChange={(event) =>
                        setForm((value) => ({ ...value, protocol: event.target.value }))
                      }
                    >
                      <option value="TCP">TCP</option>
                      <option value="UDP">UDP</option>
                      <option value="TCP&UDP">TCP & UDP</option>
                      <option value="ICMP">ICMP</option>
                      <option value="None">None</option>
                    </Select>
                  </NativeSelectWrap>
                </FormField>
                <FormField label="动作">
                  <NativeSelectWrap>
                    <Select
                      value={form.action}
                      onChange={(event) =>
                        setForm((value) => ({ ...value, action: event.target.value }))
                      }
                    >
                      <option value="Drop">丢弃</option>
                      <option value="Accept">接受</option>
                    </Select>
                  </NativeSelectWrap>
                </FormField>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="源 IP">
                  <Input
                    value={form.sourceIp}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, sourceIp: event.target.value }))
                    }
                  />
                </FormField>
                <FormField label="目的 IP">
                  <Input
                    value={form.destIp}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, destIp: event.target.value }))
                    }
                  />
                </FormField>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="源端口起止">
                  <div className="flex gap-2">
                    <Input
                      value={form.sourceFrom}
                      onChange={(event) =>
                        setForm((value) => ({ ...value, sourceFrom: event.target.value }))
                      }
                    />
                    <Input
                      value={form.sourceTo}
                      onChange={(event) =>
                        setForm((value) => ({ ...value, sourceTo: event.target.value }))
                      }
                    />
                  </div>
                </FormField>
                <FormField label="目的端口起止">
                  <div className="flex gap-2">
                    <Input
                      value={form.destFrom}
                      onChange={(event) =>
                        setForm((value) => ({ ...value, destFrom: event.target.value }))
                      }
                    />
                    <Input
                      value={form.destTo}
                      onChange={(event) =>
                        setForm((value) => ({ ...value, destTo: event.target.value }))
                      }
                    />
                  </div>
                </FormField>
              </div>
              <FormField label="MAC（可选）">
                <Input
                  className="font-mono"
                  value={form.mac}
                  onChange={(event) => setForm((value) => ({ ...value, mac: event.target.value }))}
                />
              </FormField>
              <FormField label="备注">
                <Input
                  value={form.comment}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, comment: event.target.value }))
                  }
                />
              </FormField>
              <div className="flex justify-end">
                <Button type="submit" loading={loading}>
                  <Plus />
                  添加规则
                </Button>
              </div>
            </form>
          </SettingsCard>
        </div>

        <div className="mt-5">
          <SettingsCard title="现有规则" description={`${rules.length} 条`} loading={loading}>
            {rules.length ? (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div
                    key={rule.index}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-3"
                  >
                    <div className="min-w-0">
                      <Badge variant="secondary">#{rule.index}</Badge>
                      <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                        {rule.raw}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteRule(rule.index)}
                      aria-label="删除规则"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="暂无规则" description="添加后会显示设备返回的原始规则串。" />
            )}
          </SettingsCard>
        </div>
      </SettingsLayout>
    </div>
  );
}

/** 端口转发 */
export function PortForwardPage() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [rules, setRules] = useState<NamedRule[]>([]);
  const [form, setForm] = useState({
    ip: "",
    portStart: "",
    portEnd: "",
    protocol: "TCP",
    comment: "",
  });
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fields = [
        "PortForwardEnable",
        ...Array.from({ length: 10 }, (_, index) => `PortForwardRules_${index}`),
      ];
      const data = await getValues(fields, true);
      setEnabled(data.PortForwardEnable === "1");
      setRules(collectRules(data, "PortForwardRules_"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "读取失败");
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
        postApi({ goformId: "VIRTUAL_SERVER", PortForwardEnable: next ? "1" : "0" }),
        next ? "端口转发已启用" : "端口转发已关闭",
      );
    } catch (error) {
      setEnabled(!next);
      toast.error(error instanceof Error ? error.message : "设置失败");
    } finally {
      setLoading(false);
    }
  }

  async function addRule(event: React.FormEvent) {
    event.preventDefault();
    if (!isIpv4(form.ip) || !form.portStart) {
      toast.error("请填写有效内网 IP 与端口");
      return;
    }
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "FW_FORWARD_ADD",
          ipAddress: form.ip,
          portStart: form.portStart,
          portEnd: form.portEnd || form.portStart,
          protocol: form.protocol,
          comment: form.comment,
        }),
        "转发规则已添加",
      );
      setForm({ ip: "", portStart: "", portEnd: "", protocol: "TCP", comment: "" });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "添加失败");
    } finally {
      setLoading(false);
    }
  }

  async function deleteRule(index: number) {
    if (
      !(await confirm({
        title: "删除转发规则？",
        description: `将删除索引 ${index}。`,
        confirmLabel: "删除",
        destructive: true,
      }))
    )
      return;
    setLoading(true);
    try {
      await submitDevice(
        postApi({ goformId: "FW_FORWARD_DEL", delete_id: `${index};` }),
        "规则已删除",
      );
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
        eyebrow="Port forward"
        title="端口转发"
        description="将外网访问转发到指定内网主机与端口。"
        actions={
          <div className="flex items-center gap-3 rounded-full border border-border bg-card px-3 py-1.5">
            <span className="text-xs font-medium">转发</span>
            <Switch label="启用端口转发" checked={enabled} onCheckedChange={toggle} />
          </div>
        }
      />
      <SettingsLayout
        aside={
          <HelpCard>
            <p>蜂窝网络常处于 CGNAT，外网主动访问可能仍不可达。</p>
            <p>结束端口可留空，设备将按起始端口处理。</p>
          </HelpCard>
        }
      >
        <SettingsCard title="添加转发" description="FW_FORWARD_ADD" loading={loading}>
          <form onSubmit={addRule} className="grid gap-4">
            <FormField label="内网 IP">
              <Input
                value={form.ip}
                onChange={(event) => setForm((value) => ({ ...value, ip: event.target.value }))}
                placeholder="192.168.0.100"
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="起始端口">
                <Input
                  value={form.portStart}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, portStart: event.target.value }))
                  }
                />
              </FormField>
              <FormField label="结束端口">
                <Input
                  value={form.portEnd}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, portEnd: event.target.value }))
                  }
                />
              </FormField>
              <FormField label="协议">
                <NativeSelectWrap>
                  <Select
                    value={form.protocol}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, protocol: event.target.value }))
                    }
                  >
                    <option value="TCP">TCP</option>
                    <option value="UDP">UDP</option>
                    <option value="TCP&UDP">TCP & UDP</option>
                  </Select>
                </NativeSelectWrap>
              </FormField>
            </div>
            <FormField label="备注">
              <Input
                value={form.comment}
                onChange={(event) =>
                  setForm((value) => ({ ...value, comment: event.target.value }))
                }
              />
            </FormField>
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <Plus />
                添加规则
              </Button>
            </div>
          </form>
        </SettingsCard>
        <div className="mt-5">
          <SettingsCard title="现有规则" description={`${rules.length} 条`} loading={loading}>
            {rules.length ? (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div
                    key={rule.index}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-3"
                  >
                    <p className="break-all font-mono text-xs">{rule.raw}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteRule(rule.index)}
                      aria-label="删除"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="暂无转发规则" description="添加后显示在这里。" />
            )}
          </SettingsCard>
        </div>
      </SettingsLayout>
    </div>
  );
}

/** 端口映射 */
export function PortMapPage() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [rules, setRules] = useState<NamedRule[]>([]);
  const [form, setForm] = useState({
    sourcePort: "",
    destIp: "",
    destPort: "",
    protocol: "TCP",
    comment: "",
  });
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fields = [
        "PortMapEnable",
        ...Array.from({ length: 10 }, (_, index) => `PortMapRules_${index}`),
      ];
      const data = await getValues(fields, true);
      setEnabled(data.PortMapEnable === "1");
      setRules(collectRules(data, "PortMapRules_"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "读取失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addRule(event: React.FormEvent) {
    event.preventDefault();
    if (!form.sourcePort || !isIpv4(form.destIp) || !form.destPort) {
      toast.error("请填写源端口、目标 IP 与目标端口");
      return;
    }
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "ADD_PORT_MAP",
          portMapEnabled: enabled ? "1" : "1",
          fromPort: form.sourcePort,
          ip_address: form.destIp,
          toPort: form.destPort,
          protocol: form.protocol,
          comment: form.comment,
        }),
        "端口映射已添加",
      );
      setForm({ sourcePort: "", destIp: "", destPort: "", protocol: "TCP", comment: "" });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "添加失败");
    } finally {
      setLoading(false);
    }
  }

  async function deleteRule(index: number) {
    if (
      !(await confirm({
        title: "删除端口映射？",
        description: `将删除索引 ${index}。`,
        confirmLabel: "删除",
        destructive: true,
      }))
    )
      return;
    setLoading(true);
    try {
      await submitDevice(
        postApi({ goformId: "DEL_PORT_MAP", delete_id: `${index};` }),
        "映射已删除",
      );
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
        eyebrow="Port map"
        title="端口映射"
        description="配置源端口到内网主机目标端口的映射规则。"
        actions={<Badge variant="secondary">{enabled ? "已启用" : "未启用"}</Badge>}
      />
      <SettingsLayout
        aside={
          <HelpCard>
            <p>与端口转发类似，字段以固件 ADD_PORT_MAP 为准。</p>
          </HelpCard>
        }
      >
        <SettingsCard title="添加映射" description="ADD_PORT_MAP" loading={loading}>
          <form onSubmit={addRule} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="源端口">
                <Input
                  value={form.sourcePort}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, sourcePort: event.target.value }))
                  }
                />
              </FormField>
              <FormField label="目标端口">
                <Input
                  value={form.destPort}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, destPort: event.target.value }))
                  }
                />
              </FormField>
              <FormField label="协议">
                <NativeSelectWrap>
                  <Select
                    value={form.protocol}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, protocol: event.target.value }))
                    }
                  >
                    <option value="TCP">TCP</option>
                    <option value="UDP">UDP</option>
                    <option value="TCP&UDP">TCP & UDP</option>
                  </Select>
                </NativeSelectWrap>
              </FormField>
            </div>
            <FormField label="目标 IP">
              <Input
                value={form.destIp}
                onChange={(event) => setForm((value) => ({ ...value, destIp: event.target.value }))}
              />
            </FormField>
            <FormField label="备注">
              <Input
                value={form.comment}
                onChange={(event) =>
                  setForm((value) => ({ ...value, comment: event.target.value }))
                }
              />
            </FormField>
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <Plus />
                添加映射
              </Button>
            </div>
          </form>
        </SettingsCard>
        <div className="mt-5">
          <SettingsCard title="现有映射" description={`${rules.length} 条`} loading={loading}>
            {rules.length ? (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div
                    key={rule.index}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-3"
                  >
                    <p className="break-all font-mono text-xs">{rule.raw}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteRule(rule.index)}
                      aria-label="删除"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="暂无映射" description="添加后显示在这里。" />
            )}
          </SettingsCard>
        </div>
      </SettingsLayout>
    </div>
  );
}

/** UPnP */
export function UpnpPage() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    getValues(["upnp_setting_option"], true)
      .then((data) => setEnabled(data.upnp_setting_option === "1"))
      .catch((error) => toast.error(error instanceof Error ? error.message : "读取失败"))
      .finally(() => setLoading(false));
  }, []);

  async function save(next: boolean) {
    setEnabled(next);
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "UPNP_SETTING",
          upnp_setting_option: next ? "1" : "0",
        }),
        next ? "UPnP 已启用" : "UPnP 已关闭",
      );
    } catch (error) {
      setEnabled(!next);
      toast.error(error instanceof Error ? error.message : "设置失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="UPnP" title="UPnP 设置" description="允许兼容应用自动创建端口映射。" />
      <SettingsLayout
        aside={
          <HelpCard>
            <p>UPnP 方便但会扩大攻击面，仅在可信局域网环境建议开启。</p>
          </HelpCard>
        }
      >
        <SettingsCard title="UPnP" description="UPNP_SETTING" loading={loading}>
          <div className="flex items-center justify-between rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-medium">启用 UPnP</p>
              <p className="mt-1 text-xs text-muted-foreground">upnp_setting_option</p>
            </div>
            <Switch label="启用 UPnP" checked={enabled} disabled={loading} onCheckedChange={save} />
          </div>
        </SettingsCard>
      </SettingsLayout>
    </div>
  );
}

/** DMZ */
export function DmzPage() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [ip, setIp] = useState("");

  useEffect(() => {
    getValues(["DMZEnable", "DMZIPAddress"], true)
      .then((data) => {
        setEnabled(data.DMZEnable === "1");
        setIp(data.DMZIPAddress || "");
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "读取失败"))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (enabled && !isIpv4(ip)) {
      toast.error("启用 DMZ 时需填写有效 IP");
      return;
    }
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "DMZ_SETTING",
          DMZEnabled: enabled ? "1" : "0",
          ...(enabled ? { DMZIPAddress: ip } : {}),
        }),
        "DMZ 设置已保存",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="DMZ"
        title="DMZ 设置"
        description="将一台内网主机置于非军事区，暴露全部端口。"
        actions={<Badge variant="warning">高风险</Badge>}
      />
      <SettingsLayout
        aside={
          <HelpCard title="安全提示">
            <p>DMZ 主机几乎不受防火墙保护，仅用于临时联调。</p>
          </HelpCard>
        }
      >
        <SettingsCard title="DMZ 主机" description="DMZ_SETTING" loading={loading}>
          <form onSubmit={submit} className="grid gap-5">
            <div className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <p className="text-sm font-medium">启用 DMZ</p>
                <p className="mt-1 text-xs text-muted-foreground">DMZEnabled</p>
              </div>
              <Switch label="启用 DMZ" checked={enabled} onCheckedChange={setEnabled} />
            </div>
            <FormField label="DMZ IP 地址" htmlFor="dmz-ip">
              <Input
                id="dmz-ip"
                value={ip}
                disabled={!enabled}
                onChange={(event) => setIp(event.target.value)}
                placeholder="192.168.0.50"
              />
            </FormField>
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <Save />
                保存 DMZ
              </Button>
            </div>
          </form>
        </SettingsCard>
      </SettingsLayout>
    </div>
  );
}

/** 速率限制 */
export function RateLimitPage() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [rules, setRules] = useState<NamedRule[]>([]);
  const [form, setForm] = useState({
    ip: "",
    download: "",
    upload: "",
    comment: "",
  });
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fields = [
        "RateLimitEnable",
        ...Array.from({ length: 10 }, (_, index) => `RateLimitRules_${index}`),
      ];
      const data = await getValues(fields, true);
      setEnabled(data.RateLimitEnable === "1");
      setRules(collectRules(data, "RateLimitRules_"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "读取失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addRule(event: React.FormEvent) {
    event.preventDefault();
    if (!isIpv4(form.ip)) {
      toast.error("请输入有效 IP");
      return;
    }
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "ADD_RATE_LIMIT",
          RateLimitEnable: "1",
          ip_address: form.ip,
          download_speed: form.download,
          upload_speed: form.upload,
          comment: form.comment,
        }),
        "限速规则已添加",
      );
      setEnabled(true);
      setForm({ ip: "", download: "", upload: "", comment: "" });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "添加失败");
    } finally {
      setLoading(false);
    }
  }

  async function deleteRule(index: number) {
    if (
      !(await confirm({
        title: "删除限速规则？",
        description: `将删除索引 ${index}。`,
        confirmLabel: "删除",
        destructive: true,
      }))
    )
      return;
    setLoading(true);
    try {
      await submitDevice(
        postApi({ goformId: "DEL_RATE_LIMIT", delete_id: `${index};` }),
        "规则已删除",
      );
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
        eyebrow="Rate limit"
        title="速率限制"
        description="限制指定内网 IP 的下载与上传速度。"
        actions={<Badge variant="secondary">{enabled ? "已启用" : "未启用"}</Badge>}
      />
      <SettingsLayout
        aside={
          <HelpCard>
            <p>速度单位以设备固件为准，常见为 KB/s。</p>
          </HelpCard>
        }
      >
        <SettingsCard title="添加限速" description="ADD_RATE_LIMIT" loading={loading}>
          <form onSubmit={addRule} className="grid gap-4">
            <FormField label="IP 地址">
              <Input
                value={form.ip}
                onChange={(event) => setForm((value) => ({ ...value, ip: event.target.value }))}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="下载速度">
                <Input
                  value={form.download}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, download: event.target.value }))
                  }
                />
              </FormField>
              <FormField label="上传速度">
                <Input
                  value={form.upload}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, upload: event.target.value }))
                  }
                />
              </FormField>
            </div>
            <FormField label="备注">
              <Input
                value={form.comment}
                onChange={(event) =>
                  setForm((value) => ({ ...value, comment: event.target.value }))
                }
              />
            </FormField>
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <Plus />
                添加规则
              </Button>
            </div>
          </form>
        </SettingsCard>
        <div className="mt-5">
          <SettingsCard title="现有规则" description={`${rules.length} 条`} loading={loading}>
            {rules.length ? (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div
                    key={rule.index}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-3"
                  >
                    <p className="break-all font-mono text-xs">{rule.raw}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteRule(rule.index)}
                      aria-label="删除"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="暂无限速规则" description="添加后显示在这里。" />
            )}
          </SettingsCard>
        </div>
      </SettingsLayout>
    </div>
  );
}

/** URL 过滤 */
export function UrlFilterPage() {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<Array<{ index: number; url: string }>>([]);
  const [url, setUrl] = useState("");
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getApi("cmd=websURLFilters", true);
      const raw = data.websURLFilters || "";
      setRules(
        raw
          ? raw
              .split(";")
              .filter(Boolean)
              .map((item, index) => ({ index, url: item }))
          : [],
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "读取失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addRule(event: React.FormEvent) {
    event.preventDefault();
    if (!url.trim()) {
      toast.error("请输入 URL 或关键字");
      return;
    }
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "URL_FILTER_ADD",
          addURLFilter: url.trim(),
        }),
        "URL 过滤已添加",
      );
      setUrl("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "添加失败");
    } finally {
      setLoading(false);
    }
  }

  async function deleteRule(index: number) {
    if (
      !(await confirm({
        title: "删除 URL 规则？",
        description: `将删除索引 ${index}。`,
        confirmLabel: "删除",
        destructive: true,
      }))
    )
      return;
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "URL_FILTER_DELETE",
          url_filter_delete_id: `${index};`,
        }),
        "规则已删除",
      );
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
        eyebrow="URL filter"
        title="URL 过滤"
        description="按网址或关键字拦截客户端访问。"
      />
      <SettingsLayout
        aside={
          <HelpCard>
            <p>部分固件按关键字匹配，不一定需要完整 URL。</p>
          </HelpCard>
        }
      >
        <SettingsCard title="添加 URL" description="URL_FILTER_ADD" loading={loading}>
          <form onSubmit={addRule} className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="example.com 或关键字"
            />
            <Button type="submit" loading={loading}>
              <Plus />
              添加
            </Button>
          </form>
        </SettingsCard>
        <div className="mt-5">
          <SettingsCard title="过滤列表" description={`${rules.length} 条`} loading={loading}>
            {rules.length ? (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div
                    key={rule.index}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-3"
                  >
                    <p className="truncate text-sm">{rule.url}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteRule(rule.index)}
                      aria-label="删除"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="暂无 URL 规则" description="添加后显示在这里。" />
            )}
          </SettingsCard>
        </div>
      </SettingsLayout>
    </div>
  );
}

/** 家长控制 */
export function ParentalControlPage() {
  const [loading, setLoading] = useState(true);
  const [mac, setMac] = useState("");
  const [devices, setDevices] = useState<Array<{ mac: string; hostname?: string }>>([]);
  const [siteName, setSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [sites, setSites] = useState<Array<{ id?: string; name?: string; site?: string }>>([]);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [child, white] = await Promise.all([
        getApi("cmd=child_group_list", true).catch(() => ({}) as Record<string, unknown>),
        getApi("cmd=site_white_list", true).catch(() => ({}) as Record<string, unknown>),
      ]);
      const deviceList =
        (child.child_group_list as Array<{ mac: string; hostname?: string }> | undefined) ||
        (child.devices as Array<{ mac: string; hostname?: string }> | undefined) ||
        [];
      setDevices(Array.isArray(deviceList) ? deviceList : []);
      const siteList =
        (white.site_white_list as
          | Array<{ id?: string; name?: string; site?: string }>
          | undefined) ||
        (white.siteList as Array<{ id?: string; name?: string; site?: string }> | undefined) ||
        [];
      setSites(Array.isArray(siteList) ? siteList : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "读取失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addDevice(event: React.FormEvent) {
    event.preventDefault();
    const value = mac.trim().toUpperCase();
    if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(value)) {
      toast.error("请输入有效 MAC 地址");
      return;
    }
    setLoading(true);
    try {
      await submitDevice(postApi({ goformId: "ADD_DEVICE", mac: value }), "已加入儿童组");
      setMac("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "添加失败");
    } finally {
      setLoading(false);
    }
  }

  async function removeDevice(deviceMac: string) {
    if (
      !(await confirm({
        title: "移出儿童组？",
        description: `将移除 ${deviceMac}。`,
        confirmLabel: "移除",
        destructive: true,
      }))
    )
      return;
    setLoading(true);
    try {
      await submitDevice(postApi({ goformId: "DEL_DEVICE", mac: deviceMac }), "已移出儿童组");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "移除失败");
    } finally {
      setLoading(false);
    }
  }

  async function addSite(event: React.FormEvent) {
    event.preventDefault();
    if (!siteUrl.trim()) {
      toast.error("请填写站点");
      return;
    }
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "ADD_WHITE_SITE",
          name: siteName.trim() || siteUrl.trim(),
          site: siteUrl.trim(),
        }),
        "白名单站点已添加",
      );
      setSiteName("");
      setSiteUrl("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "添加失败");
    } finally {
      setLoading(false);
    }
  }

  async function removeSite(id: string) {
    setLoading(true);
    try {
      await submitDevice(postApi({ goformId: "REMOVE_WHITE_SITE", ids: id }), "白名单站点已删除");
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
        eyebrow="Parental control"
        title="家长控制"
        description="将设备加入儿童组，并维护可选的站点白名单。"
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <SettingsCard title="儿童组设备" description="ADD_DEVICE / DEL_DEVICE" loading={loading}>
          <form onSubmit={addDevice} className="mb-5 flex flex-col gap-2 sm:flex-row">
            <Input
              className="font-mono"
              value={mac}
              onChange={(event) => setMac(event.target.value)}
              placeholder="AA:BB:CC:DD:EE:FF"
            />
            <Button type="submit" loading={loading}>
              <Plus />
              加入
            </Button>
          </form>
          {devices.length ? (
            <div className="space-y-2">
              {devices.map((device) => (
                <div
                  key={device.mac}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{device.hostname || "未命名设备"}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">{device.mac}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => removeDevice(device.mac)}
                    aria-label="移除设备"
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="儿童组为空" description="输入 MAC 将设备加入儿童组。" />
          )}
        </SettingsCard>

        <SettingsCard title="站点白名单" description="ADD_WHITE_SITE" loading={loading}>
          <form onSubmit={addSite} className="mb-5 grid gap-3">
            <FormField label="名称">
              <Input
                value={siteName}
                onChange={(event) => setSiteName(event.target.value)}
                placeholder="可选"
              />
            </FormField>
            <FormField label="站点">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={siteUrl}
                  onChange={(event) => setSiteUrl(event.target.value)}
                  placeholder="www.example.com"
                />
                <Button type="submit" loading={loading}>
                  <Link2 />
                  添加
                </Button>
              </div>
            </FormField>
          </form>
          {sites.length ? (
            <div className="space-y-2">
              {sites.map((site, index) => (
                <div
                  key={site.id || `${site.site}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{site.name || site.site}</p>
                    <p className="truncate text-xs text-muted-foreground">{site.site}</p>
                  </div>
                  {site.id ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => removeSite(String(site.id))}
                      aria-label="删除站点"
                    >
                      <Trash2 />
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="白名单为空" description="可为儿童组添加允许访问的站点。" />
          )}
        </SettingsCard>
      </div>
    </div>
  );
}
