import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/authContext";
import { ThemeProvider } from "@/lib/themeContext";
import { LiveDataProvider } from "@/lib/liveDataContext";
import { SirenProvider } from "@/lib/sirenContext";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import PublicDashboard from "./pages/PublicDashboard";
import Devices from "./pages/Devices";
import DeviceSettings from "./pages/DeviceSettings";
import DeviceNotifications from "./pages/DeviceNotifications";
import Alerts from "./pages/Alerts";
import Logs from "./pages/Logs";
import AdminUsers from "./pages/AdminUsers";
import MockData from "./pages/MockData";
import KejadianBanjir from "./pages/KejadianBanjir";
import WargaTerdampak from "./pages/WargaTerdampak";
import KelolaWilayah from "./pages/KelolaWilayah";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="bottom-right" richColors closeButton offset={24} />
        <AuthProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <SirenProvider>
              <LiveDataProvider>
                <Routes>
                  <Route path="/" element={<Navigate to="/public" replace />} />
                  <Route path="/public" element={<PublicDashboard />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/devices" element={<ProtectedRoute><Devices /></ProtectedRoute>} />
                  <Route path="/devices/:id/settings" element={<ProtectedRoute><DeviceSettings /></ProtectedRoute>} />
                  <Route path="/devices/:id/notifications" element={<ProtectedRoute><DeviceNotifications /></ProtectedRoute>} />
                  <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
                  <Route path="/logs" element={<ProtectedRoute><Logs /></ProtectedRoute>} />
                  <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
                  <Route path="/admin/mock-data" element={<ProtectedRoute><MockData /></ProtectedRoute>} />
                  <Route path="/banjir/kejadian" element={<ProtectedRoute><KejadianBanjir /></ProtectedRoute>} />
                  <Route path="/banjir/warga" element={<ProtectedRoute><WargaTerdampak /></ProtectedRoute>} />
                  <Route path="/banjir/wilayah" element={<ProtectedRoute><KelolaWilayah /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </LiveDataProvider>
            </SirenProvider>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
