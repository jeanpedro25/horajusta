import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  from: vi.fn(),
  order: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: mocks.useAuth }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));

import FeriasConfig from '@/components/FeriasConfig';

describe('FeriasConfig data loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ user: { id: 'user-1' }, profile: null });
    mocks.order.mockResolvedValueOnce({ data: null, error: new Error('falha de rede') })
      .mockResolvedValueOnce({ data: [], error: null });
    mocks.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ order: mocks.order }),
      }),
    });
  });

  it('does not hide a failed query as an empty holiday balance and supports retry', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<FeriasConfig />);

    expect(await screen.findByRole('alert')).toHaveTextContent('O saldo pode estar incompleto');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByRole('button', { name: 'Agendar período de férias' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mocks.from).toHaveBeenCalledTimes(2);
    errorSpy.mockRestore();
  });

  it('allows a five-day split period while warning that the set needs a fourteen-day period', async () => {
    mocks.order.mockReset().mockResolvedValue({ data: [], error: null });
    render(<FeriasConfig />);

    fireEvent.click(screen.getByRole('button', { name: 'Agendar período de férias' }));
    fireEvent.change(screen.getByLabelText('Início'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '2026-10-05' } });
    fireEvent.click(screen.getByLabelText('Fracionadas (mín. 5 dias)'));

    expect(await screen.findByText(/um dos períodos deve ter ao menos 14 dias corridos/)).toBeInTheDocument();
    expect(screen.queryByText(/Cada período fracionado deve ter ao menos 5 dias corridos/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '2026-10-04' } });
    expect(await screen.findByText(/Cada período fracionado deve ter ao menos 5 dias corridos/)).toBeInTheDocument();
  });
});
