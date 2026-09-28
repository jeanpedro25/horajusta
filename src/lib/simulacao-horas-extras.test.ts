import { describe, expect, it } from 'vitest';
import { calcularSimulacaoHorasExtras, DIVISOR_SIMULACAO } from './simulacao-horas-extras';

describe('calcularSimulacaoHorasExtras', () => {
  it('uses the illustrative 220-hour divisor and separates base from the 50% premium', () => {
    const resultado = calcularSimulacaoHorasExtras(3500, 20);

    expect(DIVISOR_SIMULACAO).toBe(220);
    expect(resultado.valorHora).toBeCloseTo(15.90909, 4);
    expect(resultado.adicional).toBeCloseTo(159.0909, 3);
    expect(resultado.total).toBeCloseTo(477.2727, 3);
  });

  it('returns zero overtime value when no extra hours were entered', () => {
    const resultado = calcularSimulacaoHorasExtras(3500, 0);

    expect(resultado.valorHora).toBeCloseTo(3500 / 220);
    expect(resultado.adicional).toBe(0);
    expect(resultado.total).toBe(0);
  });
});
