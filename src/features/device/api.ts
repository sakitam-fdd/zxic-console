import type { ClientDevice, DeviceRecord, ServerConfig, SmsMessage } from "@/features/device/types";
import { safeBtoa } from "@/lib/utils";

let isR186x = false;

function baseUrl() {
  const value = import.meta.env.PUBLIC_BASE_URL || ".";
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function endpoint(method: "get" | "post") {
  const path = isR186x
    ? method === "get"
      ? "reqproc/proc_get"
      : "reqproc/proc_post"
    : method === "get"
      ? "goform/goform_get_cmd_process"
      : "goform/goform_set_cmd_process";
  return `${baseUrl()}/${path}`;
}

async function parseResponse(response: Response) {
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`设备返回 HTTP ${response.status}`);
  }
  try {
    return JSON.parse(body) as DeviceRecord;
  } catch {
    throw new Error(body || "设备返回了无法识别的数据");
  }
}

export function configureDeviceApi(config: ServerConfig) {
  isR186x = Boolean(config.is_r186x);
}

export async function loadServerConfig(): Promise<ServerConfig> {
  try {
    const response = await fetch("./serverConfig.json", { cache: "no-store" });
    if (!response.ok) return {};
    return (await response.json()) as ServerConfig;
  } catch {
    return {};
  }
}

export async function getApi(query: string, hide = false) {
  const params = `${query}${query ? "&" : ""}_=${Date.now()}${hide ? "&hide=true" : ""}`;
  const response = await fetch(`${endpoint("get")}?${params}`, {
    headers: { Accept: "application/json, text/javascript, */*; q=0.01" },
    cache: "no-store",
  });
  return parseResponse(response);
}

export function getValues(fields: string[], hide = false) {
  return getApi(`cmd=${encodeURIComponent(fields.join(","))}&multi_data=1`, hide);
}

export async function postApi(data: Record<string, unknown>) {
  const body = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) body.set(key, String(value));
  });
  const response = await fetch(endpoint("post"), {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body,
  });
  return parseResponse(response);
}

export function login(password: string) {
  return postApi({ goformId: "LOGIN", password: safeBtoa(password) });
}

export function logout() {
  return postApi({ goformId: "LOGOUT" });
}

export function changePassword(oldPassword: string, newPassword: string) {
  return postApi({
    goformId: "CHANGE_PASSWORD",
    oldPassword: safeBtoa(oldPassword),
    newPassword: safeBtoa(newPassword),
  });
}

export function loadDeviceCapabilities() {
  return getValues(
    [
      "ussd_enable",
      "vpn_enable",
      "tr069_func_enable",
      "band_select_enable",
      "dns_manual_func_enable",
      "cstm_webui_imei",
      "cstm_webui_bandselect",
    ],
    true,
  );
}

export function checkSession() {
  return getValues(
    [
      "modem_main_state",
      "pin_status",
      "blc_wan_mode",
      "blc_wan_auto_mode",
      "loginfo",
      "network_provider",
      "sta_count",
      "m_sta_count",
    ],
    true,
  );
}

export function getLanClients() {
  return getApi("cmd=lan_station_list", true).then(
    (data) => (data.lan_station_list || []) as unknown as ClientDevice[],
  );
}

export function getWifiClients() {
  return getApi("cmd=station_list", true).then(
    (data) => (data.station_list || []) as unknown as ClientDevice[],
  );
}

export function getMessages() {
  return getApi(
    "cmd=sms_data_total&page=0&data_per_page=500&mem_store=1&tags=10&order_by=order+by+id+desc",
    true,
  ).then((data) => (data.messages || []) as unknown as SmsMessage[]);
}

export const NETWORK_FIELDS = [
  "modem_main_state",
  "pin_status",
  "blc_wan_mode",
  "blc_wan_auto_mode",
  "loginfo",
  "fota_new_version_state",
  "fota_current_upgrade_state",
  "fota_upgrade_selector",
  "network_provider",
  "is_mandatory",
  "sta_count",
  "m_sta_count",
  "signalbar",
  "network_type",
  "sub_network_type",
  "ppp_status",
  "internet_status",
  "EX_SSID1",
  "sta_ip_status",
  "EX_wifi_profile",
  "m_ssid_enable",
  "wifi_cur_state",
  "SSID1",
  "simcard_roam",
  "lan_ipaddr",
  "battery_charging",
  "battery_vol_percent",
  "battery_pers",
  "spn_name_data",
  "spn_b1_flag",
  "spn_b2_flag",
  "realtime_tx_bytes",
  "realtime_rx_bytes",
  "realtime_time",
  "realtime_tx_thrpt",
  "realtime_rx_thrpt",
  "monthly_rx_bytes",
  "monthly_tx_bytes",
  "traffic_alined_delta",
  "monthly_time",
  "date_month",
  "data_volume_limit_switch",
  "data_volume_limit_size",
  "data_volume_alert_percent",
  "data_volume_limit_unit",
  "roam_setting_option",
  "upg_roam_switch",
  "fota_package_already_download",
  "ssid",
  "show_ssid_on_lcd",
  "dial_mode",
  "ethwan_mode",
  "default_wan_name",
  "vpn_state",
  "connect_status",
  "sms_received_flag",
  "sts_received_flag",
  "sms_unread_num",
];

export const INFO_FIELDS = [
  "wifi_coverage",
  "Sleep_interval",
  "m_ssid_enable",
  "imei",
  "network_type",
  "sub_network_type",
  "rssi",
  "rscp",
  "lte_rsrp",
  "ziccid",
  "imsi",
  "sim_imsi",
  "cr_version",
  "hw_version",
  "MAX_Access_num",
  "SSID1",
  "AuthMode",
  "WPAPSK1_encode",
  "m_SSID",
  "m_AuthMode",
  "m_HideSSID",
  "HideSSID",
  "m_WPAPSK1_encode",
  "m_MAX_Access_num",
  "lan_ipaddr",
  "mac_address",
  "msisdn",
  "LocalDomain",
  "wan_ipaddr",
  "static_wan_ipaddr",
  "ipv6_wan_ipaddr",
  "ipv6_pdp_type",
  "pdp_type",
  "ppp_status",
  "sta_ip_status",
  "rj45_state",
  "ethwan_mode",
  "detail_cell_rsrq",
  "detail_cell_rssi",
  "detail_cell_pci",
  "detail_cell_sinr",
  "detail_cell_id",
];
