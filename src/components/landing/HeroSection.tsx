import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Clock3, History, Pause, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const HeroSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="landing-grid relative overflow-hidden px-4 pb-20 pt-28 sm:px-6 sm:pb-28 sm:pt-36">
      <div className="pointer-events-none absolute left-[8%] top-36 h-48 w-48 rounded-full bg-accent/15 blur-3xl" />
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-8">
        <div className="relative z-10">
          <motion.div className="mb-6 flex items-center justify-center gap-3 lg:justify-start" variants={reveal} initial="hidden" animate="visible">
            <span className="h-px w-8 bg-primary" />
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Seu ponto pessoal, no seu celular</span>
          </motion.div>

          <motion.h1
            className="font-display text-center text-[2.75rem] font-semibold leading-[0.97] tracking-[-0.055em] text-foreground sm:text-6xl lg:text-left lg:text-[4.65rem]"
            variants={reveal}
            initial="hidden"
            animate="visible"
            custom={0.08}
          >
            Registre cada jornada.
            <span className="block text-primary">Confira cada hora.</span>
          </motion.h1>

          <motion.p
            className="mx-auto mt-7 max-w-xl text-center text-base leading-7 text-muted-foreground sm:text-lg lg:mx-0 lg:text-left"
            variants={reveal}
            initial="hidden"
            animate="visible"
            custom={0.16}
          >
            Marque entrada, intervalo e saída em segundos. Acompanhe horas extras, estimativas do salário, banco de horas e mantenha um histórico independente para comparar com o ponto da empresa.
          </motion.p>

          <motion.div className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start" variants={reveal} initial="hidden" animate="visible" custom={0.24}>
            <Button
              size="lg"
              className="h-14 w-full rounded-xl bg-primary px-7 text-sm font-bold text-primary-foreground shadow-[0_14px_32px_-16px_hsl(var(--primary))] transition-transform hover:-translate-y-0.5 hover:bg-primary/90 sm:w-auto"
              onClick={() => navigate('/auth')}
            >
              Começar grátis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <button type="button" onClick={() => document.getElementById('recursos')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-semibold text-foreground underline decoration-border decoration-2 underline-offset-8 transition-colors hover:text-primary">
              Ver tudo que o app faz
            </button>
          </motion.div>

          <motion.div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground lg:justify-start" variants={reveal} initial="hidden" animate="visible" custom={0.32}>
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-success" />7 dias de recursos PRO</span>
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-success" />Funciona no celular</span>
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-success" />Seus registros ficam salvos</span>
          </motion.div>
        </div>

        <div className="relative mx-auto min-h-[590px] w-full max-w-[660px] sm:min-h-[650px]">
          <motion.img
            src="/worker-hero.svg"
            alt="Trabalhador conferindo sua jornada no celular"
            className="absolute bottom-0 left-[-3.5rem] z-0 hidden w-[330px] lg:block xl:left-[-4.5rem] xl:w-[370px]"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0, y: [0, -7, 0] }}
            transition={{ opacity: { delay: 0.35, duration: 0.8 }, x: { delay: 0.35, duration: 0.8 }, y: { delay: 1.2, duration: 5, repeat: Infinity, ease: 'easeInOut' } }}
          />

          <motion.div
            className="absolute left-1/2 top-3 z-10 w-[min(100%,390px)] -translate-x-1/2 overflow-hidden rounded-[2rem] border-[7px] border-[#123c41] bg-background shadow-[0_38px_85px_-35px_rgba(7,61,68,0.65)] lg:left-auto lg:right-0 lg:translate-x-0"
            initial={{ opacity: 0, y: 30, rotate: 1.5 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ delay: 0.22, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between bg-primary px-5 pb-5 pt-4 text-white">
              <div>
                <p className="text-base font-bold">Boa tarde, Ana!</p>
                <p className="mt-1 text-[10px] text-white/65">Quinta-feira, 16 de julho</p>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-center">
                <p className="font-mono text-sm font-bold">14:37</p>
                <p className="text-[8px] uppercase tracking-widest text-white/60">QUI</p>
              </div>
            </div>

            <div className="space-y-3 p-3.5">
              <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm">
                <div className="flex items-center justify-center gap-2">
                  <motion.span className="h-2.5 w-2.5 rounded-full bg-success" animate={{ opacity: [1, 0.35, 1], scale: [1, 0.8, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
                  <span className="text-sm font-semibold">Trabalhando agora</span>
                </div>
                <p className="mt-2 font-mono text-[2.45rem] font-black leading-none tracking-[-0.06em] tabular-nums">06:34:18</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div className="h-full rounded-full bg-primary" initial={{ width: '0%' }} animate={{ width: '82%' }} transition={{ delay: 0.8, duration: 1.4, ease: 'easeOut' }} />
                </div>
                <p className="mt-1.5 text-[9px] text-muted-foreground">82% da carga diária (8h)</p>
                <p className="mt-3 text-[10px] text-muted-foreground">Entrada: 08:03 · Carga: 8h</p>
                <motion.button whileTap={{ scale: 0.97 }} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-warning text-sm font-bold text-warning-foreground">
                  <Pause className="h-4 w-4" /> Sair para Intervalo
                </motion.button>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Registros de hoje</p>
                  <span className="rounded-full bg-success/10 px-2 py-1 text-[8px] font-bold text-success">SALVOS</span>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-success/10 text-success">▶</span><span className="flex-1 text-muted-foreground">Entrada</span><strong className="font-mono">08:03</strong></div>
                  <div className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-warning/10 text-warning-text">Ⅱ</span><span className="flex-1 text-muted-foreground">Saída intervalo</span><strong className="font-mono">12:11</strong></div>
                  <div className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/15 text-primary">↩</span><span className="flex-1 text-muted-foreground">Volta intervalo</span><strong className="font-mono">13:07</strong></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 border-t border-border bg-card px-2 py-2.5 text-center text-[8px] font-semibold text-muted-foreground">
              <span className="flex flex-col items-center gap-1 text-primary"><Clock3 className="h-4 w-4" />Ponto</span>
              <span className="flex flex-col items-center gap-1"><History className="h-4 w-4" />Histórico</span>
              <span className="flex flex-col items-center gap-1"><BarChart3 className="h-4 w-4" />Relatório</span>
              <span className="flex flex-col items-center gap-1"><Settings className="h-4 w-4" />Config.</span>
            </div>
          </motion.div>

          <motion.div className="absolute bottom-6 right-0 z-20 hidden rounded-2xl border border-primary/10 bg-card p-4 shadow-xl sm:block lg:right-[-1.25rem]" initial={{ opacity: 0, x: 25 }} animate={{ opacity: 1, x: 0, y: [0, -5, 0] }} transition={{ opacity: { delay: 1, duration: 0.5 }, x: { delay: 1, duration: 0.5 }, y: { delay: 1.5, duration: 4, repeat: Infinity } }}>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Hora extra no mês</p>
            <p className="mt-1 font-mono text-xl font-bold text-primary">+ 12h 42min</p>
            <p className="mt-1 text-[9px] text-success">Estimativa atualizada</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
