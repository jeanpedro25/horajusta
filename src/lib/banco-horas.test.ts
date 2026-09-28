import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({ supabase: supabaseMock }));

import {
  calcularEntradaBancoHoras,
  fetchBancoHorasEntries,
  summarizeBancoHoras,
} from '@/lib/banco-horas';

describe('banco de horas', () => {
  beforeEach(() => vi.clearAllMocks());

  it('converte horas extras pela regra configurada e calcula a expiração', () => {
    const entry = calcularEntradaBancoHoras('user-1', '2026-09-24', 90, {
      modoTrabalho: 'banco_horas',
      prazoCompensacaoDias: 180,
      regraConversao: '1.5x',
      limiteBancoHoras: null,
    }, 'registro-1');

    expect(entry).toMatchObject({
      user_id: 'user-1',
      data: '2026-09-24',
      tipo: 'acumulo',
      minutos: 135,
      registro_id: 'registro-1',
    });
    expect(new Date(entry!.expira_em).toISOString()).toBe('2027-03-23T00:00:00.000Z');
  });

  it('não cria lançamento fora do modo banco de horas nem para diferença zero', () => {
    const config = {
      modoTrabalho: 'horas_extras' as const,
      prazoCompensacaoDias: 30,
      regraConversao: '1x' as const,
      limiteBancoHoras: null,
    };
    expect(calcularEntradaBancoHoras('user-1', '2026-09-24', 60, config)).toBeNull();
    expect(calcularEntradaBancoHoras('user-1', '2026-09-24', 0, { ...config, modoTrabalho: 'banco_horas' })).toBeNull();
  });

  it('separa saldo ativo, compensação, vencimento próximo e saldo expirado', () => {
    const now = new Date('2026-09-24T12:00:00.000Z');
    const summary = summarizeBancoHoras([
      { id: '1', user_id: 'u', data: '2026-09-24', tipo: 'acumulo', minutos: 120, expira_em: '2026-10-01T00:00:00.000Z', nota: null, registro_id: null, created_at: '2026-09-24T00:00:00.000Z' },
      { id: '2', user_id: 'u', data: '2026-09-24', tipo: 'acumulo', minutos: 60, expira_em: '2027-01-01T00:00:00.000Z', nota: null, registro_id: null, created_at: '2026-09-24T00:00:00.000Z' },
      { id: '3', user_id: 'u', data: '2026-09-24', tipo: 'compensacao', minutos: 30, expira_em: '2027-01-01T00:00:00.000Z', nota: null, registro_id: null, created_at: '2026-09-24T00:00:00.000Z' },
      { id: '4', user_id: 'u', data: '2026-09-24', tipo: 'acumulo', minutos: 45, expira_em: '2026-09-23T00:00:00.000Z', nota: null, registro_id: null, created_at: '2026-09-24T00:00:00.000Z' },
    ], 2200, 50, now);

    expect(summary).toEqual({
      saldo: 150,
      aCompensar: 30,
      expirandoEm10Dias: 120,
      expirado: 45,
      estimativaValor: (150 / 60) * 10 * 1.5,
    });
  });

  it('propaga falha ao consultar o saldo em vez de retornar lista vazia', async () => {
    const failure = new Error('falha temporária');
    const order = vi.fn().mockResolvedValue({ data: null, error: failure });
    const eq = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ eq }),
    });
    supabaseMock.from.mockImplementation(from);

    await expect(fetchBancoHorasEntries('user-1')).rejects.toBe(failure);
    expect(supabaseMock.from).toHaveBeenCalledWith('banco_horas');
  });
});
