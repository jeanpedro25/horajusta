// Feriados nacionais civis/religiosos previstos em lei federal.
// Datas móveis, feriados estaduais/municipais e pontos facultativos não são presumidos.

export interface Feriado {
  data: string; // YYYY-MM-DD
  nome: string;
  tipo: 'nacional' | 'local';
}

function dateStr(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

export interface FeriadoLocalConfig {
  data: string;
  nome: string;
  recorrente: boolean;
}

function getFeriadosNacionais(ano: number): Feriado[] {
  return [
    { data: dateStr(ano, 1, 1), nome: 'Confraternização Universal', tipo: 'nacional' },
    { data: dateStr(ano, 4, 21), nome: 'Tiradentes', tipo: 'nacional' },
    { data: dateStr(ano, 5, 1), nome: 'Dia do Trabalho', tipo: 'nacional' },
    { data: dateStr(ano, 9, 7), nome: 'Independência do Brasil', tipo: 'nacional' },
    { data: dateStr(ano, 10, 12), nome: 'Nossa Senhora Aparecida', tipo: 'nacional' },
    { data: dateStr(ano, 11, 2), nome: 'Finados', tipo: 'nacional' },
    { data: dateStr(ano, 11, 15), nome: 'Proclamação da República', tipo: 'nacional' },
    { data: dateStr(ano, 11, 20), nome: 'Consciência Negra', tipo: 'nacional' },
    { data: dateStr(ano, 12, 25), nome: 'Natal', tipo: 'nacional' },
  ];
}

// Cache por ano
const cache = new Map<number, Feriado[]>();

export function getFeriadosDoAno(ano: number): Feriado[] {
  if (!cache.has(ano)) {
    cache.set(ano, getFeriadosNacionais(ano));
  }
  return cache.get(ano)!;
}

export function getFeriado(dataStr: string): Feriado | null {
  const ano = parseInt(dataStr.substring(0, 4), 10);
  if (isNaN(ano)) return null;
  return getFeriadosDoAno(ano).find(f => f.data === dataStr) || null;
}

export function isFeriado(dataStr: string): boolean {
  return getFeriado(dataStr) !== null;
}

// Para uso com feriados locais do banco de dados
export function getFeriadoComLocais(
  dataStr: string,
  feriadosLocais: FeriadoLocalConfig[]
): Feriado | null {
  // Primeiro verifica nacionais
  const nacional = getFeriado(dataStr);
  if (nacional) return nacional;

  // Depois verifica locais
  const local = feriadosLocais.find(f => {
    if (f.recorrente) {
      // Compara só mês e dia
      return f.data.substring(5) === dataStr.substring(5);
    }
    return f.data === dataStr;
  });

  if (local) {
    return { data: dataStr, nome: local.nome, tipo: 'local' };
  }

  return null;
}

export function getFeriadosNoPeriodo(
  dataInicio: string,
  dataFim: string,
  feriadosLocais: FeriadoLocalConfig[] = [],
): Map<string, string> {
  const result = new Map<string, string>();
  const current = new Date(`${dataInicio}T12:00:00`);
  const end = new Date(`${dataFim}T12:00:00`);
  if (Number.isNaN(current.getTime()) || Number.isNaN(end.getTime()) || current > end) return result;

  while (current <= end) {
    const data = dateStr(current.getFullYear(), current.getMonth() + 1, current.getDate());
    const feriado = getFeriadoComLocais(data, feriadosLocais);
    if (feriado) result.set(data, feriado.nome);
    current.setDate(current.getDate() + 1);
  }
  return result;
}
