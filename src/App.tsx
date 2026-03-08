import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import AppLayout from "./components/AppLayout";
import LicenseGate from "./components/LicenseGate";
import Dashboard from "./pages/Dashboard";
import CalendarPage from "./pages/CalendarPage";
import ClientsPage from "./pages/ClientsPage";
import POSPage from "./pages/POSPage";
import SettingsPage from "./pages/SettingsPage";
import CatalogPage from "./pages/CatalogPage";
import PortfolioPage from "./pages/PortfolioPage";
import MembershipsPage from "./pages/MembershipsPage";
import OffPeakPage from "./pages/OffPeakPage";
import WhatsAppBotPage from "./pages/WhatsAppBotPage";
import AuthPage from "./pages/AuthPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";
import BookingPage from "./pages/BookingPage";
import SuperAdminPage from "./pages/SuperAdminPage";

const queryClient = new QueryClient();

function DashboardRouter() {
  const { isSuperAdmin, isLoading } = useSuperAdmin();
  const [showSplash, setShowSplash] = useState(true);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (showSplash) {
    return (
      <SplashScreen
        role={isSuperAdmin ? "super_admin" : "admin"}
        onComplete={() => setShowSplash(false)}
      />
    );
  }

  if (isSuperAdmin) return <Navigate to="/super-admin" replace />;
  return <Dashboard />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
            <Route path="/auth" element={<AuthPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/book" element={<BookingPage />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <LicenseGate>
                      <AppLayout>
                        <Routes>
                          <Route path="/" element={<DashboardRouter />} />
                          <Route path="/calendar" element={<CalendarPage />} />
                          <Route path="/clients" element={<ClientsPage />} />
                          <Route path="/pos" element={<POSPage />} />
                          <Route path="/catalog" element={<CatalogPage />} />
                          <Route path="/portfolio" element={<PortfolioPage />} />
                          <Route path="/memberships" element={<MembershipsPage />} />
                          <Route path="/offpeak" element={<OffPeakPage />} />
                          <Route path="/whatsapp" element={<WhatsAppBotPage />} />
                          <Route path="/settings" element={<SettingsPage />} />
                          <Route path="/super-admin" element={<SuperAdminPage />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </AppLayout>
                    </LicenseGate>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
