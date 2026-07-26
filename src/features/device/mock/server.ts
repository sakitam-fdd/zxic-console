import fixture from "@/features/device/mock/fixture.json";
import type { DeviceRecord } from "@/features/device/types";

type MockValue = string | number | boolean | null | MockValue[] | { [key: string]: MockValue };
type MockState = Record<string, MockValue>;
type PostDefaults = Record<string, DeviceRecord>;

const state: MockState = { ...(fixture.fields as MockState) };
const postDefaults = fixture.postDefaults as PostDefaults;

let authenticated = false;

function delay(ms = 80) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickFields(cmds: string[]): DeviceRecord {
  const result: Record<string, MockValue> = {};
  for (const cmd of cmds) {
    if (!cmd) continue;
    if (cmd in state) {
      result[cmd] = state[cmd];
    }
  }
  if (cmds.includes("loginfo")) {
    result.loginfo = authenticated ? "ok" : String(state.loginfo || "");
  }
  // 运行时设备响应含列表等非 string 字段，与真机 JSON 一致
  return result as unknown as DeviceRecord;
}

function parseGetQuery(query: string) {
  const params = new URLSearchParams(query);
  const cmd = params.get("cmd") || "";
  const cmds = cmd
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return { cmds };
}

export function isMockEnabled() {
  return import.meta.env.PUBLIC_MOCK === "true";
}

export async function mockGetApi(query: string): Promise<DeviceRecord> {
  await delay();
  const { cmds } = parseGetQuery(query);
  if (!cmds.length) return { ...(state as unknown as DeviceRecord) };
  return pickFields(cmds);
}

export async function mockPostApi(data: Record<string, unknown>): Promise<DeviceRecord> {
  await delay(120);
  const goformId = String(data.goformId || "");

  if (goformId === "LOGIN") {
    // login() 会 Base64 编码密码；mock 只要求非空载荷
    const password = String(data.password || "");
    if (password.length < 4) {
      return { result: "3" };
    }
    authenticated = true;
    state.loginfo = "ok";
    return { ...(postDefaults.LOGIN || { result: "0" }) };
  }

  if (goformId === "LOGOUT") {
    authenticated = false;
    state.loginfo = "";
    return { ...(postDefaults.LOGOUT || { result: "success" }) };
  }

  if (goformId === "CHANGE_PASSWORD") {
    return { ...(postDefaults.CHANGE_PASSWORD || { result: "success" }) };
  }

  for (const [key, value] of Object.entries(data)) {
    if (
      key === "goformId" ||
      key === "password" ||
      key === "oldPassword" ||
      key === "newPassword"
    ) {
      continue;
    }
    if (value !== undefined && value !== null) {
      state[key] = value as MockValue;
    }
  }

  return { ...(postDefaults[goformId] || postDefaults["*"] || { result: "success" }) };
}

export function mockServerConfig() {
  return {
    Title: "ZXIC Console (Mock)",
    is_r186x: false,
    Version: "mock",
  };
}
