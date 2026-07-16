import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDownToLine, CalendarDays, Check, FileCheck2, ReceiptText } from 'lucide-react';

const reportItems = [
  'Tabela diária de marcações',
  'Total trabalhado e horas extras',
  'Estimativa bruta e líquida',
  'Banco de horas e compensações',
  'Férias, feriados e atestados',
  'Resumo do Radar Trabalhista',
];

const SocialProofSection: React.FC = () => (
  <section className="overflow-hidden bg-primary px-4 py-20 text-primary-foreground sm:px-6 sm:py-28">
    <div className="mx-auto max-w-6xl">
      <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.65 }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-on-primary">Seu histórico não precisa começar vazio</p>
          <h2 className="font-display mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">Já trabalha há meses? Reconstrua o caminho.</h2>
          <p className="mt-6 max-w-xl text-sm leading-7 text-white/70 sm:text-base">Informe a data de admissão e os horários habituais. O Hora Justa cria um histórico estimado, separado dos registros reais, para você revisar e corrigir.</p>

          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-5">
              <CalendarDays className="h-5 w-5 text-accent-on-primary" />
              <h3 className="mt-5 text-sm font-bold">Mudou de horário?</h3>
              <p className="mt-2 text-xs leading-5 text-white/55">Cadastre períodos diferentes para representar mudanças de escala ou turno.</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-5">
              <FileCheck2 className="h-5 w-5 text-accent-on-primary" />
              <h3 className="mt-5 text-sm font-bold">Origem identificada</h3>
              <p className="mt-2 text-xs leading-5 text-white/55">O relatório distingue registros reais, manuais e reconstituídos.</p>
            </div>
          </div>
        </motion.div>

        <motion.div className="relative" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1 }}>
          <div className="absolute -inset-8 rounded-full bg-accent/10 blur-3xl" />
          <motion.div className="relative overflow-hidden rounded-3xl bg-[#f7faf9] text-foreground shadow-[0_35px_80px_-30px_rgba(0,0,0,.55)]" whileHover={{ rotate: -0.5, scale: 1.01 }} transition={{ type: 'spring', stiffness: 180, damping: 18 }}>
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white"><ReceiptText className="h-5 w-5" /></span><div><p className="text-sm font-bold">Extrato de Jornada</p><p className="text-[9px] uppercase tracking-wider text-muted-foreground">01 a 31 de julho</p></div></div>
              <span className="rounded-full bg-primary/8 px-3 py-1 text-[9px] font-bold text-primary">PDF COMPLETO</span>
            </div>
            <div className="grid grid-cols-3 gap-px bg-border">
              <div className="bg-card p-4"><p className="text-[8px] uppercase tracking-wider text-muted-foreground">Trabalhado</p><strong className="mt-1 block font-mono text-base">176h 32m</strong></div>
              <div className="bg-card p-4"><p className="text-[8px] uppercase tracking-wider text-muted-foreground">Horas extras</p><strong className="mt-1 block font-mono text-base text-primary">12h 42m</strong></div>
              <div className="bg-card p-4"><p className="text-[8px] uppercase tracking-wider text-muted-foreground">Dias</p><strong className="mt-1 block font-mono text-base">22</strong></div>
            </div>
            <div className="p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">O relatório pode incluir</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {reportItems.map((item, index) => (
                  <motion.div key={item} className="flex items-start gap-2.5 text-xs" initial={{ opacity: 0, x: 10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.25 + index * 0.06 }}><span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success/10 text-success"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>{item}</motion.div>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-xs font-bold text-white"><ArrowDownToLine className="h-4 w-4" /> Gerar relatório PDF</div>
              <p className="mt-3 text-center text-[8px] text-muted-foreground">Documento pessoal e estimativo, sem valor oficial.</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  </section>
);

export default SocialProofSection;
