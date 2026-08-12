import { describe, expect, it } from 'vitest';
import { calcularJornada, validarProximaMarcacao, getEstadoJornada, type Marcacao } from '@/lib/jornada';

function m(data: string, tipo: Marcacao['tipo'], horarioIso: string): Marcacao {
  return {
    id: `${data}-${tipo}-${horarioIso}`,
    user_id: 'u',
    data,
    tipo,
    horario: horarioIso,
    origem: 'botao',
    deleted_at: null,
    created_at: horarioIso,
  };
}

describe('calcularJornada', () => {
  it('sem marcações deve retornar zeros', () => {
    const j = calcularJornada([], 8 * 60);
    expect(j.totalTrabalhado).toBe(0);
    expect(j.totalIntervalo).toBe(0);
    expect(j.horaExtraMin).toBe(0);
    expect(j.devendoMin).toBe(8 * 60);
  });

  it('entrada + saída final computa total trabalhado e hora extra vs carga', () => {
    const data = '2026-04-01';
    const marcacoes: Marcacao[] = [
      m(data, 'entrada', `${data}T08:00:00.000Z`),
      m(data, 'saida_final', `${data}T18:00:00.000Z`),
    ];
    const j = calcularJornada(marcacoes, 8 * 60);
    expect(j.totalTrabalhado).toBe(10 * 60);
    expect(j.horaExtraMin).toBe(2 * 60);
    expect(j.devendoMin).toBe(0);
  });

  it('intervalo é computado separadamente e não reduz totalTrabalhado (regra atual)', () => {
    const data = '2026-04-02';
    const marcacoes: Marcacao[] = [
      m(data, 'entrada', `${data}T08:00:00.000Z`),
      m(data, 'saida_intervalo', `${data}T12:00:00.000Z`),
      m(data, 'volta_intervalo', `${data}T13:00:00.000Z`),
      m(data, 'saida_final', `${data}T18:00:00.000Z`),
    ];
    const j = calcularJornada(marcacoes, 8 * 60);
    expect(j.totalIntervalo).toBe(60);
    expect(j.totalTrabalhado).toBe((4 + 5) * 60);
    expect(j.horaExtraMin).toBe(60);
  });

  it('turno noturno: entrada 22:00 e saída 06:00 no dia seguinte calcula corretamente', () => {
    const data = '2026-04-03';
    const marcacoes: Marcacao[] = [
      m(data, 'entrada', '2026-04-03T22:00:00.000Z'),
      m(data, 'saida_final', '2026-04-04T06:00:00.000Z'),
    ];
    const j = calcularJornada(marcacoes, 8 * 60);
    expect(j.totalTrabalhado).toBe(8 * 60);
    expect(j.horaExtraMin).toBe(0);
    expect(j.devendoMin).toBe(0);
    expect(j.primeiraEntrada).toBeTruthy();
    expect(j.ultimaSaida).toBeTruthy();
  });

  it('turno noturno com hora extra: 22:00 → 07:30 = 9.5h trabalhadas', () => {
    const data = '2026-04-04';
    const marcacoes: Marcacao[] = [
      m(data, 'entrada', '2026-04-04T22:00:00.000Z'),
      m(data, 'saida_final', '2026-04-05T07:30:00.000Z'),
    ];
    const j = calcularJornada(marcacoes, 8 * 60);
    expect(j.totalTrabalhado).toBe(570); // 9h30m
    expect(j.horaExtraMin).toBe(90);     // 1h30m extra
  });

  it('retorno após saída_final no mesmo dia marca retornouMesmoDia', () => {
    const data = '2026-04-05';
    const marcacoes: Marcacao[] = [
      m(data, 'entrada',    '2026-04-05T08:00:00.000Z'),
      m(data, 'saida_final','2026-04-05T12:00:00.000Z'),
      m(data, 'entrada',    '2026-04-05T13:00:00.000Z'),
      m(data, 'saida_final','2026-04-05T17:00:00.000Z'),
    ];
    const j = calcularJornada(marcacoes, 8 * 60);
    expect(j.retornouMesmoDia).toBe(true);
    expect(j.totalTrabalhado).toBe(8 * 60);
  });

  it('jornada histórica (data passada) não marca como emAndamento', () => {
    const data = '2024-01-15'; // past date
    const marcacoes: Marcacao[] = [
      m(data, 'entrada', `${data}T08:00:00.000Z`),
      // No saida_final — interrupted session in the past
    ];
    const j = calcularJornada(marcacoes, 8 * 60);
    // Should NOT add partial period for past days
    expect(j.emAndamento).toBe(false);
    expect(j.totalTrabalhado).toBe(0);
  });
});

describe('validarProximaMarcacao', () => {
  it('bloqueia dupla entrada', () => {
    const data = '2026-04-01';
    const marcacoes: Marcacao[] = [m(data, 'entrada', `${data}T08:00:00.000Z`)];
    const r = validarProximaMarcacao(marcacoes, 'entrada');
    expect(r.valido).toBe(false);
  });

  it('bloqueia saída sem entrada', () => {
    const r = validarProximaMarcacao([], 'saida_final');
    expect(r.valido).toBe(false);
  });

  it('bloqueia volta_intervalo sem saída de intervalo', () => {
    const data = '2026-04-01';
    const marcacoes: Marcacao[] = [m(data, 'entrada', `${data}T08:00:00.000Z`)];
    const r = validarProximaMarcacao(marcacoes, 'volta_intervalo');
    expect(r.valido).toBe(false);
  });

  it('permite entrada após saída_final (retorno no mesmo dia)', () => {
    const data = '2026-04-01';
    const marcacoes: Marcacao[] = [
      m(data, 'entrada', `${data}T08:00:00.000Z`),
      m(data, 'saida_final', `${data}T12:00:00.000Z`),
    ];
    const r = validarProximaMarcacao(marcacoes, 'entrada');
    expect(r.valido).toBe(true);
  });
});

describe('getEstadoJornada', () => {
  it('retorna nao_iniciada sem marcações', () => {
    expect(getEstadoJornada([])).toBe('nao_iniciada');
  });

  it('retorna trabalhando após entrada', () => {
    const data = '2026-04-01';
    const marcacoes: Marcacao[] = [m(data, 'entrada', `${data}T08:00:00.000Z`)];
    expect(getEstadoJornada(marcacoes)).toBe('trabalhando');
  });

  it('retorna em_intervalo após saida_intervalo', () => {
    const data = '2026-04-01';
    const marcacoes: Marcacao[] = [
      m(data, 'entrada', `${data}T08:00:00.000Z`),
      m(data, 'saida_intervalo', `${data}T12:00:00.000Z`),
    ];
    expect(getEstadoJornada(marcacoes)).toBe('em_intervalo');
  });

  it('retorna encerrada após saida_final', () => {
    const data = '2026-04-01';
    const marcacoes: Marcacao[] = [
      m(data, 'entrada', `${data}T08:00:00.000Z`),
      m(data, 'saida_final', `${data}T17:00:00.000Z`),
    ];
    expect(getEstadoJornada(marcacoes)).toBe('encerrada');
  });
});
