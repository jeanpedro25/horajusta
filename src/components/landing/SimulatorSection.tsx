import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { LEGAL_COPY } from '@/lib/legal-copy';

const SimulatorSection: React.FC = () => {
  const navigate = useNavigate();
  const [salario, setSalario] = useState(3500);
  const [horasExtras, setHorasExtras] = useState(20);

  const resultado = useMemo(() => {
    const valorHora = salario / 220;
    return {
      total: valorHora * 1.5 * horasExtras,
      adicional: valorHora * 0.5 * horasExtras,
      valorHora,
    };
  }, [salario, horasExtras]);

  const currency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <section id="simulador" className="scroll-mt-24 border-y border-border bg-surface-low px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="grid overflow-hidden border border-primary/15 bg-card shadow-[0_30px_80px_-55px_rgba(7,61,68,0.55)] lg:grid-cols-[1.05fr_0.95fr]"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65 }}
        >
          <div className="p-6 sm:p-10 lg:p-12">
            <div className="mb-9 flex items-start justify-between gap-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Quanto valem suas horas extras?</p>
                <h2 className="font-display mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Faça uma estimativa antes de conferir o pagamento.</h2>
              </div>
              <Calculator className="hidden h-7 w-7 shrink-0 text-primary sm:block" strokeWidth={1.6} />
            </div>

            <div className="space-y-9">
              <div>
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                  <label className="text-sm font-semibold text-foreground">Salário base</label>
                  <span className="font-mono text-sm font-bold tabular-nums text-primary">{currency(salario)}</span>
                </div>
                <Slider value={[salario]} onValueChange={([value]) => setSalario(value)} min={1412} max={20000} step={100} />
                <div className="mt-3 flex justify-between font-mono text-[10px] text-muted-foreground"><span>R$ 1.412</span><span>R$ 20.000</span></div>
              </div>

              <div>
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                  <label className="text-sm font-semibold text-foreground">Horas extras no mês</label>
                  <span className="font-mono text-sm font-bold tabular-nums text-primary">{String(horasExtras).padStart(2, '0')} horas</span>
                </div>
                <Slider value={[horasExtras]} onValueChange={([value]) => setHorasExtras(value)} min={0} max={60} step={1} />
                <div className="mt-3 flex justify-between font-mono text-[10px] text-muted-foreground"><span>0h</span><span>60h</span></div>
              </div>
            </div>

            <p className="mt-9 border-l-2 border-primary/30 pl-4 text-xs leading-6 text-muted-foreground">{LEGAL_COPY.simulatorDisclaimer}</p>
          </div>

          <div className="relative flex flex-col bg-primary p-6 text-primary-foreground sm:p-10 lg:p-12">
            <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:32px_32px]" />
            <div className="relative">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-on-primary">Simulação a 50%</p>
              <p className="mt-2 text-sm text-white/65">Valor bruto das horas extras informadas</p>
              <p className="mt-6 break-words font-mono text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">{currency(resultado.total)}</p>
            </div>

            <div className="relative mt-9 divide-y divide-white/15 border-y border-white/15">
              <div className="flex items-center justify-between gap-4 py-4">
                <span className="text-xs text-white/60">Valor da hora-base</span>
                <span className="font-mono text-sm font-bold">{currency(resultado.valorHora)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <span className="text-xs text-white/60">Parcela adicional de 50%</span>
                <span className="font-mono text-sm font-bold text-accent-on-primary">{currency(resultado.adicional)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <span className="text-xs text-white/60">Divisor considerado</span>
                <span className="font-mono text-sm font-bold">220 horas</span>
              </div>
            </div>

            <div className="relative mt-auto pt-8">
              <Button className="h-12 w-full rounded-xl bg-accent text-sm font-bold text-accent-foreground hover:bg-accent/90" onClick={() => navigate('/auth')}>
                Conferir minha jornada completa
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="mt-4 text-center text-xs leading-5 text-white/55">Resultado estimativo. Não representa valor líquido ou direito reconhecido.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SimulatorSection;
