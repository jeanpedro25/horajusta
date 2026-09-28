import { beforeEach, describe, expect, it, vi } from 'vitest';
import { contarDiasUteis, gerarHistoricoMultiPeriodo } from '@/lib/historico-automatico';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  cleanupUpdate: vi.fn(),
  insert: vi.fn(),
  profileUpdate: vi.fn(),
  localSelect: vi.fn(),
  operations: [] as string[],
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mocks.from },
}));

function configureSupabaseMock() {
  mocks.localSelect.mockReturnValue({ eq: vi.fn(async () => ({ data: [], error: null })) });
  const cleanupQuery: Record<string, ReturnType<typeof vi.fn>> = {};
  cleanupQuery.eq = vi.fn(() => cleanupQuery);
  cleanupQuery.gte = vi.fn(() => cleanupQuery);
  cleanupQuery.lte = vi.fn(() => cleanupQuery);
  cleanupQuery.is = vi.fn(async () => {
    mocks.operations.push('cleanup');
    return { error: null };
  });

  const profileQuery = {
    eq: vi.fn(async () => ({ error: null })),
  };

  mocks.cleanupUpdate.mockReturnValue(cleanupQuery);
  mocks.profileUpdate.mockReturnValue(profileQuery);
  mocks.from.mockImplementation((table: string) => table === 'marcacoes_ponto'
    ? { update: mocks.cleanupUpdate, insert: mocks.insert }
    : table === 'feriados_locais'
      ? { select: mocks.localSelect }
      : { update: mocks.profileUpdate });
  mocks.insert.mockImplementation(async () => {
    mocks.operations.push('insert');
    return { error: null };
  });
}

const singleWorkdayPeriod = [{
  dataInicio: '2025-01-06',
  dataFim: '2025-01-06',
  entradaHora: '09:00',
  saidaHora: '18:00',
  intervaloMin: 60,
  diasSemana: [1],
}];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.operations.length = 0;
  configureSupabaseMock();
});

describe('contarDiasUteis', () => {
  it('conta apenas dias úteis seg-sex, excluindo feriados', () => {
    // Semana de 06/01/2025 (seg) a 10/01/2025 (sex) = 5 dias úteis
    const count = contarDiasUteis('2025-01-06', '2025-01-10', [1, 2, 3, 4, 5]);
    expect(count).toBe(5);
  });

  it('exclui sábados e domingos quando diasSemana=[1..5]', () => {
    // 06/01 (seg) a 12/01 (dom) = 5 dias úteis (exclui sáb e dom)
    const count = contarDiasUteis('2025-01-06', '2025-01-12', [1, 2, 3, 4, 5]);
    expect(count).toBe(5);
  });

  it('inclui sábados quando diasSemana inclui 6', () => {
    const count = contarDiasUteis('2025-01-06', '2025-01-11', [1, 2, 3, 4, 5, 6]);
    // Seg a Sáb = 6 dias
    expect(count).toBe(6);
  });

  it('exclui feriado nacional de 01/01', () => {
    // 01/01/2025 = Quarta-feira (feriado)
    // 02/01 (qui) a 03/01 (sex) = 2 dias úteis
    const count = contarDiasUteis('2025-01-01', '2025-01-03', [1, 2, 3, 4, 5]);
    expect(count).toBe(2); // 01/01 excluído como feriado
  });

  it('exclui feriados locais pontuais e recorrentes', () => {
    const locais = [
      { data: '2025-01-07', nome: 'Aniversário da cidade', recorrente: false },
      { data: '2020-01-08', nome: 'Feriado anual', recorrente: true },
    ];
    expect(contarDiasUteis('2025-01-07', '2025-01-08', [2, 3], locais)).toBe(0);
  });

  it('exclui feriados locais pontuais e recorrentes', () => {
    const locais = [
      { data: '2025-01-07', nome: 'Aniversário da cidade', recorrente: false },
      { data: '2020-01-08', nome: 'Feriado anual', recorrente: true },
    ];
    expect(contarDiasUteis('2025-01-07', '2025-01-08', [2, 3], locais)).toBe(0);
  });

  it('retorna 0 para período vazio (inicio = fim = domingo)', () => {
    const count = contarDiasUteis('2025-01-05', '2025-01-05', [1, 2, 3, 4, 5]);
    expect(count).toBe(0);
  });

  it('funciona para período de um mês completo', () => {
    // Janeiro 2025: 23 dias úteis (seg-sex, excluindo 01/01 feriado)
    const count = contarDiasUteis('2025-01-01', '2025-01-31', [1, 2, 3, 4, 5]);
    expect(count).toBe(22); // 23 dias seg-sex - 1 feriado (01/01)
  });
});

describe('gerarHistoricoMultiPeriodo retry safety', () => {
  it('lê feriados locais antes da limpeza e exclui o dia na geração', async () => {
    mocks.localSelect.mockReturnValue({
      eq: vi.fn(async () => ({
        data: [{ data: '2025-01-06', nome: 'Feriado da cidade', recorrente: false }],
        error: null,
      })),
    });
    const result = await gerarHistoricoMultiPeriodo('user-1', singleWorkdayPeriod, 0);
    expect(result).toEqual({ totalDias: 0, totalMarcacoes: 0 });
    expect(mocks.operations).toEqual(['cleanup']);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('não limpa registros se falhar a leitura de feriados locais', async () => {
    mocks.localSelect.mockReturnValue({
      eq: vi.fn(async () => ({ data: null, error: { message: 'permission denied' } })),
    });
    await expect(gerarHistoricoMultiPeriodo('user-1', singleWorkdayPeriod, 0))
      .rejects.toThrow('Erro ao carregar feriados locais: permission denied');
    expect(mocks.cleanupUpdate).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('lê feriados locais antes da limpeza e exclui o dia na geração', async () => {
    mocks.localSelect.mockReturnValue({
      eq: vi.fn(async () => ({
        data: [{ data: '2025-01-06', nome: 'Feriado da cidade', recorrente: false }],
        error: null,
      })),
    });
    const result = await gerarHistoricoMultiPeriodo('user-1', singleWorkdayPeriod, 0);
    expect(result).toEqual({ totalDias: 0, totalMarcacoes: 0 });
    expect(mocks.operations).toEqual(['cleanup']);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('não limpa registros se falhar a leitura de feriados locais', async () => {
    mocks.localSelect.mockReturnValue({
      eq: vi.fn(async () => ({ data: null, error: { message: 'permission denied' } })),
    });
    await expect(gerarHistoricoMultiPeriodo('user-1', singleWorkdayPeriod, 0))
      .rejects.toThrow('Erro ao carregar feriados locais: permission denied');
    expect(mocks.cleanupUpdate).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('soft-deletes only active auto-generated rows before retrying a partial import', async () => {
    mocks.insert
      .mockImplementationOnce(async () => {
        mocks.operations.push('insert');
        return { error: { message: 'temporary network failure' } };
      })
      .mockImplementationOnce(async () => {
        mocks.operations.push('insert');
        return { error: null };
      });

    await expect(gerarHistoricoMultiPeriodo('user-1', singleWorkdayPeriod, 0))
      .rejects.toThrow('Erro ao inserir lote: temporary network failure');

    const result = await gerarHistoricoMultiPeriodo('user-1', singleWorkdayPeriod, 0);

    expect(result).toEqual({ totalDias: 1, totalMarcacoes: 4 });
    expect(mocks.cleanupUpdate).toHaveBeenCalledTimes(2);
    expect(mocks.cleanupUpdate).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
    expect(mocks.operations).toEqual(['cleanup', 'insert', 'cleanup', 'insert']);
  });

  it('does not insert any marks if prior generated-row cleanup fails', async () => {
    let cleanupAttempt = 0;
    mocks.cleanupUpdate.mockImplementation(() => {
      const query: Record<string, ReturnType<typeof vi.fn>> = {};
      query.eq = vi.fn(() => query);
      query.gte = vi.fn(() => query);
      query.lte = vi.fn(() => query);
      query.is = vi.fn(async () => {
        cleanupAttempt += 1;
        return { error: { message: 'permission denied' } };
      });
      return query;
    });

    await expect(gerarHistoricoMultiPeriodo('user-1', singleWorkdayPeriod, 0))
      .rejects.toThrow('Erro ao preparar nova tentativa do histórico: permission denied');
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(cleanupAttempt).toBe(1);
  });
});
