import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  from: vi.fn(),
  fetchBancoHorasEntries: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: mocks.useAuth }));
vi.mock('@/hooks/usePaywall', () => ({ usePaywall: () => ({ canExportPdf: true }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/lib/banco-horas', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/banco-horas')>();
  return { ...actual, fetchBancoHorasEntries: mocks.fetchBancoHorasEntries };
});

import RelatorioPage from '@/pages/RelatorioPage';

describe('RelatorioPage data loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({
      user: { id: 'user-1' },
      profile: { id: 'user-1', tipo_jornada: 'jornada_fixa', carga_horaria_diaria: 8 },
    });
    mocks.fetchBancoHorasEntries.mockResolvedValue([]);
    mocks.from.mockImplementation(() => {
      const result = { data: null, error: new Error('falha temporária') };
      const query = {
        select() { return this; },
        eq() { return this; },
        is() { return this; },
        gte() { return this; },
        lte() { return this; },
        order() { return this; },
        not() { return this; },
        in() { return this; },
        then(onFulfilled: (value: typeof result) => unknown) {
          return Promise.resolve(result).then(onFulfilled);
        },
      };
      return query;
    });
  });

  it('marks the report unavailable and keeps PDF export disabled when a query fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<MemoryRouter><RelatorioPage /></MemoryRouter>);

    expect(await screen.findByRole('alert')).toHaveTextContent('O resumo e o PDF estão indisponíveis');
    expect(screen.getByRole('button', { name: 'Gerar Relatório PDF' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(mocks.from).toHaveBeenCalledTimes(2));

    errorSpy.mockRestore();
  });

  it('generates a local PDF from successfully loaded, mocked data', async () => {
    mocks.from.mockImplementation((table: string) => {
      let columns = '*';
      const response = () => {
        if (table === 'profiles') return { data: { id: 'user-1', nome: 'Pessoa Teste', tipo_jornada: 'jornada_fixa', carga_horaria_diaria: 8 }, error: null };
        if (table === 'compensacoes_banco_horas' && columns === 'minutos') return { data: [{ minutos: 0 }], error: null };
        return { data: [], error: null };
      };
      const query = {
        select(value = '*') { columns = value; return this; },
        eq() { return this; },
        is() { return this; },
        gte() { return this; },
        lte() { return this; },
        order() { return this; },
        not() { return this; },
        in() { return this; },
        single() { return this; },
        then(onFulfilled: (value: ReturnType<typeof response>) => unknown) {
          return Promise.resolve(response()).then(onFulfilled);
        },
      };
      return query;
    });

    const OriginalURL = URL;
    class URLWithBlobSupport extends OriginalURL {}
    Object.defineProperty(URLWithBlobSupport, 'createObjectURL', { value: vi.fn(() => 'blob:hora-justa-test') });
    Object.defineProperty(URLWithBlobSupport, 'revokeObjectURL', { value: vi.fn() });
    vi.stubGlobal('URL', URLWithBlobSupport);
    const downloadSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<MemoryRouter><RelatorioPage /></MemoryRouter>);

    const openButton = await screen.findByRole('button', { name: 'Gerar Relatório PDF' });
    await waitFor(() => expect(openButton).toBeEnabled());
    fireEvent.click(openButton);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar PDF' }));

    await waitFor(() => expect(downloadSpy).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    vi.unstubAllGlobals();
    downloadSpy.mockRestore();
  });
});
