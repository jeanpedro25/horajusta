import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import RouteMetadata from './components/RouteMetadata';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const TermosUsoPage = lazy(() => import('./pages/TermosUsoPage'));
const PrivacidadePublicaPage = lazy(() => import('./pages/PrivacidadePublicaPage'));
const NotFound = lazy(() => import('./pages/NotFound'));
const PrivateApp = lazy(() => import('./PrivateApp'));
const privateRoutePrefixes = [
  '/auth', '/login', '/entrar', '/chefe', '/admin', '/aceite-termos', '/onboarding',
  '/app', '/historico', '/relatorio', '/configuracoes', '/privacidade', '/planos',
  '/radar', '/rescisao', '/fgts',
];

const PublicLoader = () => (
  <div className="min-h-screen bg-background" aria-busy="true" aria-label="Carregando página" />
);

function hasCachedSupabaseSession(): boolean {
  try {
    const key = Object.keys(localStorage).find(name => name.startsWith('sb-') && name.endsWith('-auth-token'));
    if (!key) return false;
    const stored = JSON.parse(localStorage.getItem(key) || 'null');
    const session = stored?.currentSession ?? stored;
    return Boolean(session?.access_token && session?.user);
  } catch {
    return false;
  }
}

const RouteLayer: React.FC = () => {
  const { pathname } = useLocation();
  const isPrivatePath = privateRoutePrefixes.some(route => pathname === route || pathname.startsWith(`${route}/`));
  const enterPrivateApp = isPrivatePath || (pathname === '/' && hasCachedSupabaseSession());

  if (enterPrivateApp) return <PrivateApp />;

  return (
    <Suspense fallback={<PublicLoader />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/termos" element={<TermosUsoPage />} />
        <Route path="/privacidade-publica" element={<PrivacidadePublicaPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <RouteMetadata />
    <Suspense fallback={<PublicLoader />}>
      <RouteLayer />
    </Suspense>
  </BrowserRouter>
);

export default App;
