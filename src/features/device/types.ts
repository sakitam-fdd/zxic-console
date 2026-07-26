export type DeviceRecord = Record<string, string>;

export interface ClientDevice extends DeviceRecord {
  dev_type: string;
  mac_addr: string;
  hostname: string;
  ip_addr: string;
  duration: string;
  rx: string;
  tx: string;
  timestamp: string;
  ip_type: string;
}

export interface SmsMessage extends DeviceRecord {
  id: string;
  number: string;
  content: string;
  tag: string;
  date: string;
  draft_group_id: string;
}

export interface TrafficSample {
  time: string;
  upload: number;
  download: number;
}

export interface DeviceSnapshot {
  network: DeviceRecord;
  signal: DeviceRecord;
  info: DeviceRecord;
  lanClients: ClientDevice[];
  wifiClients: ClientDevice[];
  messages: SmsMessage[];
  samples: TrafficSample[];
  updatedAt: number | null;
}

export interface ServerConfig {
  Title?: string;
  Version?: string;
  is_r186x?: boolean;
  DarkMode?: boolean;
}

export interface DeviceCapabilities {
  ussd: boolean;
  vpn: boolean;
  tr069: boolean;
  bandSelect: boolean;
  dnsManual: boolean;
  imei: boolean;
}

export type AuthStatus = "checking" | "authenticated" | "anonymous";
