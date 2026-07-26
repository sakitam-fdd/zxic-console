import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeAtob(value?: string) {
  if (!value) return "";
  try {
    return atob(value);
  } catch {
    return value;
  }
}

export function safeBtoa(value: string) {
  try {
    return btoa(value);
  } catch {
    return btoa(unescape(encodeURIComponent(value)));
  }
}

export function formatBytes(value: string | number | undefined, decimals = 2) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(decimals)} ${units[index]}`;
}

export function formatThroughput(value: string | number | undefined) {
  return `${formatBytes(value)}/s`;
}

export function formatDuration(value: string | number | undefined) {
  let seconds = Number(value || 0);
  if (!Number.isFinite(seconds)) return "—";
  const days = Math.floor(seconds / 86400);
  seconds %= 86400;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  if (days) return `${days}天 ${hours}小时`;
  if (hours) return `${hours}小时 ${minutes}分钟`;
  return `${minutes}分钟`;
}

export function bytesFrom(value: number, unit: string) {
  const factor = unit === "TB" ? 1024 ** 4 : unit === "GB" ? 1024 ** 3 : 1024 ** 2;
  return Math.round(value * factor);
}

export function dataLimitValue(value: number, unit: string) {
  return Math.round(bytesFrom(value, unit) / 1024 / 1024);
}

export function asciiToHex(value: string) {
  return Array.from(value)
    .map((character) => character.charCodeAt(0).toString(16).padStart(4, "0"))
    .join("")
    .toUpperCase();
}

export function smsTime(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  const timezone = -date.getTimezoneOffset() / 60;
  return [
    pad(date.getFullYear() % 100),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
    timezone,
  ].join(";");
}

export function isIpv4(value: string) {
  const parts = value.split(".");
  return (
    parts.length === 4 &&
    parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255)
  );
}

export function ipToNumber(value: string) {
  return value
    .split(".")
    .map(Number)
    .reduce((result, part) => (result << 8) + part, 0);
}

export function isPoolValid(start: string, end: string) {
  return isIpv4(start) && isIpv4(end) && ipToNumber(start) >>> 0 <= ipToNumber(end) >>> 0;
}

export function normalizeCarrier(value?: string, noSim = false) {
  if (noSim) return "SIM 卡未识别";
  const normalized = (value || "").toLowerCase().replaceAll(" ", "");
  const carrierMap: Record<string, string> = {
    chinamobile: "中国移动",
    chinatelecom: "中国电信",
    chinaunicom: "中国联通",
  };
  return carrierMap[normalized] || value || "服务受限";
}

export function resultSucceeded(result: unknown) {
  if (typeof result !== "object" || result === null) return false;
  const value = String((result as Record<string, unknown>).result ?? "");
  return value === "success" || value === "0" || value === "set_devicemode successfully!";
}

export function sleep(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
