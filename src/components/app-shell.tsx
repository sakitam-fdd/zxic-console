import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  LogOut,
  Menu as MenuIcon,
  Moon,
  RefreshCw,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { navigation, pageForPath } from "@/app/navigation";
import { useTheme } from "@/app/theme-provider";
import { BrandBadge } from "@/components/brand-mark";
import { Badge, Button, MenuDropdown } from "@/components/ui/primitives";
import { logout } from "@/features/device/api";
import { refreshDeviceNow } from "@/features/device/runtime";
import { useDeviceStore } from "@/features/device/store";
import { cn, normalizeCarrier } from "@/lib/utils";

function Brand({ compact = false }: { compact?: boolean }) {
  const mockMode = import.meta.env.PUBLIC_MOCK === "true";
  return (
    <div className={cn("flex items-center gap-3", compact && "justify-center")}>
      <BrandBadge compact={compact} />
      {!compact ? (
        <div className="min-w-0">
          <p className="truncate font-semibold tracking-tight">ZXIC Console</p>
          <p className="truncate text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {mockMode ? "Mock demo" : "Device control"}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function SidebarNavigation({
  compact,
  onNavigate,
}: {
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const capabilities = useDeviceStore((state) => state.capabilities);
  const groups = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.capability) return true;
        return Boolean(capabilities[item.capability]);
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <nav className="scrollbar-subtle flex-1 overflow-y-auto px-3 pb-5" aria-label="主导航">
      {groups.map((group) => (
        <div key={group.label} className="mt-5 first:mt-3">
          {!compact ? (
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/75">
              {group.label}
            </p>
          ) : (
            <div className="mx-auto mb-2 h-px w-7 bg-sidebar-border" />
          )}
          <div className="space-y-1">
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                title={compact ? item.title : undefined}
                className={({ isActive }) =>
                  cn(
                    "group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                    isActive &&
                      "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border",
                    compact && "justify-center px-2",
                  )
                }
              >
                <item.icon className="size-[18px] shrink-0" aria-hidden />
                {!compact ? <span className="truncate">{item.title}</span> : null}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const snapshot = useDeviceStore((state) => state.snapshot);
  const polling = useDeviceStore((state) => state.polling);
  const reset = useDeviceStore((state) => state.reset);
  const currentPage = pageForPath(location.pathname);
  const network = snapshot.network;
  const info = snapshot.info;
  const unread = Number(network.sms_unread_num || 0);
  const connected = network.ppp_status === "ppp_connected";
  const carrier = normalizeCarrier(
    network.network_provider,
    network.modem_main_state === "modem_sim_undetected",
  );

  const accountItems = useMemo(
    () => [
      {
        label: theme === "dark" ? "切换浅色模式" : "切换深色模式",
        icon: theme === "dark" ? Sun : Moon,
        onClick: toggleTheme,
      },
      {
        label: "修改登录密码",
        icon: KeyRound,
        onClick: () => navigate("/account/password"),
      },
      {
        label: "退出设备",
        icon: LogOut,
        destructive: true,
        onClick: async () => {
          try {
            await logout();
          } finally {
            reset();
            navigate("/login");
          }
        },
      },
    ],
    [navigate, reset, theme, toggleTheme],
  );

  async function handleRefresh() {
    try {
      await refreshDeviceNow();
      toast.success("设备状态已刷新");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "刷新失败");
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar/92 backdrop-blur-xl transition-[width] duration-200 lg:flex",
          compact ? "w-[76px]" : "w-[248px]",
        )}
      >
        <div className="flex h-[72px] items-center justify-between px-4">
          <Brand compact={compact} />
          {!compact ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
              onClick={() => setCompact(true)}
              aria-label="折叠侧栏"
            >
              <ChevronLeft />
            </Button>
          ) : null}
        </div>
        <SidebarNavigation compact={compact} />
        <div className="border-t border-sidebar-border p-3">
          {compact ? (
            <Button
              variant="ghost"
              size="icon"
              className="w-full"
              onClick={() => setCompact(false)}
              aria-label="展开侧栏"
            >
              <ChevronRight />
            </Button>
          ) : (
            <div className="rounded-xl border border-sidebar-border bg-background/45 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium">{carrier}</span>
                <span
                  className={cn(
                    "size-2 rounded-full",
                    connected ? "bg-emerald-400" : "bg-amber-400",
                  )}
                />
              </div>
              <p className="mt-1 truncate text-[11px] text-muted-foreground">
                {info.sub_network_type || network.sub_network_type || "等待网络状态"}
              </p>
            </div>
          )}
        </div>
      </aside>

      <Dialog open={mobileOpen} onClose={setMobileOpen} className="relative z-[70] lg:hidden">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm transition data-closed:opacity-0"
        />
        <DialogPanel
          transition
          className="fixed inset-y-0 left-0 flex w-[290px] flex-col border-r border-sidebar-border bg-sidebar shadow-2xl transition duration-200 data-closed:-translate-x-full"
        >
          <div className="flex h-[72px] items-center justify-between px-4">
            <DialogTitle as="div">
              <Brand />
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(false)}
              aria-label="关闭导航"
            >
              <X />
            </Button>
          </div>
          <SidebarNavigation onNavigate={() => setMobileOpen(false)} />
        </DialogPanel>
      </Dialog>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-[72px] items-center gap-3 border-b border-border/75 bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="打开导航"
          >
            <MenuIcon />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{currentPage.title}</p>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {currentPage.description}
            </p>
          </div>
          <Badge variant={connected ? "success" : "warning"} className="hidden sm:inline-flex">
            <span className="size-1.5 rounded-full bg-current" />
            {connected ? "网络在线" : "网络待机"}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            aria-label="刷新设备状态"
            onClick={() => void handleRefresh()}
          >
            <RefreshCw className={cn(polling && "animate-spin")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={`短信通知${unread ? `，${unread} 条未读` : ""}`}
            onClick={() => navigate("/messages")}
          >
            <Bell />
            {unread ? (
              <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-4 text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            ) : null}
          </Button>
          <MenuDropdown
            trigger={
              <Button variant="outline" size="icon" aria-label="账户菜单">
                <UserRound />
              </Button>
            }
            items={accountItems}
          />
        </header>

        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
