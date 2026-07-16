import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, FileDown, ScanLine, TimerReset } from 'lucide-react';

const steps = [
  { icon: TimerReset, label: 'Registre', text: 'Marque os horários conforme sua rotina acontece.' },
  { icon: ScanLine, label: 'Confira', text: 'Revise o dia, o mês e o saldo do banco de horas.' },
  { icon: FileDown, label: 'Exporte', text: 'Gere relatórios organizados para seu controle pessoal.' },
];

const FeaturesSection: React.FC = () => (
  <section className="px-4 py-20 sm:px-6 sm:py-28">
    <div className="mx-auto max-w-6xl">
      <div className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Do registro ao relatório</p>
          <h2 className="font-display mt-3 max-w-xl text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Um fluxo simples para uma rotina que já é corrida.</h2>
        </div>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">Sem planilhas improvisadas. Sem depender da memória no fim do mês.</p>
      </div>

      <div className="grid overflow-hidden border border-border bg-card md:grid-cols-3">
        {steps.map((step, index) => (
          <motion.article
            key={step.label}
            className="relative border-b border-border p-7 last:border-0 md:border-b-0 md:border-r md:last:border-r-0 sm:p-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
          >
            <div className="mb-10 flex items-center justify-between">
              <step.icon className="h-6 w-6 text-primary" strokeWidth={1.7} />
              <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
            </div>
            <h3 className="font-display text-2xl font-semibold tracking-tight">{step.label}</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.text}</p>
            {index < steps.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 rounded-full border border-border bg-background p-1 text-primary md:block" />}
          </motion.article>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
