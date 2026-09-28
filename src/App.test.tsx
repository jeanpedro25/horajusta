import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./PrivateApp', () => ({
  default: () => <h1>Camada autenticada Hora Justa</h1>,
}));

vi.mock('./pages/LandingPage', () => ({
  default: () => <main><h1>Vitrine pública Hora Justa</h1></main>,
}));

vi.mock('./pages/NotFound', () => ({
  default: () => <h1>Página não encontrada</h1>,
}));

vi.mock('./pages/TermosUsoPage', () => ({ default: () => <h1>Termos de Uso</h1> }));
vi.mock('./pages/PrivacidadePublicaPage', () => ({ default: () => <h1>Política de Privacidade</h1> }));

describe('public route selection', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('renders the sales page without mounting the authenticated provider', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', {
      name: 'Vitrine pública Hora Justa',
    })).toBeVisible();
    expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
  });

  it('loads the authenticated route layer when a Supabase session is already cached', async () => {
    localStorage.setItem('sb-horajusta-auth-token', JSON.stringify({
      access_token: 'cached-token',
      user: { id: 'user-123' },
    }));

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Camada autenticada Hora Justa' })).toBeVisible();
  });

  it('keeps unknown URLs on the lightweight public 404 route', async () => {
    window.history.replaceState({}, '', '/rota-inexistente');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
    await waitFor(() => expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow'));
    expect(document.querySelector('link[rel="canonical"]')).not.toBeInTheDocument();
  });

  it('sets route-specific legal metadata and excludes draft legal pages from search indexes', async () => {
    window.history.replaceState({}, '', '/termos');
    const { unmount } = render(<App />);
    expect(await screen.findByRole('heading', { name: 'Termos de Uso' })).toBeVisible();
    await waitFor(() => expect(document.title).toBe('Termos de Uso | Hora Justa'));
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Consulte os Termos de Uso do Hora Justa, incluindo regras de uso, estimativas e acesso aos planos.',
    );
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://horajusta.com/termos');
    expect(document.querySelector('meta[property="og:url"]')).toHaveAttribute('content', 'https://horajusta.com/termos');
    expect(document.querySelector('meta[property="og:title"]')).toHaveAttribute('content', 'Termos de Uso | Hora Justa');
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
    unmount();

    window.history.replaceState({}, '', '/privacidade-publica');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Política de Privacidade' })).toBeVisible();
    await waitFor(() => expect(document.title).toBe('Política de Privacidade | Hora Justa'));
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Consulte como o Hora Justa trata dados pessoais, anexos, pagamentos e solicitações dos usuários.',
    );
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://horajusta.com/privacidade-publica');
    expect(document.querySelector('meta[property="og:url"]')).toHaveAttribute('content', 'https://horajusta.com/privacidade-publica');
    expect(document.querySelector('meta[property="og:title"]')).toHaveAttribute('content', 'Política de Privacidade | Hora Justa');
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  });

  it('removes the marketing canonical and prevents a signed-in app route from indexing', async () => {
    window.history.replaceState({}, '', '/app');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Camada autenticada Hora Justa' })).toBeVisible();
    await waitFor(() => expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow'));
    expect(document.querySelector('link[rel="canonical"]')).not.toBeInTheDocument();
  });
});
