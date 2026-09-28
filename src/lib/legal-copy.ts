/**
 * Centralized legal copy constants for Hora Justa.
 * All disclaimers, terms, and legally-safe language in one place.
 */

export const LEGAL_COPY = {
  simulatorDisclaimer:
    'Os valores apresentados são estimativas baseadas em regras gerais da legislação trabalhista (CLT). Convenções coletivas e regras específicas da empresa podem alterar os resultados.',

  subscription:
    'Os planos mensal e anual são pagos uma única vez, sem renovação automática. O acesso dura o período contratado; para continuar após o vencimento, será necessária uma nova compra.',

  liability:
    'O serviço é fornecido no estado em que se encontra. O Hora Justa não garante resultados jurídicos ou validação em processos. Em caso de falha comprovada do sistema, a responsabilidade será limitada ao valor pago pelo usuário nos últimos 12 meses.',

  privacy:
    'Os períodos de retenção variam conforme a finalidade, a operação do serviço e eventuais obrigações legais; os prazos precisam ser definidos na versão final desta política. No código atual, ao excluir uma conta o campo user_id dos eventos de pagamento é desvinculado, mas a referência externa e o payload bruto recebido do Mercado Pago não são apagados automaticamente e podem conter identificadores relacionados à compra. A implementação ainda não define prazo automático de expurgo do ledger. Dados mantidos por prestadores podem seguir prazos próprios. As regras de retenção e resposta a pedidos de exclusão precisam ser validadas antes da publicação final.',

  sensitiveData:
    'Atestados e outros anexos podem conter dados pessoais sensíveis, como informações de saúde. Os arquivos são enviados pelo usuário e associados aos registros da jornada. O fluxo atual não registra um consentimento específico e destacado para esses arquivos; a base legal aplicável, a finalidade, os controles de acesso e o prazo de retenção precisam ser definidos e validados antes da publicação final.',

  pdf: 'Este documento é um extrato matemático privado para organização pessoal. Não possui valor de laudo pericial, não substitui cartões de ponto oficiais e não constitui prova legal absoluta. Os valores são baseados em dados fornecidos pelo usuário e regras gerais da legislação.',

  pdfWatermark: 'EXTRATO PARA CONFERÊNCIA PESSOAL - SEM VALOR OFICIAL',

  pdfFooter:
    'Este documento é um extrato matemático privado para organização pessoal. ' +
    'Não possui valor de laudo pericial, não substitui cartões de ponto oficiais e não constitui prova legal absoluta. ' +
    'O desenvolvedor isenta-se de responsabilidade por decisões judiciais ou administrativas tomadas com base nestas estimativas.',

  excelDisclaimer:
    '⚠ AVISO LEGAL: Este documento é um extrato matemático privado para organização pessoal. ' +
    'Não possui valor de laudo pericial, não substitui cartões de ponto oficiais e não constitui prova legal absoluta. ' +
    'O nome da empresa e demais dados são informados pelo próprio usuário. ' +
    'O desenvolvedor isenta-se de responsabilidade por decisões judiciais ou administrativas tomadas com base nestas estimativas.',

  general:
    'Os registros e cálculos apresentados são baseados exclusivamente nas informações fornecidas pelo usuário e possuem caráter estimativo. Não substituem documentos oficiais. Para validação jurídica, consulte um profissional qualificado.',

  bancoHoras:
    'Os cálculos são estimativas baseadas nas configurações definidas pelo usuário. Consulte um profissional qualificado para análise detalhada.',

  about:
    'O Hora Justa é uma ferramenta de tecnologia para transparência e organização pessoal do trabalhador. ' +
    'NÃO PRESTAMOS CONSULTORIA JURÍDICA OU CONTÁBIL. ' +
    'Para questões legais ou trabalhistas, consulte um advogado ou contador qualificado.',
} as const;
