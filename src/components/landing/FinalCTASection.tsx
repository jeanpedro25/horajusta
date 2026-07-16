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
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Comece pelo próximo horário</p>
        <h2 className="font-display mx-auto mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
          Sua rotina já acontece. Falta deixar o registro em ordem.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">Crie sua conta, configure sua jornada e registre seu próximo ponto no Hora Justa.</p>
        <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" className="h-14 w-full rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground hover:bg-primary/90 sm:w-auto" onClick={() => navigate('/auth')}>
            Começar meu registro
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <button type="button" className="text-sm font-semibold text-muted-foreground underline decoration-border decoration-2 underline-offset-8 hover:text-primary" onClick={() => navigate('/auth')}>Já tenho uma conta</button>
        </div>
      </motion.div>
    </section>
  );
};

export default FinalCTASection;
