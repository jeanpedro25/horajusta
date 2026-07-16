import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LEGAL_COPY } from '@/lib/legal-copy';

const monthlyFeatures = [
  'Estimativas financeiras do mês',
  'Relatório PDF profissional',
  'Radar Trabalhista completo',
  'Fechamento mensal de horas extras',
  'Simulações de FGTS e rescisão',
];

const annualFeatures = [
  'Todos os recursos do PRO',
  '12 meses de acesso',
  'Economia comparada ao mensal',
  'Uma única compra para o ano',
];

const PricingSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section id="precos" className="scroll-mt-24 bg-card px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <motion.div
          className="mx-auto mb-12 max-w-2xl text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Planos PRO</p>
          <h2 className="font-display mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">Comece registrando. Ative o PRO para enxergar o quadro completo.</h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">Ao criar sua conta, você testa os recursos PRO por 7 dias. Depois, escolha o período que fizer sentido para sua rotina.</p>
        </motion.div>

        <motion.div className="mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-primary/15 bg-primary/[0.045] p-5 sm:flex-row sm:items-center" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div><p className="text-sm font-bold text-primary">Você não precisa pagar para começar</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Crie a conta, configure sua jornada e experimente o fluxo real do aplicativo.</p></div>
          <span className="shrink-0 rounded-full bg-primary px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white">7 dias PRO incluídos</span>
        </motion.div>

        <div className="grid border border-border md:grid-cols-2">
          <motion.article
            className="flex flex-col border-b border-border p-7 md:border-b-0 md:border-r sm:p-10"
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">PRO Mensal</p>
              <span className="font-mono text-xs text-muted-foreground">30 DIAS</span>
            </div>
            <div className="mt-7 flex items-end gap-2">
              <span className="font-mono text-4xl font-semibold tracking-[-0.06em] text-foreground">R$ 9,90</span>
              <span className="pb-1 text-sm text-muted-foreground">/ mês</span>
            </div>
            <ul className="my-9 flex-1 space-y-3">
              {monthlyFeatures.map(feature => <li key={feature} className="flex items-start gap-3 text-sm text-foreground"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{feature}</li>)}
            </ul>
            <Button variant="outline" className="h-12 rounded-xl border-primary/30 font-bold text-primary hover:bg-primary/5" onClick={() => navigate('/auth')}>Testar e escolher mensal</Button>
          </motion.article>

          <motion.article
            className="relative flex flex-col bg-primary p-7 text-primary-foreground sm:p-10"
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-on-primary">PRO Anual</p>
              <span className="border border-accent-on-primary/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-on-primary">Economia de R$ 28,90</span>
            </div>
            <div className="mt-7 flex items-end gap-2">
              <span className="font-mono text-4xl font-semibold tracking-[-0.06em]">R$ 89,90</span>
              <span className="pb-1 text-sm text-white/60">/ ano</span>
            </div>
            <ul className="my-9 flex-1 space-y-3">
              {annualFeatures.map(feature => <li key={feature} className="flex items-start gap-3 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-on-primary" />{feature}</li>)}
            </ul>
            <Button className="h-12 rounded-xl bg-accent font-bold text-accent-foreground hover:bg-accent/90" onClick={() => navigate('/auth')}>
              Testar e escolher anual
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.article>
        </div>
        <p className="mx-auto mt-7 max-w-2xl text-center text-xs leading-5 text-muted-foreground">{LEGAL_COPY.subscription}</p>
      </div>
    </section>
  );
};

export default PricingSection;
