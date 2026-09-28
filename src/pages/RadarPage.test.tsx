import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  from: vi.fn(),
  order: vi.fn(),
  usePlano: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: mocks.useAuth }));
vi.mock('@/hooks/usePlano', () => ({ usePlano: mocks.usePlano }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));

import RadarPage from '@/pages/RadarPage';

describe('RadarPage data loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({
      user: { id: 'user-1' },
      profile: {
        tipo_jornada: 'jornada_fixa',
        carga_horaria_diaria: 8,
        salario_base: 3000,
        hora_extra_percentual: 50,
      },
    });
    mocks.usePlano.mockReturnValue({ podeUsarPro: true });
    mocks.order.mockResolvedValue({ data: null, error: new Error('falha de rede') });
    mocks.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({ order: mocks.order }),
            }),
          }),
        }),
      }),
    });
  });

  it('shows a retryable error instead of claiming no alerts when loading fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<MemoryRouter><RadarPage /></MemoryRouter>);

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível analisar seus registros');
    expect(screen.getByText(/Não interpretamos uma falha de carregamento como ausência de alertas/)).toBeInTheDocument();
    expect(screen.queryByText('Nenhum alerta identificado neste período')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(mocks.from).toHaveBeenCalledTimes(2));
    errorSpy.mockRestore();
  });
});
