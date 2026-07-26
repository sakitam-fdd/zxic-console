import { Download, KeyRound, RefreshCw, Save, ShieldAlert } from "lucide-react";
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
} from "@/components/ui/primitives";
import { submitDevice } from "@/features/device/actions";
import { getValues, postApi } from "@/features/device/api";

/** SIM PIN / PUK · 原厂 #pin_mode */
export function PinPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [pinTries, setPinTries] = useState("");
  const [pukTries, setPukTries] = useState("");
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pin, setPin] = useState("");
  const [puk, setPuk] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getValues(["pin_status", "pinnumber", "puknumber"], true);
      setStatus(data.pin_status || "");
      setPinTries(data.pinnumber || "");
      setPukTries(data.puknumber || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "PIN 状态读取失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function enablePin() {
    if (!/^\d{4,8}$/.test(oldPin)) {
      toast.error("请输入 4–8 位 PIN 码");
      return;
    }
    setLoading(true);
    try {
      await submitDevice(postApi({ goformId: "ENABLE_PIN", OldPinNumber: oldPin }), "PIN 码已启用");
      setOldPin("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "启用失败");
    } finally {
      setLoading(false);
    }
  }

  async function disablePin() {
    if (!/^\d{4,8}$/.test(oldPin)) {
      toast.error("请输入当前 PIN 码");
      return;
    }
    setLoading(true);
    try {
      await submitDevice(
        postApi({ goformId: "DISABLE_PIN", OldPinNumber: oldPin }),
        "PIN 码已关闭",
      );
      setOldPin("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "关闭失败");
    } finally {
      setLoading(false);
    }
  }

  async function changePin() {
    if (!/^\d{4,8}$/.test(oldPin) || !/^\d{4,8}$/.test(newPin)) {
      toast.error("新旧 PIN 均需为 4–8 位数字");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("两次输入的新 PIN 不一致");
      return;
    }
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "ENABLE_PIN",
          OldPinNumber: oldPin,
          NewPinNumber: newPin,
        }),
        "PIN 码已修改",
      );
      setOldPin("");
      setNewPin("");
      setConfirmPin("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "修改失败");
    } finally {
      setLoading(false);
    }
  }

  async function enterPin() {
    if (!/^\d{4,8}$/.test(pin)) {
      toast.error("请输入有效 PIN 码");
      return;
    }
    setLoading(true);
    try {
      await submitDevice(postApi({ goformId: "ENTER_PIN", PinNumber: pin }), "PIN 已提交");
      setPin("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "解锁失败");
    } finally {
      setLoading(false);
    }
  }

  async function enterPuk() {
    if (!/^\d{8}$/.test(puk) || !/^\d{4,8}$/.test(pin)) {
      toast.error("PUK 需 8 位，新 PIN 需 4–8 位");
      return;
    }
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "ENTER_PUK",
          PUKNumber: puk,
          PinNumber: pin,
        }),
        "PUK 已提交",
      );
      setPuk("");
      setPin("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "PUK 解锁失败");
    } finally {
      setLoading(false);
    }
  }

  const statusLabel =
    status === "0" || status === "unlocked"
      ? "未锁定"
      : status === "1" || status === "locked"
        ? "需要 PIN"
        : status === "2" || status === "puk_locked"
          ? "需要 PUK"
          : status || "未知";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SIM security"
        title="PIN / PUK"
        description="启用、关闭或修改 SIM PIN，并在锁定时输入 PIN 或 PUK 解锁。"
        actions={
          <Badge variant={statusLabel === "未锁定" ? "success" : "warning"}>{statusLabel}</Badge>
        }
      />
      <SettingsLayout
        aside={
          <HelpCard title="谨慎操作">
            <p>连续输错 PIN / PUK 可能导致 SIM 永久锁定。</p>
            <p>
              剩余尝试次数：PIN {pinTries || "—"}，PUK {pukTries || "—"}。
            </p>
          </HelpCard>
        }
      >
        <div className="grid gap-5">
          <SettingsCard
            title="启用 / 关闭 PIN"
            description="ENABLE_PIN / DISABLE_PIN"
            loading={loading}
          >
            <FormField label="当前 PIN" htmlFor="pin-old">
              <Input
                id="pin-old"
                type="password"
                inputMode="numeric"
                value={oldPin}
                onChange={(event) => setOldPin(event.target.value)}
              />
            </FormField>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={disablePin} loading={loading}>
                关闭 PIN
              </Button>
              <Button onClick={enablePin} loading={loading}>
                <KeyRound />
                启用 PIN
              </Button>
            </div>
          </SettingsCard>

          <SettingsCard
            title="修改 PIN"
            description="提交 OldPinNumber + NewPinNumber"
            loading={loading}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="新 PIN" htmlFor="pin-new">
                <Input
                  id="pin-new"
                  type="password"
                  inputMode="numeric"
                  value={newPin}
                  onChange={(event) => setNewPin(event.target.value)}
                />
              </FormField>
              <FormField label="确认新 PIN" htmlFor="pin-confirm">
                <Input
                  id="pin-confirm"
                  type="password"
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(event) => setConfirmPin(event.target.value)}
                />
              </FormField>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={changePin} loading={loading}>
                <Save />
                修改 PIN
              </Button>
            </div>
          </SettingsCard>

          <SettingsCard title="输入 PIN 解锁" description="ENTER_PIN" loading={loading}>
            <FormField label="PIN 码" htmlFor="enter-pin">
              <Input
                id="enter-pin"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
              />
            </FormField>
            <div className="mt-5 flex justify-end">
              <Button onClick={enterPin} loading={loading}>
                提交 PIN
              </Button>
            </div>
          </SettingsCard>

          <SettingsCard
            title="PUK 解锁"
            description="ENTER_PUK · 错误次数耗尽将永久锁定 SIM"
            loading={loading}
          >
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/8 p-3 text-xs text-amber-800 dark:text-amber-200">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              仅在设备提示需要 PUK 时使用，并准备好运营商提供的 PUK 与新 PIN。
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="PUK 码" htmlFor="puk">
                <Input
                  id="puk"
                  type="password"
                  inputMode="numeric"
                  value={puk}
                  onChange={(event) => setPuk(event.target.value)}
                />
              </FormField>
              <FormField label="新 PIN" htmlFor="puk-pin">
                <Input
                  id="puk-pin"
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(event) => setPin(event.target.value)}
                />
              </FormField>
            </div>
            <div className="mt-5 flex justify-end">
              <Button variant="destructive" onClick={enterPuk} loading={loading}>
                提交 PUK
              </Button>
            </div>
          </SettingsCard>
        </div>
      </SettingsLayout>
    </div>
  );
}

/** 系统在线升级 FOTA · 原厂 #fota */
export function FotaPage() {
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [form, setForm] = useState({
    updateMode: "0",
    intervalDay: "7",
    allowRoaming: false,
    notice: true,
    newVersion: "",
    upgradeState: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getValues(
        [
          "fota_updateMode",
          "fota_updateIntervalDay",
          "fota_allowRoamingUpdate",
          "fota_new_version_state",
          "fota_current_upgrade_state",
          "upgrade_notice_flag",
        ],
        true,
      );
      setForm({
        updateMode: data.fota_updateMode || "0",
        intervalDay: data.fota_updateIntervalDay || "7",
        allowRoaming: data.fota_allowRoamingUpdate === "1",
        notice: data.upgrade_notice_flag !== "0",
        newVersion: data.fota_new_version_state || "",
        upgradeState: data.fota_current_upgrade_state || "",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "升级信息读取失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function checkUpdate() {
    setChecking(true);
    try {
      await submitDevice(
        postApi({
          goformId: "IF_UPGRADE",
          select_op: "check",
          ota_manual_check_roam_state: "1",
        }),
        "已开始检查更新",
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "检查失败");
    } finally {
      setChecking(false);
    }
  }

  async function saveNotice(enabled: boolean) {
    setForm((value) => ({ ...value, notice: enabled }));
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "SET_UPGRADE_NOTICE",
          upgrade_notice_flag: enabled ? "1" : "0",
          notCallback: "true",
        }),
        enabled ? "升级通知已开启" : "升级通知已关闭",
      );
    } catch (error) {
      setForm((value) => ({ ...value, notice: !enabled }));
      toast.error(error instanceof Error ? error.message : "设置失败");
    } finally {
      setLoading(false);
    }
  }

  async function saveAutoSettings(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await submitDevice(
        postApi({
          goformId: "SetUpgAutoSetting",
          UpgMode: form.updateMode,
          UpgIntervalDay: form.intervalDay,
          UpgRoamPermission: form.allowRoaming ? "1" : "0",
        }),
        "自动升级设置已保存",
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  const versionLabel =
    form.newVersion === "has_optional" || form.newVersion === "has_critical"
      ? "发现新版本"
      : form.newVersion === "already_has" || form.newVersion === "no_new_version"
        ? "已是最新"
        : form.newVersion || "未检测";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Firmware OTA"
        title="系统升级"
        description="检查固件更新、配置自动检测周期，并管理升级通知。"
        actions={
          <Button variant="outline" onClick={checkUpdate} loading={checking}>
            <RefreshCw />
            检查更新
          </Button>
        }
      />
      <SettingsLayout
        aside={
          <HelpCard>
            <p>检查更新会通过蜂窝或当前上网通路访问升级服务器。</p>
            <p>漫游环境下自动升级可能产生额外流量费用，建议谨慎开启。</p>
          </HelpCard>
        }
      >
        <SettingsCard
          title="升级状态"
          description={`当前进度：${form.upgradeState || "空闲"}`}
          loading={loading || checking}
        >
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={versionLabel === "发现新版本" ? "warning" : "secondary"}>
              {versionLabel}
            </Badge>
            <span className="text-sm text-muted-foreground">
              原始状态值：{form.newVersion || "—"}
            </span>
          </div>
          <div className="mt-5 flex items-center justify-between rounded-xl border border-border bg-background/55 p-4">
            <div>
              <p className="text-sm font-medium">升级通知</p>
              <p className="mt-1 text-xs text-muted-foreground">有新版本时在控制台提示</p>
            </div>
            <Switch
              label="升级通知"
              checked={form.notice}
              disabled={loading}
              onCheckedChange={saveNotice}
            />
          </div>
        </SettingsCard>

        <div className="mt-5">
          <SettingsCard title="自动更新" description="SetUpgAutoSetting" loading={loading}>
            <form onSubmit={saveAutoSettings} className="grid gap-5">
              <FormField label="更新模式" htmlFor="fota-mode">
                <NativeSelectWrap>
                  <Select
                    id="fota-mode"
                    value={form.updateMode}
                    onChange={(event) =>
                      setForm((value) => ({ ...value, updateMode: event.target.value }))
                    }
                  >
                    <option value="0">手动检查</option>
                    <option value="1">自动检测</option>
                  </Select>
                </NativeSelectWrap>
              </FormField>
              <FormField label="检测间隔（天）" htmlFor="fota-interval">
                <Input
                  id="fota-interval"
                  type="number"
                  min="1"
                  value={form.intervalDay}
                  disabled={form.updateMode === "0"}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, intervalDay: event.target.value }))
                  }
                />
              </FormField>
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <div>
                  <p className="text-sm font-medium">允许漫游更新</p>
                  <p className="mt-1 text-xs text-muted-foreground">漫游网络下仍可检测/下载</p>
                </div>
                <Switch
                  label="允许漫游更新"
                  checked={form.allowRoaming}
                  onCheckedChange={(allowRoaming) =>
                    setForm((value) => ({ ...value, allowRoaming }))
                  }
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" loading={loading}>
                  <Download />
                  保存自动更新
                </Button>
              </div>
            </form>
          </SettingsCard>
        </div>
      </SettingsLayout>
    </div>
  );
}
