import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const records = [
  { time: '08:03', label: 'Entrada', active: true },
  { time: '12:14', label: 'Saída para intervalo' },
  { time: '13:08', label: 'Retorno' },
  { time: '17:42', label: 'Saída', pending: true },
];

const HeroSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="landing-grid relative overflow-hidden px-4 pb-20 pt-32 sm:px-6 sm:pb-28 sm:pt-36">
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
        <div>
          <motion.div
            className="mb-6 flex items-center justify-center gap-3 lg:justify-start"
            variants={reveal}
            initial="hidden"
            animate="visible"
            custom={0}
          >
            <span className="h-px w-8 bg-primary" />
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Seu trabalho merece um registro justo</span>
          </motion.div>

          <motion.h1
            className="font-display text-center text-[2.8rem] font-semibold leading-[0.98] tracking-[-0.05em] text-foreground sm:text-6xl lg:text-left lg:text-[4.6rem]"
            variants={reveal}
            initial="hidden"
            animate="visible"
            custom={0.08}
          >
            Não deixe suas horas
            <span className="block text-primary">passarem sem registro.</span>
          </motion.h1>

          <motion.p
            className="mx-auto mt-7 max-w-xl text-center text-base leading-7 text-muted-foreground sm:text-lg lg:mx-0 lg:text-left"
            variants={reveal}
            initial="hidden"
            animate="visible"
            custom={0.16}
          >
            Tenha seu próprio histórico de entradas, intervalos e saídas para conferir o ponto da empresa, acompanhar horas extras e questionar diferenças com mais informação.
          </motion.p>

          <motion.div
            className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start"
            variants={reveal}
            initial="hidden"
            animate="visible"
            custom={0.24}
          >
            <Button
              size="lg"
              className="h-14 w-full rounded-xl bg-primary px-7 text-sm font-bold text-primary-foreground shadow-[0_12px_30px_-16px_hsl(var(--primary))] transition-transform hover:-translate-y-0.5 hover:bg-primary/90 sm:w-auto"
              onClick={() => navigate('/auth')}
            >
              Proteger minhas horas
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <button
              type="button"
              onClick={() => document.getElementById('simulador')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm font-semibold text-foreground underline decoration-border decoration-2 underline-offset-8 transition-colors hover:text-primary"
            >
              Simular minhas horas extras
            </button>
          </motion.div>

          <motion.div
            className="mt-10 grid grid-cols-3 border-y border-border/80 py-4 text-center lg:text-left"
            variants={reveal}
            initial="hidden"
            animate="visible"
            custom={0.32}
          >
            {['Ponto diário', 'Banco de horas', 'Relatórios'].map((item, index) => (
              <div key={item} className={index > 0 ? 'border-l border-border/80 px-3' : 'px-3'}>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{item}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          className="relative mx-auto w-full max-w-[500px]"
          variants={reveal}
          initial="hidden"
          animate="visible"
          custom={0.2}
        >
          <div className="absolute -left-3 top-14 hidden h-[74%] w-3 bg-accent sm:block" />
          <div className="overflow-hidden border border-primary/15 bg-card shadow-[0_28px_70px_-38px_rgba(7,61,68,0.45)]">
            <div className="flex items-center justify-between border-b border-border bg-primary px-5 py-4 text-primary-foreground sm:px-7">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-on-primary">Registro de hoje</p>
                <p className="mt-1 text-sm font-semibold">Quinta-feira, 16 de julho</p>
              </div>
              <div className="border border-white/20 px-3 py-2 text-center">
                <p className="font-mono text-xl font-bold leading-none">QUI</p>
                <p className="mt-1 text-[9px] uppercase tracking-widest text-white/60">16 JUL</p>
              </div>
            </div>

            <div className="px-5 py-6 sm:px-7 sm:py-7">
              <div className="mb-6 flex items-end justify-between border-b border-border pb-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Tempo registrado</p>
                  <p className="mt-2 font-mono text-4xl font-semibold tracking-[-0.06em] text-foreground sm:text-5xl">08:45</p>
                </div>
                <div className="flex items-center gap-2 pb-1 text-xs font-semibold text-success">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  Jornada ativa
                </div>
              </div>

              <div className="relative space-y-0">
                <div className="absolute bottom-5 left-[2.2rem] top-5 w-px bg-border" />
                {records.map((record, index) => (
                  <motion.div
                    key={record.time}
                    className="relative grid grid-cols-[4.4rem_1fr_auto] items-center gap-3 border-b border-dashed border-border/80 py-3.5 last:border-0"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
                  >
                    <span className="z-10 bg-card font-mono text-sm font-bold tabular-nums text-foreground">{record.time}</span>
                    <span className="text-sm text-muted-foreground">{record.label}</span>
                    {record.pending ? (
                      <Clock3 className="h-4 w-4 text-warning-text" />
                    ) : (
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full ${record.active ? 'bg-primary text-white' : 'bg-success/10 text-success'}`}>
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="border border-border bg-surface-low px-4 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Carga prevista</p>
                  <p className="mt-1 font-mono text-lg font-bold">08:00</p>
                </div>
                <div className="border border-primary/15 bg-primary/5 px-4 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-primary">Saldo do dia</p>
                  <p className="mt-1 font-mono text-lg font-bold text-primary">+00:45</p>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">Exemplo ilustrativo da organização de uma jornada.</p>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
