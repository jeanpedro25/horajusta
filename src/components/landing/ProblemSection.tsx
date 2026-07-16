import React from 'react';
import { motion } from 'framer-motion';
import { BadgeDollarSign, CalendarCheck2, Fingerprint } from 'lucide-react';

const outcomes = [
  {
    icon: Fingerprint,
    number: '01',
    title: 'Um registro que é seu',
    text: 'Entrada, intervalo, retorno e saída ficam salvos em um histórico pessoal. Você pode corrigir marcações, incluir observações e registrar períodos anteriores.',
  },
  {
    icon: BadgeDollarSign,
    number: '02',
    title: 'Horas traduzidas em valores',
    text: 'Veja tempo trabalhado, horas extras e estimativas com salário, INSS, IRRF, benefícios e descontos configurados por você.',
  },
  {
    icon: CalendarCheck2,
    number: '03',
    title: 'O mês inteiro sob controle',
    text: 'Acompanhe banco de horas, férias, feriados, escalas e fechamento da folha sem depender de memória, conversa ou anotação solta.',
  },
];

const ProblemSection: React.FC = () => (
  <section id="problema" className="scroll-mt-24 border-y border-border bg-card py-20 sm:py-28">
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6 }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Mais que bater ponto</p>
          <h2 className="font-display mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">
            O app acompanha a jornada do primeiro registro ao fechamento do mês.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground sm:text-base">
            O Hora Justa reúne rotina, cálculos e documentos no mesmo lugar para você entender o que aconteceu em cada dia.
          </p>
        </motion.div>

        <div className="border-t border-border">
          {outcomes.map((item, index) => (
            <motion.article
              key={item.number}
              className="group grid gap-4 border-b border-border py-7 sm:grid-cols-[3rem_3rem_1fr] sm:items-start sm:gap-5"
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
            >
              <span className="font-mono text-xs font-bold text-primary">{item.number}</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8 transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-110"><item.icon className="h-5 w-5 text-primary" strokeWidth={1.8} /></span>
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">{item.title}</h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{item.text}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default ProblemSection;
