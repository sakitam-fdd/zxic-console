import { KeyRound, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { HelpCard, PageHeader, SettingsCard, SettingsLayout } from "@/components/page";
import { Button, FormField, Input } from "@/components/ui/primitives";
import { submitDevice } from "@/features/device/actions";
import { changePassword } from "@/features/device/api";

export default function PasswordPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (form.current.length < 4 || form.next.length < 4) {
      toast.error("密码至少 4 位");
      return;
    }
    if (form.next !== form.confirm) {
      toast.error("两次输入的新密码不一致");
      return;
    }
    setLoading(true);
    try {
      await submitDevice(changePassword(form.current, form.next), "登录密码已更新");
      setForm({ current: "", next: "", confirm: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "修改失败，请确认当前密码");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="修改登录密码"
        description="此密码用于打开设备管理控制台，与 Wi-Fi 热点密码不同。"
      />
      <SettingsLayout
        aside={
          <HelpCard>
            <p>普通管理密码默认为 admin；超管密码默认为 factoryAdmin。</p>
            <p>修改后请妥善保存，忘记密码通常需要恢复出厂设置。</p>
          </HelpCard>
        }
      >
        <SettingsCard title="登录密码" description="提交后立即生效，下次登录使用新密码">
          <form onSubmit={submit} className="grid max-w-lg gap-5">
            <FormField label="当前密码" htmlFor="pwd-current">
              <Input
                id="pwd-current"
                type="password"
                autoComplete="current-password"
                value={form.current}
                onChange={(event) =>
                  setForm((value) => ({ ...value, current: event.target.value }))
                }
              />
            </FormField>
            <FormField label="新密码" htmlFor="pwd-new">
              <Input
                id="pwd-new"
                type="password"
                autoComplete="new-password"
                value={form.next}
                onChange={(event) => setForm((value) => ({ ...value, next: event.target.value }))}
              />
            </FormField>
            <FormField label="确认新密码" htmlFor="pwd-confirm">
              <Input
                id="pwd-confirm"
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={(event) =>
                  setForm((value) => ({ ...value, confirm: event.target.value }))
                }
              />
            </FormField>
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <Save />
                保存密码
              </Button>
            </div>
          </form>
        </SettingsCard>
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>设备登录只校验密码，不校验用户名。输入对应密码即可切换普通管理与超管会话。</p>
        </div>
      </SettingsLayout>
    </div>
  );
}
