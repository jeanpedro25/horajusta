import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Calculator, CalendarCheck, CalendarClock, CalendarRange, FileText, HeartPulse, History,
  Landmark, Palmtree, RotateCcw, Scale, ShieldAlert, WalletCards,
} from 'lucide-react';

const featureGroups = [
  {
    icon: CalendarClock,
    title: 'Ponto completo',
    text: 'Entrada, intervalo, retorno, saída e mais de um período no mesmo dia.',
  },
  {
    icon: History,
    title: 'Histórico editável',
    text: 'Inclua registros manuais, corrija horários, adicione notas e encontre pendências.',
  },
  {
    icon: Scale,
    title: 'Jornadas e escalas',
    text: 'Configure jornada fixa, 5×2, 6×1, 12×36, escala personalizada e turnos.',
  },
  {
    icon: WalletCards,
    title: 'Salário estimado',
    text: 'Acompanhe horas extras, INSS, IRRF, benefícios, descontos e valor líquido estimado.',
  },
  {
    icon: Landmark,
    title: 'Banco de horas',
    text: 'Registre saldo inicial, acompanhe créditos e débitos e use a regra da sua rotina.',
  },
  {
    icon: HeartPulse,
    title: 'Atestados e documentos',
    text: 'Fotografe ou envie PDF, defina o período coberto e mantenha tudo junto ao dia.',
  },
  {
    icon: Palmtree,
    title: 'Férias e feriados',
    text: 'Organize períodos de férias e considere feriados nacionais, estaduais e municipais.',
  },
  {
    icon: FileText,
    title: 'Relatório profissional',
    text: 'Gere PDF por período com marcações, totais, estimativas e origem dos registros.',
  },
];

const advancedTools = [
  { icon: CalendarCheck, eyebrow: 'Mês a mês', title: 'Fechamento de horas extras', text: 'Marque o mês como pago ou não pago, inclua observações e acompanhe o acumulado para sua conferência.' },
  { icon: Landmark, eyebrow: 'Patrimônio do trabalhador', title: 'Estimativa de FGTS', text: 'Visualize depósitos mensais estimados, tempo de serviço e referência da multa conforme os dados informados.' },
  { icon: Calculator, eyebrow: 'Planejamento', title: 'Simulador de rescisão', text: 'Simule cenários de desligamento com saldo de salário, 13º, férias, aviso, FGTS e descontos estimados.' },
];

const FeaturesSection: React.FC = () => (
  <section id="recursos" className="scroll-mt-24 overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
    <div className="mx-auto max-w-6xl">
      <motion.div className="grid gap-5 lg:grid-cols-[1fr_0.75fr] lg:items-end" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Tudo em um só aplicativo</p>
          <h2 className="font-display mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Não é só um relógio de ponto. É a visão completa da sua vida de trabalho.</h2>
        </div>
        <p className="max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">Da rotina de hoje aos meses que já passaram: configure, registre, revise, calcule e gere documentos sem montar uma planilha para cada necessidade.</p>
      </motion.div>

      <div className="mt-12 grid border-l border-t border-border sm:grid-cols-2 lg:grid-cols-4">
        {featureGroups.map((feature, index) => (
          <motion.article
            key={feature.title}
            className="group min-h-[220px] border-b border-r border-border bg-card p-6 transition-colors hover:bg-primary/[0.035] sm:p-7"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: (index % 4) * 0.06, duration: 0.45 }}
          >
            <div className="flex items-start justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/8 text-primary transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-2"><feature.icon className="h-5 w-5" strokeWidth={1.8} /></span>
              <span className="font-mono text-[10px] text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
            </div>
            <h3 className="font-display mt-7 text-lg font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.text}</p>
          </motion.article>
        ))}
      </div>

      <div className="mt-12">
        <div className="mb-6 flex items-end justify-between gap-5">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Ferramentas para além do ponto</p><h3 className="font-display mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Entenda o mês atual e simule os próximos passos.</h3></div>
          <span className="hidden font-mono text-[10px] text-muted-foreground sm:block">RECURSOS PRO</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {advancedTools.map((tool, index) => (
            <motion.article key={tool.title} className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-7" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }} whileHover={{ y: -4 }}>
              <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-primary/[0.045]" />
              <tool.icon className="relative h-6 w-6 text-primary" strokeWidth={1.7} />
              <p className="relative mt-7 text-[9px] font-bold uppercase tracking-[0.16em] text-primary">{tool.eyebrow}</p>
              <h4 className="font-display relative mt-2 text-xl font-semibold">{tool.title}</h4>
              <p className="relative mt-3 text-sm leading-6 text-muted-foreground">{tool.text}</p>
            </motion.article>
          ))}
        </div>
      </div>

      <div className="mt-16 grid overflow-hidden rounded-[2rem] bg-[#102f35] text-white lg:grid-cols-[0.86fr_1.14fr]">
        <motion.div className="relative p-7 sm:p-10 lg:p-12" initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:30px_30px]" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-orange-400/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-orange-200"><ShieldAlert className="h-3.5 w-3.5" /> Radar Trabalhista</span>
            <h3 className="font-display mt-7 text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">O app procura padrões que merecem sua atenção.</h3>
            <p className="mt-5 max-w-md text-sm leading-7 text-white/65">Com base nos seus registros, o Radar destaca jornadas longas, intervalos curtos, excesso semanal, trabalho em feriados e sequências extensas de dias trabalhados.</p>
            <div className="mt-8 flex flex-wrap gap-2">
              {['Jornada acima de 10h', 'Semana acima de 44h', 'Intervalo reduzido', 'Feriado trabalhado'].map(item => <span key={item} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] text-white/75">{item}</span>)}
            </div>
            <p className="mt-7 text-[10px] leading-5 text-white/40">Análise automatizada e informativa. Não constitui parecer jurídico.</p>
          </div>
        </motion.div>

        <motion.div className="relative flex items-center justify-center bg-white/[0.045] p-5 sm:p-10" initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.12 }}>
          <div className="w-full max-w-lg space-y-3">
            <motion.div className="rounded-2xl border border-red-300/20 bg-[#1a3940] p-5 shadow-2xl" whileHover={{ x: -5 }}>
              <div className="flex items-start gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-400/15 text-red-300"><AlertTriangle className="h-5 w-5" /></span><div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">Jornada acima de 10 horas</strong><span className="rounded-full bg-red-400/15 px-2 py-0.5 text-[8px] font-bold text-red-200">ATENÇÃO ALTA</span></div><p className="mt-2 text-xs leading-5 text-white/55">Foram encontrados 2 dias que merecem revisão no período selecionado.</p></div></div>
            </motion.div>
            <motion.div className="ml-4 rounded-2xl border border-orange-300/20 bg-[#1a3940] p-5" whileHover={{ x: -5 }}>
              <div className="flex items-start gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-400/15 text-orange-200"><CalendarRange className="h-5 w-5" /></span><div><strong className="text-sm">7 dias consecutivos</strong><p className="mt-2 text-xs leading-5 text-white/55">Sequência identificada entre 08 e 14 de julho.</p></div></div>
            </motion.div>
            <motion.div className="mr-4 rounded-2xl border border-emerald-300/20 bg-[#1a3940] p-5" whileHover={{ x: -5 }}>
              <div className="flex items-start gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-200"><RotateCcw className="h-5 w-5" /></span><div><strong className="text-sm">Banco de horas atualizado</strong><p className="mt-2 text-xs leading-5 text-white/55">Saldo calculado a partir dos registros e configurações informadas.</p></div></div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

export default FeaturesSection;
