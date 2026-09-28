import { useEffect, type FC } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_ORIGIN = 'https://horajusta.com';
const HOME_TITLE = 'Hora Justa — Registre e acompanhe sua jornada';
const HOME_DESCRIPTION = 'Registre entrada, intervalo e saída. Acompanhe horas extras e banco de horas. Experimente os recursos PRO por 7 dias, sem cartão nem cobrança automática.';

const routeMetadata: Record<string, { title: string; description: string; robots: string }> = {
  '/': { title: HOME_TITLE, description: HOME_DESCRIPTION, robots: 'index, follow' },
  '/termos': {
    title: 'Termos de Uso | Hora Justa',
    description: 'Consulte os Termos de Uso do Hora Justa, incluindo regras de uso, estimativas e acesso aos planos.',
    robots: 'noindex, follow',
  },
  '/privacidade-publica': {
    title: 'Política de Privacidade | Hora Justa',
    description: 'Consulte como o Hora Justa trata dados pessoais, anexos, pagamentos e solicitações dos usuários.',
    robots: 'noindex, follow',
  },
};

function hasCachedSession(): boolean {
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

function setMeta(selector: string, create: () => HTMLMetaElement, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = create();
    document.head.append(element);
  }
  element.content = content;
}

function setCanonical(url: string | null) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!url) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.append(element);
  }
  element.href = url;
}

const RouteMetadata: FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/';
    const page = routeMetadata[normalizedPath];
    const isPrivateEntry = normalizedPath === '/' && hasCachedSession();
    const title = isPrivateEntry ? 'Hora Justa' : page?.title ?? 'Página não encontrada | Hora Justa';
    const description = isPrivateEntry
      ? 'Área pessoal do Hora Justa.'
      : page?.description ?? 'A página solicitada não foi encontrada.';
    const robots = isPrivateEntry ? 'noindex, nofollow' : page?.robots ?? 'noindex, nofollow';
    const canonical = page && !isPrivateEntry ? `${SITE_ORIGIN}${normalizedPath === '/' ? '/' : normalizedPath}` : null;

    document.title = title;
    setMeta('meta[name="description"]', () => {
      const meta = document.createElement('meta');
      meta.name = 'description';
      return meta;
    }, description);
    setMeta('meta[name="robots"]', () => {
      const meta = document.createElement('meta');
      meta.name = 'robots';
      return meta;
    }, robots);
    setMeta('meta[property="og:title"]', () => {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:title');
      return meta;
    }, title);
    setMeta('meta[property="og:description"]', () => {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:description');
      return meta;
    }, description);
    setMeta('meta[property="og:url"]', () => {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:url');
      return meta;
    }, canonical ?? `${SITE_ORIGIN}${normalizedPath}`);
    setMeta('meta[name="twitter:title"]', () => {
      const meta = document.createElement('meta');
      meta.name = 'twitter:title';
      return meta;
    }, title);
    setMeta('meta[name="twitter:description"]', () => {
      const meta = document.createElement('meta');
      meta.name = 'twitter:description';
      return meta;
    }, description);
    setCanonical(canonical);
  }, [pathname]);

  return null;
};

export default RouteMetadata;
