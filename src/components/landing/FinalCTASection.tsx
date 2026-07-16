import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FinalCTASection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="landing-grid px-4 py-20 sm:px-6 sm:py-28">
      <motion.div
        className="mx-auto max-w-6xl border-y border-primary/20 py-12 text-center sm:py-16"
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.65 }}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Seu próximo registro pode começar aqui</p>
        <h2 className="font-display mx-auto mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
          Trabalhou, registrou, conferiu. Simples assim.
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">Tenha ponto pessoal, histórico, estimativas, Radar Trabalhista, fechamento mensal, férias, atestados, FGTS, rescisão e relatórios no mesmo aplicativo.</p>
        <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" className="h-14 w-full rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground hover:bg-primary/90 sm:w-auto" onClick={() => navigate('/auth')}>
            Criar minha conta grátis
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <button type="button" className="text-sm font-semibold text-muted-foreground underline decoration-border decoration-2 underline-offset-8 hover:text-primary" onClick={() => document.getElementById('recursos')?.scrollIntoView({ behavior: 'smooth' })}>Rever todos os recursos</button>
        </div>
      </motion.div>
    </section>
  );
};

export default FinalCTASection;
