import { CircleHelp, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function SettingsLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className={cn("grid gap-5", aside && "xl:grid-cols-[minmax(0,1fr)_320px]")}>
      <div className="min-w-0 space-y-5">{children}</div>
      {aside ? <aside className="min-w-0 xl:block">{aside}</aside> : null}
    </div>
  );
}

export function HelpCard({
  title = "设置说明",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-2xl border border-border/80 bg-card xl:sticky xl:top-24 xl:open:shadow-sm">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-5 py-4 font-medium marker:content-none [&::-webkit-details-marker]:hidden xl:cursor-default">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CircleHelp className="size-4" />
        </span>
        <span>{title}</span>
        <span className="ml-auto text-xs text-muted-foreground xl:hidden">展开</span>
      </summary>
      <div className="space-y-3 border-t border-border/70 px-5 py-4 text-sm leading-6 text-muted-foreground">
        {children}
      </div>
    </details>
  );
}

export function SettingsCard({
  title,
  description,
  actions,
  children,
  loading,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {loading ? (
        <div className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-primary/15">
          <div className="h-full w-1/3 animate-[progress_1.1s_ease-in-out_infinite] bg-primary" />
        </div>
      ) : null}
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
        </div>
        {actions}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function LoadingScreen({ label = "正在连接设备…" }: { label?: string }) {
  return (
    <div className="surface-grid flex min-h-screen items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/70 bg-card/85 px-10 py-8 shadow-xl backdrop-blur">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LoaderCircle className="size-6 animate-spin" />
        </div>
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/25 p-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
