import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ANNUAL_SAVINGS_CENTS, formatBRLCents } from '../../supabase/functions/_shared/plan-catalog';
import PaywallModal from './PaywallModal';

const mocks = vi.hoisted(() => ({
  user: null as null | { id: string },
  iniciarCheckout: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock('@/lib/payments', () => ({
  iniciarCheckoutMercadoPago: mocks.iniciarCheckout,
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('paywall plan comparison', () => {
  it('exposes mutually exclusive plan choices as accessible radios with the annual plan selected by default', async () => {
    render(<PaywallModal open onOpenChange={vi.fn()} />);

    const monthly = screen.getByRole('radio', { name: /Mensal, R\$\s*9,90/ });
    const annual = screen.getByRole('radio', { name: /Anual, R\$\s*89,90/ });
    expect(monthly).not.toBeChecked();
    expect(annual).toBeChecked();
    expect(monthly.closest('[role="radiogroup"]')).toHaveAttribute('aria-label', 'Escolha o período de acesso PRO');

    fireEvent.click(monthly);
    expect(monthly).toBeChecked();
    expect(annual).not.toBeChecked();

    await act(async () => {
      annual.focus();
      fireEvent.keyDown(annual, { key: 'ArrowLeft' });
    });
    await waitFor(() => {
      expect(monthly).toBeChecked();
      expect(monthly).toHaveFocus();
    });
  });

  it('shows the exact annual savings computed from the shared price catalog', () => {
    render(<PaywallModal open onOpenChange={vi.fn()} />);

    const savings = `Economize ${formatBRLCents(ANNUAL_SAVINGS_CENTS)} comparado a 12 meses no mensal`;
    expect(screen.getByText((_, element) =>
      element?.textContent?.replace(/\u00a0/g, ' ') === savings.replace(/\u00a0/g, ' '),
    )).toBeInTheDocument();
    expect(screen.getByText(/Pagamento único, sem renovação automática/)).toBeInTheDocument();
    expect(screen.getByText(/continuará no checkout do Mercado Pago/)).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Visualize a estimativa completa da sua jornada' })).toBeInTheDocument();
  });

  it('locks the selected plan during checkout and restores it after a recoverable error', async () => {
    mocks.user = { id: 'test-user' };
    let rejectCheckout!: (error: Error) => void;
    mocks.iniciarCheckout.mockReturnValue(new Promise((_, reject) => {
      rejectCheckout = reject;
    }));

    render(<PaywallModal open onOpenChange={vi.fn()} />);
    const monthly = screen.getByRole('radio', { name: /Mensal, R\$\s*9,90/ });
    const annual = screen.getByRole('radio', { name: /Anual, R\$\s*89,90/ });

    fireEvent.click(monthly);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar para pagamento' }));

    await waitFor(() => expect(mocks.iniciarCheckout).toHaveBeenCalledOnce());
    expect(mocks.iniciarCheckout).toHaveBeenCalledWith(expect.anything(), 'pro');
    expect(monthly).toBeDisabled();
    expect(annual).toBeDisabled();
    const checkoutButton = screen.getByRole('button', { name: 'Abrindo checkout… aguarde' });
    expect(checkoutButton).toBeDisabled();
    expect(checkoutButton).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Abrindo checkout… aguarde');
    fireEvent.click(checkoutButton);
    expect(mocks.iniciarCheckout).toHaveBeenCalledOnce();

    await act(async () => rejectCheckout(new Error('Falha simulada; nenhum checkout real foi iniciado.')));
    await waitFor(() => {
      expect(monthly).toBeEnabled();
      expect(annual).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Continuar para pagamento' })).toBeEnabled();
    });
  });
});
