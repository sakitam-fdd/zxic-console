import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  checkSession,
  configureDeviceApi,
  getLanClients,
  getMessages,
  getValues,
  getWifiClients,
  INFO_FIELDS,
  loadDeviceCapabilities,
  loadServerConfig,
  NETWORK_FIELDS,
} from "@/features/device/api";
import { useDeviceStore } from "@/features/device/store";
import type { DeviceCapabilities } from "@/features/device/types";

const SIGNAL_FIELDS = ["network_type", "sub_network_type", "rssi", "rscp", "lte_rsrp"];

let refreshHandler: (() => Promise<void>) | null = null;

export function refreshDeviceNow() {
  return refreshHandler?.() ?? Promise.resolve();
}

function mapCapabilities(data: Record<string, string>): DeviceCapabilities {
  return {
    ussd: data.ussd_enable === "1",
    vpn: data.vpn_enable === "1",
    tr069: data.tr069_func_enable === "1",
    bandSelect:
      data.band_select_enable === "1" ||
      data.cstm_webui_bandselect === "1" ||
      data.cstm_webui_bandselect === "2",
    dnsManual: data.dns_manual_func_enable === "1" || data.dns_manual_func_enable === "2",
    imei: data.cstm_webui_imei === "1" || data.cstm_webui_imei === "2",
  };
}

export function DeviceRuntime() {
  const authStatus = useDeviceStore((state) => state.authStatus);
  const setAuthStatus = useDeviceStore((state) => state.setAuthStatus);
  const setConfig = useDeviceStore((state) => state.setConfig);
  const setCapabilities = useDeviceStore((state) => state.setCapabilities);
  const updateNetwork = useDeviceStore((state) => state.updateNetwork);
  const updateInfo = useDeviceStore((state) => state.updateInfo);
  const updateSignal = useDeviceStore((state) => state.updateSignal);
  const updateClients = useDeviceStore((state) => state.updateClients);
  const updateMessages = useDeviceStore((state) => state.updateMessages);
  const setPolling = useDeviceStore((state) => state.setPolling);
  const didWarn = useRef(false);
  const infoLoaded = useRef(false);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      try {
        const config = await loadServerConfig();
        if (!active) return;
        configureDeviceApi(config);
        setConfig(config);
        const session = await checkSession();
        if (!active) return;
        setAuthStatus(session.loginfo === "ok" ? "authenticated" : "anonymous");
      } catch {
        if (active) setAuthStatus("anonymous");
      }
    }
    void bootstrap();
    return () => {
      active = false;
      infoLoaded.current = false;
    };
  }, [setAuthStatus, setConfig]);

  const poll = useCallback(async () => {
    if (useDeviceStore.getState().polling) return;
    setPolling(true);
    try {
      const network = await getValues(NETWORK_FIELDS, true);
      if (network.loginfo && network.loginfo !== "ok") {
        useDeviceStore.getState().reset();
        infoLoaded.current = false;
        if (!didWarn.current) {
          toast.warning("设备会话已失效，请重新登录");
          didWarn.current = true;
        }
        return;
      }
      updateNetwork(network);

      const [signalResult, lanResult, wifiResult, messagesResult, infoResult, capsResult] =
        await Promise.allSettled([
          getValues(SIGNAL_FIELDS, true),
          getLanClients(),
          getWifiClients(),
          getMessages(),
          infoLoaded.current ? Promise.resolve(null) : getValues(INFO_FIELDS, true),
          loadDeviceCapabilities(),
        ]);

      if (signalResult.status === "fulfilled") updateSignal(signalResult.value);
      const current = useDeviceStore.getState().snapshot;
      updateClients(
        lanResult.status === "fulfilled" ? lanResult.value : current.lanClients,
        wifiResult.status === "fulfilled" ? wifiResult.value : current.wifiClients,
      );
      if (messagesResult.status === "fulfilled") updateMessages(messagesResult.value);
      if (infoResult.status === "fulfilled" && infoResult.value) {
        infoLoaded.current = true;
        updateInfo(infoResult.value);
      }
      if (capsResult.status === "fulfilled") {
        setCapabilities(mapCapabilities(capsResult.value));
      }
      didWarn.current = false;
    } catch (error) {
      if (!didWarn.current) {
        toast.error(error instanceof Error ? error.message : "无法读取设备状态");
        didWarn.current = true;
      }
    } finally {
      setPolling(false);
    }
  }, [
    setCapabilities,
    setPolling,
    updateClients,
    updateInfo,
    updateMessages,
    updateNetwork,
    updateSignal,
  ]);

  useEffect(() => {
    refreshHandler = poll;
    return () => {
      if (refreshHandler === poll) refreshHandler = null;
    };
  }, [poll]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    void poll();
    const timer = window.setInterval(poll, 2500);
    return () => window.clearInterval(timer);
  }, [authStatus, poll]);

  return null;
}

export function refreshDeviceInfo() {
  return getValues(INFO_FIELDS, true).then((info) => {
    useDeviceStore.getState().updateInfo(info);
    return info;
  });
}
