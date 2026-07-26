import { lazy, Suspense } from "react";
import { HashRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/app/theme-provider";
import { AppShell } from "@/components/app-shell";
import { LoadingScreen } from "@/components/page";
import { DeviceRuntime } from "@/features/device/runtime";
import { useDeviceStore } from "@/features/device/store";
import { ConfirmProvider } from "@/features/feedback/confirm-provider";

const LoginPage = lazy(() => import("@/pages/auth/login-page"));
const DashboardPage = lazy(() => import("@/pages/dashboard/dashboard-page"));
const PasswordPage = lazy(() => import("@/pages/account/password-page"));

const WifiPages = {
  Quick: lazy(() =>
    import("@/pages/wifi/wifi-pages").then((module) => ({ default: module.QuickWifiPage })),
  ),
  Clients: lazy(() =>
    import("@/pages/wifi/wifi-pages").then((module) => ({ default: module.WifiClientsPage })),
  ),
  Performance: lazy(() =>
    import("@/pages/wifi/wifi-pages").then((module) => ({
      default: module.WifiPerformancePage,
    })),
  ),
  Lan: lazy(() =>
    import("@/pages/wifi/wifi-pages").then((module) => ({ default: module.LanSettingsPage })),
  ),
  Radio: lazy(() =>
    import("@/pages/wifi/wifi-pages").then((module) => ({ default: module.WifiRadioPage })),
  ),
  Wps: lazy(() =>
    import("@/pages/wifi/extra-wifi-pages").then((module) => ({ default: module.WifiWpsPage })),
  ),
  Guest: lazy(() =>
    import("@/pages/wifi/extra-wifi-pages").then((module) => ({ default: module.WifiGuestPage })),
  ),
  MacFilter: lazy(() =>
    import("@/pages/wifi/extra-wifi-pages").then((module) => ({
      default: module.WifiMacFilterPage,
    })),
  ),
  ApStation: lazy(() =>
    import("@/pages/wifi/extra-wifi-pages").then((module) => ({
      default: module.WifiApStationPage,
    })),
  ),
};

const NetworkPages = {
  DataPlan: lazy(() =>
    import("@/pages/network/network-pages").then((module) => ({
      default: module.DataPlanPage,
    })),
  ),
  Vpn: lazy(() =>
    import("@/pages/network/network-pages").then((module) => ({ default: module.VpnPage })),
  ),
  Apn: lazy(() =>
    import("@/pages/network/network-pages").then((module) => ({ default: module.ApnPage })),
  ),
  Messages: lazy(() =>
    import("@/pages/network/network-pages").then((module) => ({
      default: module.MessagesPage,
    })),
  ),
  External: lazy(() =>
    import("@/pages/network/network-pages").then((module) => ({
      default: module.ExternalPage,
    })),
  ),
  Connection: lazy(() =>
    import("@/pages/network/extra-network-pages").then((module) => ({
      default: module.ConnectionModePage,
    })),
  ),
  Select: lazy(() =>
    import("@/pages/network/extra-network-pages").then((module) => ({
      default: module.NetworkSelectPage,
    })),
  ),
  Ussd: lazy(() =>
    import("@/pages/network/extra-network-pages").then((module) => ({
      default: module.UssdPage,
    })),
  ),
  Wan: lazy(() =>
    import("@/pages/network/extra-network-pages").then((module) => ({
      default: module.WanPage,
    })),
  ),
  Phonebook: lazy(() =>
    import("@/pages/network/extra-network-pages").then((module) => ({
      default: module.PhonebookPage,
    })),
  ),
};

const AdvancedPages = {
  Sim: lazy(() =>
    import("@/pages/advanced/advanced-pages").then((module) => ({
      default: module.SimSwitchPage,
    })),
  ),
  Bands: lazy(() =>
    import("@/pages/advanced/advanced-pages").then((module) => ({
      default: module.CellularBandsPage,
    })),
  ),
  Ddns: lazy(() =>
    import("@/pages/advanced/advanced-pages").then((module) => ({
      default: module.DdnsPage,
    })),
  ),
  Tr069: lazy(() =>
    import("@/pages/advanced/advanced-pages").then((module) => ({
      default: module.Tr069Page,
    })),
  ),
  At: lazy(() =>
    import("@/pages/advanced/advanced-pages").then((module) => ({
      default: module.AtCommandPage,
    })),
  ),
  Device: lazy(() =>
    import("@/pages/advanced/advanced-pages").then((module) => ({
      default: module.DeviceSettingsPage,
    })),
  ),
  Pin: lazy(() =>
    import("@/pages/advanced/extra-advanced-pages").then((module) => ({
      default: module.PinPage,
    })),
  ),
  Fota: lazy(() =>
    import("@/pages/advanced/extra-advanced-pages").then((module) => ({
      default: module.FotaPage,
    })),
  ),
};

const SecurityPages = {
  Hub: lazy(() =>
    import("@/pages/security/firewall-pages").then((module) => ({
      default: module.FirewallHubPage,
    })),
  ),
  PortFilter: lazy(() =>
    import("@/pages/security/firewall-pages").then((module) => ({
      default: module.PortFilterPage,
    })),
  ),
  PortForward: lazy(() =>
    import("@/pages/security/firewall-pages").then((module) => ({
      default: module.PortForwardPage,
    })),
  ),
  PortMap: lazy(() =>
    import("@/pages/security/firewall-pages").then((module) => ({
      default: module.PortMapPage,
    })),
  ),
  Upnp: lazy(() =>
    import("@/pages/security/firewall-pages").then((module) => ({
      default: module.UpnpPage,
    })),
  ),
  Dmz: lazy(() =>
    import("@/pages/security/firewall-pages").then((module) => ({
      default: module.DmzPage,
    })),
  ),
  RateLimit: lazy(() =>
    import("@/pages/security/firewall-pages").then((module) => ({
      default: module.RateLimitPage,
    })),
  ),
  UrlFilter: lazy(() =>
    import("@/pages/security/firewall-pages").then((module) => ({
      default: module.UrlFilterPage,
    })),
  ),
  Parental: lazy(() =>
    import("@/pages/security/firewall-pages").then((module) => ({
      default: module.ParentalControlPage,
    })),
  ),
};

function AuthGuard() {
  const authStatus = useDeviceStore((state) => state.authStatus);
  if (authStatus === "checking") return <LoadingScreen />;
  if (authStatus !== "authenticated") return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RouteLoader() {
  return <LoadingScreen label="正在加载控制模块…" />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ConfirmProvider>
        <HashRouter>
          <DeviceRuntime />
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<AuthGuard />}>
                <Route element={<AppShell />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="account/password" element={<PasswordPage />} />
                  <Route path="network/wifi" element={<WifiPages.Quick />} />
                  <Route path="network/data-plan" element={<NetworkPages.DataPlan />} />
                  <Route path="network/connection" element={<NetworkPages.Connection />} />
                  <Route path="network/select" element={<NetworkPages.Select />} />
                  <Route path="network/wan" element={<NetworkPages.Wan />} />
                  <Route path="network/vpn" element={<NetworkPages.Vpn />} />
                  <Route path="network/apn" element={<NetworkPages.Apn />} />
                  <Route path="network/phonebook" element={<NetworkPages.Phonebook />} />
                  <Route path="wifi/clients" element={<WifiPages.Clients />} />
                  <Route path="wifi/guest" element={<WifiPages.Guest />} />
                  <Route path="wifi/performance" element={<WifiPages.Performance />} />
                  <Route path="wifi/lan" element={<WifiPages.Lan />} />
                  <Route path="wifi/radio" element={<WifiPages.Radio />} />
                  <Route path="wifi/wps" element={<WifiPages.Wps />} />
                  <Route path="wifi/mac-filter" element={<WifiPages.MacFilter />} />
                  <Route path="wifi/ap-station" element={<WifiPages.ApStation />} />
                  <Route path="messages" element={<NetworkPages.Messages />} />
                  <Route path="messages/ussd" element={<NetworkPages.Ussd />} />
                  <Route path="external" element={<NetworkPages.External />} />
                  <Route path="security/firewall" element={<SecurityPages.Hub />} />
                  <Route path="security/port-filter" element={<SecurityPages.PortFilter />} />
                  <Route path="security/port-forward" element={<SecurityPages.PortForward />} />
                  <Route path="security/port-map" element={<SecurityPages.PortMap />} />
                  <Route path="security/upnp" element={<SecurityPages.Upnp />} />
                  <Route path="security/dmz" element={<SecurityPages.Dmz />} />
                  <Route path="security/rate-limit" element={<SecurityPages.RateLimit />} />
                  <Route path="security/url-filter" element={<SecurityPages.UrlFilter />} />
                  <Route path="security/parental" element={<SecurityPages.Parental />} />
                  <Route path="advanced/pin" element={<AdvancedPages.Pin />} />
                  <Route path="advanced/sim" element={<AdvancedPages.Sim />} />
                  <Route path="advanced/bands" element={<AdvancedPages.Bands />} />
                  <Route path="advanced/fota" element={<AdvancedPages.Fota />} />
                  <Route path="advanced/ddns" element={<AdvancedPages.Ddns />} />
                  <Route path="advanced/tr069" element={<AdvancedPages.Tr069 />} />
                  <Route path="advanced/at" element={<AdvancedPages.At />} />
                  <Route path="advanced/device" element={<AdvancedPages.Device />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </HashRouter>
        <Toaster richColors closeButton position="top-right" />
      </ConfirmProvider>
    </ThemeProvider>
  );
}
