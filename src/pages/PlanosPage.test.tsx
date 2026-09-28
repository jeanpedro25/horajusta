import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlanosPage from './PlanosPage';

const mocks = vi.hoisted(() => ({
  user: null as { id: string } | null,
  profile: null as object | null,
  refreshProfile: vi.fn<() => Promise<void>>(),
  toast: vi.fn(),
  maybeSingle: vi.fn(),
  iniciarCheckout: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user, profile: mocks.profile, refreshProfile: mocks.refreshProfile }),
}));

vi.mock('@/hooks/usePlano', () => ({
  usePlano: () => ({ isPro: false, isTrial: false }),
}));

vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));

vi.mock('@/lib/payments', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/payments')>(),
  iniciarCheckoutMercadoPago: mocks.iniciarCheckout,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mocks.maybeSingle }),
      }),
    }),
  },
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

beforeEach(() => {
  mocks.user = null;
  mocks.profile = null;
  mocks.refreshProfile.mockReset().mockResolvedValue(undefined);
  mocks.toast.mockReset();
  mocks.maybeSingle.mockReset();
  mocks.iniciarCheckout.mockReset();
});

describe('in-app plan offers', () => {
  it('gives the icon-only back control an accessible name', () => {
    render(<MemoryRouter initialEntries={['/planos']}><PlanosPage /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument();
  });

  it('locks plan buttons during checkout, prevents duplicate attempts and unlocks after failure', async () => {
    mocks.user = { id: 'user-123' };
    mocks.profile = {};
    let rejectCheckout!: (error: Error) => void;
    mocks.iniciarCheckout.mockReturnValue(new Promise((_, reject) => {
      rejectCheckout = reject;
    }));

    render(<MemoryRouter initialEntries={['/planos']}><PlanosPage /></MemoryRouter>);
    const monthly = screen.getByRole('button', { name: /Assinar PRO Mensal/ });
    const annual = screen.getByRole('button', { name: /Assinar PRO Anual/ });
    fireEvent.click(monthly);

    await waitFor(() => expect(mocks.iniciarCheckout).toHaveBeenCalledOnce());
    expect(mocks.iniciarCheckout).toHaveBeenCalledWith(expect.anything(), 'pro');
    expect(monthly).toBeDisabled();
    expect(annual).toBeDisabled();
    expect(monthly).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Abrindo checkout do Mercado Pago');
    fireEvent.click(annual);
    expect(mocks.iniciarCheckout).toHaveBeenCalledOnce();

    await act(async () => rejectCheckout(new Error('Falha simulada; nenhum checkout real foi iniciado.')));
    await waitFor(() => {
      expect(monthly).toBeEnabled();
      expect(annual).toBeEnabled();
    });
  });

  it('explains the free trial before showing paid plan checkout choices', () => {
    render(<MemoryRouter initialEntries={['/planos']}><PlanosPage /></MemoryRouter>);
    expect(screen.getByText('Comece pelo teste PRO grátis')).toBeInTheDocument();
    expect(screen.getByText(/Ao criar sua conta, você ganha 7 dias com todos os recursos PRO, sem cartão/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar conta e testar grátis' })).toBeInTheDocument();
    expect(screen.getByText('📋 Plano gratuito')).toBeInTheDocument();
    expect(screen.getByText(/continuar usando o Hora Justa depois do teste PRO, sem prazo e sem cobrança/)).toBeInTheDocument();
    expect(screen.queryByText(/atual de todos/)).not.toBeInTheDocument();
  });

  it('confirms a successful payment even if refreshing the local profile rejects', async () => {
    mocks.user = { id: 'user-123' };
    mocks.refreshProfile.mockRejectedValueOnce(new Error('temporary profile refresh failure'));
    mocks.maybeSingle.mockResolvedValueOnce({
      data: {
        plano: 'pro',
        plano_vencimento: '2099-01-01T00:00:00.000Z',
        is_pro: true,
        subscription_status: 'active',
      },
    });

    render(
      <MemoryRouter initialEntries={['/planos?payment=success&plano=pro']}>
        <PlanosPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Acesso PRO ativado',
    })));
    expect(mocks.maybeSingle).toHaveBeenCalledOnce();
    expect(screen.getByTestId('location-search')).toHaveTextContent('');
  });

  it('never treats a successful checkout return as activation without confirmed entitlement', async () => {
    vi.useFakeTimers();
    mocks.user = { id: 'user-123' };
    mocks.maybeSingle.mockResolvedValue({ data: null });

    try {
      render(
        <MemoryRouter initialEntries={['/planos?payment=success&plano=pro']}>
          <PlanosPage />
          <LocationProbe />
        </MemoryRouter>,
      );

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(mocks.maybeSingle).toHaveBeenCalledTimes(10);
      expect(mocks.refreshProfile).not.toHaveBeenCalled();
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Pagamento em processamento',
        description: expect.stringContaining('antes de iniciar outra compra'),
      }));
      expect(mocks.toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Acesso PRO ativado' }));
      expect(screen.getByTestId('location-search')).toHaveTextContent('');
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows one-time duration and non-renewal beside both prices without repeating annual terms', () => {
    render(<MemoryRouter initialEntries={['/planos']}><PlanosPage /></MemoryRouter>);

    expect(screen.getByText('pagamento único · acesso por 1 mês · sem renovação automática')).toBeInTheDocument();
    expect(screen.getByText('pagamento único · acesso por 12 meses · sem renovação automática')).toBeInTheDocument();
    expect(screen.getByText('Tudo do plano mensal')).toBeInTheDocument();
    expect(screen.getByText('Pagamento único. Sem renovação automática ou cobrança recorrente.')).toBeInTheDocument();
    expect(screen.queryByText('Acesso por 12 meses')).not.toBeInTheDocument();
    expect(screen.queryByText('Pagamento único, sem renovação automática')).not.toBeInTheDocument();
    expect(screen.getByText('Checkout do Mercado Pago')).toBeInTheDocument();
    expect(screen.getByText('Opções disponíveis exibidas no checkout')).toBeInTheDocument();
  });

  it('explains that a pending payment should not be repeated and removes its return parameters', async () => {
    render(
      <MemoryRouter initialEntries={['/planos?payment=pending']}>
        <PlanosPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: '⏳ Pagamento pendente',
      description: expect.stringContaining('Não faça outro pagamento'),
    })));
    expect(screen.getByTestId('location-search')).toHaveTextContent('');
  });

  it('reports an unsuccessful payment as destructive and removes its return parameters', async () => {
    render(
      <MemoryRouter initialEntries={['/planos?payment=failure']}>
        <PlanosPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: '❌ Pagamento não concluído',
      variant: 'destructive',
    })));
    expect(screen.getByTestId('location-search')).toHaveTextContent('');
  });
});
