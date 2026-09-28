import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import AuthPage from './AuthPage';

const { supabaseOAuth, lovableOAuth, supabaseSignUp, supabaseResend, checkoutInvoke, toast } = vi.hoisted(() => ({
  supabaseOAuth: vi.fn().mockResolvedValue({ error: null }),
  lovableOAuth: vi.fn().mockResolvedValue({ error: null }),
  supabaseSignUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
  supabaseResend: vi.fn().mockResolvedValue({ error: null }),
  checkoutInvoke: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { signInWithOAuth: supabaseOAuth, signUp: supabaseSignUp, resend: supabaseResend },
    functions: { invoke: checkoutInvoke },
  },
}));

vi.mock('@/hooks/use-toast', () => ({ toast }));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="pathname">{location.pathname}</output>;
}

vi.mock('@/integrations/lovable/index', () => ({
  lovable: { auth: { signInWithOAuth: lovableOAuth } },
}));

describe('Google sign-in provider selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_USE_LOVABLE_OAUTH', 'false');
  });

  afterEach(() => vi.unstubAllEnvs());

  it('exposes login and signup as keyboard-navigable tabs with the correct selected state', async () => {
    render(<MemoryRouter initialEntries={['/auth']}><AuthPage /></MemoryRouter>);

    const loginTab = screen.getByRole('tab', { name: 'Entrar' });
    const signupTab = screen.getByRole('tab', { name: 'Criar conta' });
    expect(loginTab).toHaveAttribute('aria-selected', 'true');
    expect(signupTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('Senha')).toHaveAttribute('autocomplete', 'current-password');

    await act(async () => {
      loginTab.focus();
      fireEvent.keyDown(loginTab, { key: 'ArrowRight' });
    });
    await waitFor(() => {
      expect(signupTab).toHaveAttribute('aria-selected', 'true');
      expect(signupTab).toHaveFocus();
    });
  });

  it('uses Supabase OAuth by default and preserves a safe redirect', async () => {
    render(<MemoryRouter initialEntries={['/auth?redirect=%2Fapp']}><AuthPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Entrar com Google' }));

    await waitFor(() => expect(supabaseOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth?redirect=%2Fapp` },
    }));
    expect(lovableOAuth).not.toHaveBeenCalled();
  });

  it('uses Lovable OAuth only when its environment flag is enabled', async () => {
    vi.stubEnv('VITE_USE_LOVABLE_OAUTH', 'true');
    render(<MemoryRouter initialEntries={['/auth']}><AuthPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Entrar com Google' }));

    await waitFor(() => expect(lovableOAuth).toHaveBeenCalledWith('google', {
      redirect_uri: `${window.location.origin}/auth`,
    }));
    expect(supabaseOAuth).not.toHaveBeenCalled();
  });

  it('creates the account without asking for payment or starting checkout', async () => {
    render(<MemoryRouter initialEntries={['/auth']}><AuthPage /></MemoryRouter>);

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Criar conta' }), { button: 0 });
    await waitFor(() => expect(screen.getByText('7 dias grátis para testar o PRO · sem cartão')).toBeInTheDocument());
    expect(screen.getByLabelText('Senha')).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByText(/O período começa quando sua conta é criada\. Não há cobrança automática/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'teste@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-forte-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() => expect(supabaseSignUp).toHaveBeenCalledWith({
      email: 'teste@example.com',
      password: 'senha-forte-123',
      options: { emailRedirectTo: `${window.location.origin}/auth` },
    }));
    expect(supabaseOAuth).not.toHaveBeenCalled();
    expect(lovableOAuth).not.toHaveBeenCalled();
    expect(checkoutInvoke).not.toHaveBeenCalled();
    expect(screen.getByRole('tab', { name: 'Entrar' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(/Enviamos um link para teste@example\.com/);

    fireEvent.click(screen.getByRole('button', { name: 'Reenviar link de confirmação' }));
    await waitFor(() => expect(supabaseResend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'teste@example.com',
      options: { emailRedirectTo: `${window.location.origin}/auth` },
    }));
    expect(await screen.findByRole('button', { name: 'Link reenviado' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Ir para entrar' }));
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toHaveValue('');
  });

  it('continues into the app when signup returns an active session instead of asking for email confirmation', async () => {
    supabaseSignUp.mockResolvedValueOnce({
      data: { session: { access_token: 'mock-token' } },
      error: null,
    });
    render(
      <MemoryRouter initialEntries={['/auth']}>
        <AuthPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Criar conta' }), { button: 0 });
    await waitFor(() => expect(screen.getByText('7 dias grátis para testar o PRO · sem cartão')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'imediata@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-forte-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() => expect(screen.getByTestId('pathname')).toHaveTextContent('/'));
    expect(screen.queryByRole('heading', { name: 'Confirme seu e-mail' })).not.toBeInTheDocument();
    expect(supabaseResend).not.toHaveBeenCalled();
  });

  it('keeps confirmation instructions visible and allows retry when resending the email fails', async () => {
    supabaseResend.mockRejectedValueOnce(new Error('Falha simulada de envio'));
    render(<MemoryRouter initialEntries={['/auth']}><AuthPage /></MemoryRouter>);

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Criar conta' }), { button: 0 });
    await waitFor(() => expect(screen.getByText('7 dias grátis para testar o PRO · sem cartão')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'retry@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-forte-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    const resendButton = await screen.findByRole('button', { name: 'Reenviar link de confirmação' });
    fireEvent.click(resendButton);

    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Erro ao reenviar',
      variant: 'destructive',
    })));
    expect(screen.getByRole('status')).toHaveTextContent('Confirme seu e-mail');
    expect(resendButton).toBeEnabled();
  });
});
