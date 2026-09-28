import { describe, expect, it } from 'vitest';
import { getFeriado, getFeriadoComLocais, getFeriadosDoAno, getFeriadosNoPeriodo } from './feriados';

describe('calendário de feriados brasileiros', () => {
  it('lista apenas os nove feriados nacionais legais conhecidos para 2026', () => {
    expect(getFeriadosDoAno(2026).map(({ data }) => data)).toEqual([
      '2026-01-01',
      '2026-04-21',
      '2026-05-01',
      '2026-09-07',
      '2026-10-12',
      '2026-11-02',
      '2026-11-15',
      '2026-11-20',
      '2026-12-25',
    ]);
  });

  it.each([
    ['Carnaval', '2026-02-16'],
    ['Sexta-feira da Paixão', '2026-04-03'],
    ['Páscoa', '2026-04-05'],
    ['Corpus Christi', '2026-06-04'],
  ])('não presume %s como feriado nacional', (_name, date) => {
    expect(getFeriado(date)).toBeNull();
  });

  it('reconhece datas como feriado local quando a pessoa as cadastra', () => {
    expect(getFeriadoComLocais('2026-06-04', [
      { data: '2026-06-04', nome: 'Corpus Christi', recorrente: false },
    ])).toEqual({ data: '2026-06-04', nome: 'Corpus Christi', tipo: 'local' });
  });

  it('combina feriados nacionais e feriados locais configurados no período', () => {
    const feriados = getFeriadosNoPeriodo('2026-06-01', '2026-06-07', [
      { data: '2026-06-04', nome: 'Corpus Christi', recorrente: false },
    ]);
    expect(feriados).toEqual(new Map([['2026-06-04', 'Corpus Christi']]));
  });
});
