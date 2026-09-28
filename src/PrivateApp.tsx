import React, { Fragment, Suspense, lazy } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { queryClient } from '@/lib/query-client';
import AdminRoute from '@/components/admin/AdminRoute';
import { hasCurrentLegalAcceptance } from '@/lib/legal-versions';

const AuthPage = lazy(() => import('./pages/AuthPage'));
const ChefEntrarPage = lazy(() => import('./pages/ChefEntrarPage'));
const AceiteTermosPage = lazy(() => import('./pages/AceiteTermosPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const AppPage = lazy(() => import('./pages/AppPage'));
const HistoricoPage = lazy(() => import('./pages/HistoricoPage'));
const RelatorioPage = lazy(() => import('./pages/RelatorioPage'));
const ConfigPage = lazy(() => import('./pages/ConfigPage'));
const PrivacidadePage = lazy(() => import('./pages/PrivacidadePage'));
const PlanosPage = lazy(() => import('./pages/PlanosPage'));
const RadarPage = lazy(() => import('./pages/RadarPage'));
const RescisaoPage = lazy(() => import('./pages/RescisaoPage'));
const FechamentoMensalPage = lazy(() => import('./pages/FechamentoMensalPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const NotFound = lazy(() => import('./pages/NotFound'));
const LandingPage = lazy(() => import('./pages/LandingPage'));

const FullScreenLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      <p className="text-sm text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

const NetworkErrorFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center px-6">
    <div className="flex flex-col items-center gap-4 max-w-sm text-center">
      <div className="text-4xl">⚠️</div>
      <h2 className="text-lg font-bold">Sem conexão com o servidor</h2>
      <p className="text-sm text-muted-foreground">
        Não foi possível conectar ao serviço. Verifique sua internet e tente novamente.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  </div>
);

const HomeRoute: React.FC = () => {
  const { session, profile, loading } = useAuth();
  const [timedOut, setTimedOut] = React.useState(false);
  const hasSession = Boolean(session);

  React.useEffect(() => {
    if (!loading || !hasSession) {
      setTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setTimedOut(true), 10_000);
    return () => window.clearTimeout(timer);
  }, [loading, hasSession]);

  if (timedOut && loading && session) return <NetworkErrorFallback />;
  if (loading && session) return <FullScreenLoader />;
  if (loading && !session) return <LandingPage />;
  if (!session) return <LandingPage />;
  if (!hasCurrentLegalAcceptance(profile)) return <Navigate to="/aceite-termos" replace />;
  if (profile?.onboarding_completo) return <Navigate to="/app" replace />;
  return <Navigate to="/onboarding" replace />;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; skipOnboardingCheck?: boolean }> = ({ children, skipOnboardingCheck }) => {
  const { session, profile, loading } = useAuth();
  const [timedOut, setTimedOut] = React.useState(false);

  React.useEffect(() => {
    if (!loading) return;
    const timer = window.setTimeout(() => setTimedOut(true), 10_000);
    return () => window.clearTimeout(timer);
  }, [loading]);

  if (timedOut && loading) return <NetworkErrorFallback />;
  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/auth" replace />;
  if (!hasCurrentLegalAcceptance(profile)) return <Navigate to="/aceite-termos" replace />;
  if (!skipOnboardingCheck && !profile.onboarding_completo) return <Navigate to="/onboarding" replace />;
  return <Fragment key={session.user.id}>{children}</Fragment>;
};

const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, profile, loading } = useAuth();
  const location = useLocation();
  const requestedRedirect = new URLSearchParams(location.search).get('redirect');
  const redirect = location.pathname === '/chefe/entrar'
    ? '/chefe'
    : requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//')
      ? requestedRedirect
      : null;
  if (loading && session) return <FullScreenLoader />;
  if (!session) return <>{children}</>;
  if (!hasCurrentLegalAcceptance(profile)) return <Navigate to="/aceite-termos" replace />;
  if (profile?.onboarding_completo) return <Navigate to={redirect || '/app'} replace />;
  if (!profile?.onboarding_completo) return <Navigate to="/onboarding" replace />;
  return <Fragment key={session?.user.id ?? 'guest'}>{children}</Fragment>;
};

const TermsRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, profile, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/auth" replace />;
  if (hasCurrentLegalAcceptance(profile) && profile?.onboarding_completo) return <Navigate to="/app" replace />;
  if (hasCurrentLegalAcceptance(profile) && !profile?.onboarding_completo) return <Navigate to="/onboarding" replace />;
  return <Fragment key={session.user.id}>{children}</Fragment>;
};

const PrivateApp: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <Suspense fallback={<FullScreenLoader />}>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/auth" element={<AuthRoute><AuthPage /></AuthRoute>} />
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route path="/entrar" element={<Navigate to="/auth" replace />} />
            <Route path="/chefe/entrar" element={<ChefEntrarPage />} />
            <Route path="/admin/login" element={<Navigate to="/chefe/entrar" replace />} />
            <Route path="/admin/entrar" element={<Navigate to="/chefe/entrar" replace />} />
            <Route path="/aceite-termos" element={<TermsRoute><AceiteTermosPage /></TermsRoute>} />
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
            <Route path="/chefe" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
            <Route path="/admin" element={<Navigate to="/chefe" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default PrivateApp;
