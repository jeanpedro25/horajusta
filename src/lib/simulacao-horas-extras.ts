export const DIVISOR_SIMULACAO = 220;
export const ADICIONAL_SIMULACAO = 0.5;

export interface ResultadoSimulacaoHorasExtras {
  total: number;
  adicional: number;
  valorHora: number;
}

export function calcularSimulacaoHorasExtras(
  salario: number,
  horasExtras: number,
): ResultadoSimulacaoHorasExtras {
  const valorHora = salario / DIVISOR_SIMULACAO;
  const adicional = valorHora * ADICIONAL_SIMULACAO * horasExtras;

  return {
    total: valorHora * (1 + ADICIONAL_SIMULACAO) * horasExtras,
    adicional,
    valorHora,
  };
}
