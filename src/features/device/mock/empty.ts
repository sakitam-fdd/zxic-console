import type { DeviceRecord } from "@/features/device/types";

/** 非 mock 构建的占位实现，避免打入 fixture */
export function isMockEnabled() {
  return false;
}

export async function mockGetApi(_query: string): Promise<DeviceRecord> {
  throw new Error("Mock 未启用");
}

export async function mockPostApi(_data: Record<string, unknown>): Promise<DeviceRecord> {
  throw new Error("Mock 未启用");
}

export function mockServerConfig() {
  return {};
}
