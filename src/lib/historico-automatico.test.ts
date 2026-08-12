import { describe, expect, it } from 'vitest';
import { contarDiasUteis } from '@/lib/historico-automatico';

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
