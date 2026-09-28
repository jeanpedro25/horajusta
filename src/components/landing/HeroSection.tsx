import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { scrollToLandingSection } from '@/lib/landing-scroll';

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
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-8">
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
            <button type="button" onClick={() => scrollToLandingSection('recursos')} className="text-sm font-semibold text-foreground underline decoration-border decoration-2 underline-offset-8 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              Ver tudo que o app faz
            </button>
          </motion.div>

          <motion.div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground lg:justify-start" variants={reveal} initial="hidden" animate="visible" custom={0.32}>
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-success" />7 dias grátis · sem cartão</span>
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-success" />Sem cobrança automática</span>
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-success" />Funciona no celular</span>
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-success" />Registros salvos na sua conta</span>
          </motion.div>
        </div>

        <div className="relative mx-auto flex min-h-[390px] w-full max-w-[600px] items-center justify-center sm:min-h-[540px]">
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[330px] w-[330px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.06] blur-2xl sm:h-[440px] sm:w-[440px]" />
          <p className="absolute right-2 top-3 z-20 rounded-full border border-border/70 bg-background/90 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground shadow-sm backdrop-blur sm:right-5 sm:top-5 sm:text-xs">
            Tela demonstrativa · dados fictícios
          </p>
          <motion.div
            className="relative z-10 h-[390px] w-full sm:h-[540px]"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <img
              src="/hora-justa-trabalhador-v4.webp"
              alt="Ilustração de um trabalhador usando o celular, com o símbolo Hora Justa bordado na camisa."
              className="h-full w-full object-contain drop-shadow-[0_24px_28px_rgba(17,57,61,0.12)]"
              // @ts-expect-error React 18 typings omit the lowercase HTML attribute used for this browser hint.
              fetchpriority="high"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
