import { Switch as HeadlessSwitch, Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, ChevronDown, LoaderCircle } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:translate-y-px",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/75",
        outline:
          "border border-border bg-background/60 shadow-xs hover:border-primary/30 hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-destructive text-white shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive/30",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-xl px-6",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  loading,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle className="animate-spin" /> : null}
      {children}
    </button>
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card/88 text-card-foreground shadow-[0_12px_40px_-28px_rgba(3,12,30,.45)] backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 p-5 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-semibold tracking-tight", className)} {...props} />;
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-6 text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-2", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-2 p-5 pt-2", className)} {...props} />;
}

const badgeVariants = cva(
  "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-primary/15 bg-primary/10 text-primary",
        secondary: "border-border bg-secondary text-secondary-foreground",
        success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        warning: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        destructive: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
        outline: "border-border bg-background/40 text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function Input({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-input bg-background/70 px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/12 disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-24 w-full resize-y rounded-lg border border-input bg-background/70 px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/12 disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-10 w-full appearance-none rounded-lg border border-input bg-background/70 px-3 py-2 pr-9 text-sm shadow-xs focus:border-primary/50 focus:ring-2 focus:ring-primary/12 disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  label,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <HeadlessSwitch
      checked={checked}
      onChange={onCheckedChange}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "group relative inline-flex h-6 w-11 shrink-0 rounded-full border border-transparent bg-input transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-50",
        checked && "bg-primary",
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none inline-block size-5 translate-x-0 rounded-full bg-white shadow-sm ring-0 transition-transform group-data-checked:translate-x-5"
      />
    </HeadlessSwitch>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  const normalized = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-secondary", className)}>
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-500"
        style={{ width: `${normalized}%` }}
      />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}

export function FormField({
  label,
  description,
  htmlFor,
  children,
  className,
}: {
  label: string;
  description?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-sm font-medium leading-none">
          {label}
        </label>
      ) : (
        <span className="text-sm font-medium leading-none">{label}</span>
      )}
      {children}
      {description ? (
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export function MenuDropdown({
  trigger,
  items,
  align = "right",
}: {
  trigger: React.ReactNode;
  items: Array<{
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    destructive?: boolean;
  }>;
  align?: "left" | "right";
}) {
  return (
    <Menu as="div" className="relative">
      <MenuButton as="div">{trigger}</MenuButton>
      <MenuItems
        anchor={align === "right" ? "bottom end" : "bottom start"}
        transition
        className="z-50 mt-2 w-52 origin-top rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl transition duration-150 ease-out [--anchor-gap:8px] data-closed:scale-95 data-closed:opacity-0"
      >
        {items.map((item) => (
          <MenuItem key={item.label}>
            <button
              type="button"
              onClick={item.onClick}
              className={cn(
                "group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm data-focus:bg-accent data-focus:text-accent-foreground",
                item.destructive && "text-destructive",
              )}
            >
              {item.icon ? <item.icon className="size-4" /> : null}
              {item.label}
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}

export function NativeSelectWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export function CheckOption({
  checked,
  disabled,
  onChange,
  children,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border bg-background/50 px-3 py-2.5 text-sm transition-colors hover:border-primary/30",
        checked && "border-primary/35 bg-primary/8",
        disabled && "cursor-not-allowed opacity-45",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        className={cn(
          "flex size-4 items-center justify-center rounded border border-input bg-background text-transparent",
          checked && "border-primary bg-primary text-primary-foreground",
        )}
      >
        <Check className="size-3" />
      </span>
      {children}
    </label>
  );
}
