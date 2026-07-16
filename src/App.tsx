import { Fragment, lazy, Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/query-client";
import AdminRoute from "@/components/admin/AdminRoute";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const AceiteTermosPage = lazy(() => import("./pages/AceiteTermosPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const AppPage = lazy(() => import("./pages/AppPage"));
const HistoricoPage = lazy(() => import("./pages/HistoricoPage"));
const RelatorioPage = lazy(() => import("./pages/RelatorioPage"));
const ConfigPage = lazy(() => import("./pages/ConfigPage"));
const PrivacidadePage = lazy(() => import("./pages/PrivacidadePage"));
const PrivacidadePublicaPage = lazy(() => import("./pages/PrivacidadePublicaPage"));
const TermosUsoPage = lazy(() => import("./pages/TermosUsoPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PlanosPage = lazy(() => import("./pages/PlanosPage"));
const RadarPage = lazy(() => import("./pages/RadarPage"));
const RescisaoPage = lazy(() => import("./pages/RescisaoPage"));
const FechamentoMensalPage = lazy(() => import("./pages/FechamentoMensalPage"));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));

const FullScreenLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <p className="text-muted-foreground">Carregando...</p>
  </div>
);

const HomeRoute: React.FC = () => {
  const { session, profile, loading } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (!session) return <LandingPage />;
  if (!profile || !(profile as any).aceite_termos) return <Navigate to="/aceite-termos" replace />;
  if (profile?.onboarding_completo) return <Navigate to="/app" replace />;
  return <Navigate to="/onboarding" replace />;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; skipOnboardingCheck?: boolean }> = ({ children, skipOnboardingCheck }) => {
  const { session, profile, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/auth" replace />;
  if (!profile || !(profile as any).aceite_termos) return <Navigate to="/aceite-termos" replace />;
  if (!skipOnboardingCheck && !profile.onboarding_completo) return <Navigate to="/onboarding" replace />;
  return <Fragment key={session.user.id}>{children}</Fragment>;
};

const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, profile, loading } = useAuth();
  const location = useLocation();
  const requestedRedirect = new URLSearchParams(location.search).get('redirect');
  const redirect = requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//')
    ? requestedRedirect
    : null;
  if (loading) return <FullScreenLoader />;
  if (session && (!profile || !(profile as any).aceite_termos)) return <Navigate to="/aceite-termos" replace />;
  if (session && profile?.onboarding_completo) return <Navigate to={redirect || "/app"} replace />;
  if (session && !profile?.onboarding_completo) return <Navigate to="/onboarding" replace />;
  return <Fragment key={session?.user.id ?? 'guest'}>{children}</Fragment>;
};

const TermsRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, profile, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/auth" replace />;
  if (profile && (profile as any).aceite_termos && profile.onboarding_completo) return <Navigate to="/app" replace />;
  if (profile && (profile as any).aceite_termos && !profile.onboarding_completo) return <Navigate to="/onboarding" replace />;
  return <Fragment key={session.user.id}>{children}</Fragment>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<FullScreenLoader />}>
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
              <Route path="/login" element={<Navigate to="/auth" replace />} />
              <Route path="/entrar" element={<Navigate to="/auth" replace />} />
              <Route path="/admin/login" element={<Navigate to="/auth?redirect=%2Fadmin" replace />} />
              <Route path="/admin/entrar" element={<Navigate to="/auth?redirect=%2Fadmin" replace />} />
              <Route path="/aceite-termos" element={<TermsRoute><AceiteTermosPage /></TermsRoute>} />
              <Route path="/termos" element={<TermosUsoPage />} />
              <Route path="/privacidade-publica" element={<PrivacidadePublicaPage />} />
              <Route path="/onboarding" element={<ProtectedRoute skipOnboardingCheck><OnboardingPage /></ProtectedRoute>} />
              <Route path="/app" element={<ProtectedRoute><AppPage /></ProtectedRoute>} />
              <Route path="/historico" element={<ProtectedRoute><HistoricoPage /></ProtectedRoute>} />
              <Route path="/relatorio" element={<ProtectedRoute><RelatorioPage /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute><ConfigPage /></ProtectedRoute>} />
              <Route path="/privacidade" element={<ProtectedRoute><PrivacidadePage /></ProtectedRoute>} />
              <Route path="/planos" element={<ProtectedRoute><PlanosPage /></ProtectedRoute>} />
              <Route path="/radar" element={<ProtectedRoute><RadarPage /></ProtectedRoute>} />
              <Route path="/rescisao" element={<ProtectedRoute><RescisaoPage /></ProtectedRoute>} />
              <Route path="/fgts" element={<ProtectedRoute><FechamentoMensalPage /></ProtectedRoute>} />
              <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
