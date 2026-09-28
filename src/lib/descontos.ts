/**
 * Cálculo de INSS e IRRF (tabelas vigentes) para estimativa de salário líquido.
 * ATENÇÃO: São estimativas. Valores reais dependem de regras do empregador, convenção coletiva e holerite oficial.
 */

// Tabela progressiva INSS 2026 (empregado/avulso/doméstico) — aplicada por faixas (progressiva)
const FAIXAS_INSS = [
  { teto: 1621.00, aliquota: 0.075 },
  { teto: 2902.84, aliquota: 0.09 },
  { teto: 4354.27, aliquota: 0.12 },
  { teto: 8475.55, aliquota: 0.14 },
];

export function calcularINSS(bruto: number): number {
  let desconto = 0;
  let anterior = 0;

  for (const faixa of FAIXAS_INSS) {
    if (bruto <= anterior) break;
    const base = Math.min(bruto, faixa.teto) - anterior;
    if (base > 0) {
      desconto += base * faixa.aliquota;
    }
    anterior = faixa.teto;
  }

  return Math.round(desconto * 100) / 100;
}

// Tabela IRRF mensal 2026 (base após INSS)
const FAIXAS_IRRF = [
  { teto: 2428.80, aliquota: 0, deduzir: 0 },
  { teto: 2826.65, aliquota: 0.075, deduzir: 182.16 },
  { teto: 3751.05, aliquota: 0.15, deduzir: 394.16 },
  { teto: 4664.68, aliquota: 0.225, deduzir: 675.49 },
  { teto: Infinity, aliquota: 0.275, deduzir: 908.73 },
];

const DEDUCAO_SIMPLIFICADA_MENSAL = 607.20;
const LIMITE_REDUCAO_IRRF_INTEGRAL = 5000;
const LIMITE_REDUCAO_IRRF_PARCIAL = 7350;

function calcularImpostoPelaTabela(base: number): number {
  if (base <= 0) return 0;

  for (const faixa of FAIXAS_IRRF) {
    if (base <= faixa.teto) {
      return Math.max(0, Math.round((base * faixa.aliquota - faixa.deduzir) * 100) / 100);
    }
  }
  return 0;
}

function aplicarReducaoMensalIRRF(imposto: number, rendimentosTributaveis: number): number {
  if (rendimentosTributaveis <= LIMITE_REDUCAO_IRRF_INTEGRAL) return 0;
  if (rendimentosTributaveis > LIMITE_REDUCAO_IRRF_PARCIAL) return imposto;

  const reducao = 978.62 - 0.133145 * rendimentosTributaveis;
  return Math.max(0, Math.round((imposto - reducao) * 100) / 100);
}

function calcularIRRFComDeducoesLegaisOuSimplificada(
  rendimentosTributaveis: number,
  inss: number,
  dependentes: number,
): number {
  if (!Number.isFinite(rendimentosTributaveis) || !Number.isFinite(inss)) return 0;
  const deducaoDependentes = Math.max(0, Math.min(Math.floor(dependentes), 99)) * DEDUCAO_DEPENDENTE_IRRF;
  const deducoesLegais = Math.max(0, inss) + deducaoDependentes;
  const deducoes = Math.max(deducoesLegais, DEDUCAO_SIMPLIFICADA_MENSAL);
  const base = Math.max(0, rendimentosTributaveis - deducoes);
  return aplicarReducaoMensalIRRF(calcularImpostoPelaTabela(base), rendimentosTributaveis);
}

export function calcularIRRF(bruto: number, inss: number): number {
  return calcularIRRFComDeducoesLegaisOuSimplificada(bruto, inss, 0);
}

/** Dedução mensal por dependente no IRRF (valor vigente em 2026). */
const DEDUCAO_DEPENDENTE_IRRF = 189.59;

/**
 * Estima o IRRF mensal usando a opção mais vantajosa entre deduções legais e desconto simplificado.
 * A redução gradual de 2026 considera os rendimentos tributáveis, não a base após deduções.
 */
export function calcularIRRFFixaComDependentes(
  rendimentosTributaveis: number,
  inss: number,
  dependentes: number,
): number {
  return calcularIRRFComDeducoesLegaisOuSimplificada(rendimentosTributaveis, inss, dependentes);
}

export interface DescontosDetalhados {
  planoSaude: number;
  adiantamentos: number;
  outrosDescontos: number;
}

export interface BeneficiosEntrada {
  valeAlimentacao: number;
  auxilioCombustivel: number;
  bonificacoes: number;
}

export interface ResumoLiquido {
  bruto: number;
  inss: number;
  irrf: number;
  descontosFixos: number;
  descontosDetalhados: DescontosDetalhados;
  beneficios: BeneficiosEntrada;
  totalBeneficios: number;
  totalDescontos: number;
  liquido: number;
}

export function calcularLiquido(
  bruto: number,
  descontosFixos = 0,
  beneficios: BeneficiosEntrada = { valeAlimentacao: 0, auxilioCombustivel: 0, bonificacoes: 0 },
  descontosDetalhados: DescontosDetalhados = { planoSaude: 0, adiantamentos: 0, outrosDescontos: 0 },
): ResumoLiquido {
  const inss = calcularINSS(bruto);
  const irrf = calcularIRRF(bruto, inss);
  const totalBeneficios = beneficios.valeAlimentacao + beneficios.auxilioCombustivel + beneficios.bonificacoes;
  const totalDescontosExtra = descontosDetalhados.planoSaude + descontosDetalhados.adiantamentos + descontosDetalhados.outrosDescontos;
  const totalDescontos = inss + irrf + descontosFixos + totalDescontosExtra;
  const liquido = Math.max(0, bruto + totalBeneficios - totalDescontos);
  return {
    bruto, inss, irrf, descontosFixos,
    descontosDetalhados, beneficios,
    totalBeneficios, totalDescontos, liquido,
  };
}
