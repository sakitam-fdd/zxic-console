import { cn } from "@/lib/utils";

/** ZXIC Console 标识：几何 Z 与信号弧线组成的控制台印记 */
export function BrandMark({
  className,
  title = "ZXIC Console",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-5", className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      {/* 斜切底板 */}
      <path
        d="M8 10.5C8 9.12 9.12 8 10.5 8H26.2c.9 0 1.36 1.08.74 1.72L11.72 24.94A1.2 1.2 0 0 0 12.56 27H29.5c1.38 0 2.5 1.12 2.5 2.5S30.88 32 29.5 32H13.8c-.9 0-1.36-1.08-.74-1.72l15.22-15.22A1.2 1.2 0 0 0 27.44 13H10.5C9.12 13 8 11.88 8 10.5Z"
        fill="currentColor"
        opacity="0.92"
      />
      {/* 右上信号弧 */}
      <path
        d="M27.5 9.2c2.6 1.1 4.4 3.5 4.4 6.3"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M29.6 11.4c1.35.85 2.2 2.25 2.2 3.85"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.85"
      />
      <circle cx="32.2" cy="16.4" r="1.35" fill="currentColor" />
    </svg>
  );
}

export function BrandBadge({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/15",
        compact ? "size-9" : "size-10",
        className,
      )}
    >
      <BrandMark className={compact ? "size-[18px]" : "size-5"} />
      <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-sidebar bg-emerald-400" />
    </div>
  );
}
