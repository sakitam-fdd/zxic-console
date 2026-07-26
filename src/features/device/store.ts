import { create } from "zustand";
import type {
  AuthStatus,
  ClientDevice,
  DeviceCapabilities,
  DeviceRecord,
  DeviceSnapshot,
  ServerConfig,
  SmsMessage,
} from "@/features/device/types";

const emptySnapshot: DeviceSnapshot = {
  network: {},
  signal: {},
  info: {},
  lanClients: [],
  wifiClients: [],
  messages: [],
  samples: [],
  updatedAt: null,
};

const defaultCapabilities: DeviceCapabilities = {
  ussd: true,
  vpn: true,
  tr069: true,
  bandSelect: true,
  dnsManual: true,
  imei: true,
};

interface DeviceStore {
  authStatus: AuthStatus;
  config: ServerConfig;
  capabilities: DeviceCapabilities;
  snapshot: DeviceSnapshot;
  polling: boolean;
  setAuthStatus: (status: AuthStatus) => void;
  setConfig: (config: ServerConfig) => void;
  setCapabilities: (capabilities: DeviceCapabilities) => void;
  setPolling: (polling: boolean) => void;
  updateSnapshot: (update: Partial<DeviceSnapshot>) => void;
  updateNetwork: (network: DeviceRecord) => void;
  updateInfo: (info: DeviceRecord) => void;
  updateSignal: (signal: DeviceRecord) => void;
  updateClients: (lanClients: ClientDevice[], wifiClients: ClientDevice[]) => void;
  updateMessages: (messages: SmsMessage[]) => void;
  reset: () => void;
}

export const useDeviceStore = create<DeviceStore>((set) => ({
  authStatus: "checking",
  config: {},
  capabilities: defaultCapabilities,
  snapshot: emptySnapshot,
  polling: false,
  setAuthStatus: (authStatus) => set({ authStatus }),
  setConfig: (config) => set({ config }),
  setCapabilities: (capabilities) => set({ capabilities }),
  setPolling: (polling) => set({ polling }),
  updateSnapshot: (update) =>
    set((state) => ({ snapshot: { ...state.snapshot, ...update, updatedAt: Date.now() } })),
  updateNetwork: (network) =>
    set((state) => {
      const upload = Number(network.realtime_tx_thrpt || 0);
      const download = Number(network.realtime_rx_thrpt || 0);
      const samples = [
        ...state.snapshot.samples,
        {
          time: new Date().toLocaleTimeString("zh-CN", {
            minute: "2-digit",
            second: "2-digit",
          }),
          upload: Number.isFinite(upload) ? upload / 1024 : 0,
          download: Number.isFinite(download) ? download / 1024 : 0,
        },
      ].slice(-30);
      return {
        snapshot: {
          ...state.snapshot,
          network,
          samples,
          updatedAt: Date.now(),
        },
      };
    }),
  updateInfo: (info) =>
    set((state) => ({ snapshot: { ...state.snapshot, info, updatedAt: Date.now() } })),
  updateSignal: (signal) =>
    set((state) => ({ snapshot: { ...state.snapshot, signal, updatedAt: Date.now() } })),
  updateClients: (lanClients, wifiClients) =>
    set((state) => ({
      snapshot: { ...state.snapshot, lanClients, wifiClients, updatedAt: Date.now() },
    })),
  updateMessages: (messages) =>
    set((state) => ({ snapshot: { ...state.snapshot, messages, updatedAt: Date.now() } })),
  reset: () =>
    set({
      authStatus: "anonymous",
      snapshot: emptySnapshot,
      polling: false,
      capabilities: defaultCapabilities,
    }),
}));
