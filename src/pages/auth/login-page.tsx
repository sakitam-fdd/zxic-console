import { Eye, EyeOff, LockKeyhole, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTheme } from "@/app/theme-provider";
import { BrandMark } from "@/components/brand-mark";
import { Button, Card, Input } from "@/components/ui/primitives";
import { login } from "@/features/device/api";
import { useDeviceStore } from "@/features/device/store";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const authStatus = useDeviceStore((state) => state.authStatus);
  const setAuthStatus = useDeviceStore((state) => state.setAuthStatus);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  if (authStatus === "authenticated") return <Navigate to="/" replace />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 4) {
      toast.error("请输入至少 4 位设备管理密码");
      return;
    }
    setLoading(true);
    try {
      const response = await login(password);
      if (response.result === "0") {
        setAuthStatus("authenticated");
        toast.success("设备连接成功");
        navigate("/", { replace: true });
        return;
      }
      const message =
        response.result === "1"
          ? "账号已被锁定，请稍后再试"
          : response.result === "3"
            ? "设备管理密码错误"
            : "登录失败，请检查设备状态";
      toast.error(message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法连接设备");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="surface-grid relative flex min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -left-32 top-10 size-[32rem] rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 right-0 size-[36rem] rounded-full bg-blue-500/8 blur-3xl" />

      <div className="relative hidden flex-1 flex-col justify-between p-12 lg:flex xl:p-16">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20">
            <BrandMark className="size-6" />
          </div>
          <div>
            <p className="font-semibold">ZXIC Console</p>
            <p className="text-xs tracking-[0.15em] text-muted-foreground">DEVICE CONTROL</p>
          </div>
        </div>
        <div className="max-w-2xl">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Portable network, clearly managed
          </p>
          <h1 className="font-display text-balance text-5xl font-semibold leading-[1.08] tracking-[-0.04em] xl:text-6xl">
            ZXIC Console
          </h1>
          <p className="font-display mt-4 text-balance text-3xl font-medium tracking-tight text-foreground/90 xl:text-4xl">
            你的随身网络，现在更清晰。
          </p>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            从蜂窝信号、实时流量到 Wi-Fi 与高级设备参数，在一个安静、可靠的界面中完成管理。
          </p>
        </div>
        <p className="text-xs text-muted-foreground">仅连接到你的本地设备，不传输云端数据。</p>
      </div>

      <div className="relative flex w-full flex-1 items-center justify-center px-4 py-8 sm:p-6 lg:w-[520px] lg:flex-none lg:border-l lg:border-border/70 lg:bg-background/55 lg:backdrop-blur-xl">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 sm:right-5 sm:top-5"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "切换浅色模式" : "切换深色模式"}
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>
        <Card className="w-full max-w-md border-border/70 bg-card/82 p-5 shadow-2xl sm:p-8">
          <div className="mb-6 sm:mb-8 lg:hidden">
            <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <BrandMark className="size-6" />
            </div>
            <p className="font-semibold">ZXIC Console</p>
            <p className="mt-1 text-xs text-muted-foreground">设备控制台</p>
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              欢迎回来
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">连接设备控制台</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              设备登录只校验管理密码，不校验用户名。请使用设备标签或你已设置的密码。
            </p>
          </div>

          <form onSubmit={submit} className="mt-8 grid w-full gap-5 text-left">
            <div className="grid w-full gap-2">
              <label htmlFor="password" className="block text-sm font-medium leading-none">
                设备管理密码
              </label>
              <div className="relative w-full">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  autoFocus
                  autoComplete="current-password"
                  type={visible ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full pl-10 pr-10"
                  placeholder="输入管理密码"
                />
                <button
                  type="button"
                  onClick={() => setVisible((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={visible ? "隐藏密码" : "显示密码"}
                >
                  {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" size="lg" className="w-full" loading={loading}>
              连接设备
            </Button>
          </form>
          <p className="mt-6 text-left text-xs leading-5 text-muted-foreground">
            密码至少 4 位。忘记密码时请查看设备标签或联系管理员。
          </p>
        </Card>
      </div>
    </div>
  );
}
