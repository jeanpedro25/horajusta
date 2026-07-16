import React from 'react';
import { motion } from 'framer-motion';
import { Database, Equal, ShieldCheck } from 'lucide-react';

const principles = [
  { icon: Database, title: 'Seus dados como ponto de partida', text: 'O aplicativo organiza os horários e valores que você informa.' },
  { icon: Equal, title: 'Estimativa, não promessa', text: 'Os cálculos ajudam na conferência pessoal e podem variar conforme regras específicas.' },
  { icon: ShieldCheck, title: 'Clareza sobre o papel do app', text: 'O Hora Justa não substitui o ponto oficial, holerite ou orientação profissional.' },
];

const SocialProofSection: React.FC = () => (
  <section className="bg-primary px-4 py-20 text-primary-foreground sm:px-6 sm:py-28">
    <div className="mx-auto max-w-6xl">
      <motion.div
        className="grid gap-8 border-b border-white/15 pb-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-on-primary">Transparência por princípio</p>
          <h2 className="font-display mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Informação útil começa com contexto.</h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-white/70 sm:text-base">Nada de números milagrosos ou promessas automáticas. Você mantém o histórico; o app ajuda a organizar e estimar.</p>
      </motion.div>

      <div className="grid md:grid-cols-3">
        {principles.map((principle, index) => (
          <motion.article
            key={principle.title}
            className="border-b border-white/15 py-8 last:border-0 md:border-b-0 md:border-r md:px-7 md:last:border-r-0 md:first:pl-0 md:last:pr-0"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
          >
            <principle.icon className="h-6 w-6 text-accent-on-primary" strokeWidth={1.7} />
            <h3 className="font-display mt-8 text-xl font-semibold leading-snug">{principle.title}</h3>
            <p className="mt-3 text-sm leading-6 text-white/65">{principle.text}</p>
          </motion.article>
        ))}
      </div>
    </div>
  </section>
);

export default SocialProofSection;
