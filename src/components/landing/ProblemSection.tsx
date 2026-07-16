import React from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Clock4, MoonStar } from 'lucide-react';

const items = [
  {
    icon: Clock4,
    number: '01',
    title: 'Intervalos e minutos',
    text: 'Pequenas diferenças entre entrada, pausa e saída ficam mais fáceis de conferir quando cada marcação está organizada.',
  },
  {
    icon: MoonStar,
    number: '02',
    title: 'Jornadas fora do padrão',
    text: 'Turnos, adicional noturno e retornos no mesmo dia exigem contexto. O histórico ajuda você a revisar cada período.',
  },
  {
    icon: CalendarDays,
    number: '03',
    title: 'Domingos e feriados',
    text: 'Datas especiais podem seguir regras diferentes. Registre primeiro e use suas configurações para gerar uma estimativa pessoal.',
  },
];

const ProblemSection: React.FC = () => (
  <section id="problema" className="scroll-mt-24 border-y border-border bg-card py-20 sm:py-28">
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Não dependa apenas da memória</p>
          <h2 className="font-display mt-4 text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
            Minutos esquecidos podem virar horas no fim do mês.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground sm:text-base">
            Quando você mantém um registro próprio, fica mais fácil comparar horários, identificar divergências e conversar com a empresa com dados organizados.
          </p>
        </motion.div>

        <div className="border-t border-border">
          {items.map((item, index) => (
            <motion.article
              key={item.number}
              className="grid gap-4 border-b border-border py-7 sm:grid-cols-[3rem_3rem_1fr] sm:items-start sm:gap-5"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
            >
              <span className="font-mono text-xs font-bold text-primary">{item.number}</span>
              <item.icon className="h-5 w-5 text-primary" strokeWidth={1.8} />
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
