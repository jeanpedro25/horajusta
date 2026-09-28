import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Lock, TrendingUp, FileText, Clock, Shield, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { iniciarCheckoutMercadoPago } from '@/lib/payments';
import { formatCurrency } from '@/lib/formatters';
import { ANNUAL_SAVINGS_CENTS, formatBRLCents, getPlanDurationLabel, PLAN_CATALOG } from '../../supabase/functions/_shared/plan-catalog';

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimatedValue?: number;
  trigger?: string;
}

const benefits = [
  { icon: TrendingUp, text: 'Estimativa completa de ganhos e descontos' },
  { icon: FileText, text: 'Extrato pessoal detalhado em PDF' },
  { icon: Clock, text: 'Histórico ilimitado' },
  { icon: Shield, text: 'Backup na nuvem' },
  { icon: Sparkles, text: 'Alertas inteligentes' },
  { icon: TrendingUp, text: 'Simulação de valor acumulado' },
];

const phrases = [
  'Organize sua jornada com mais clareza',
  'Tenha controle total das suas horas',
  'Sua jornada merece ser acompanhada de perto',
];

const PaywallModal: React.FC<PaywallModalProps> = ({ open, onOpenChange, estimatedValue, trigger }) => {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<'mensal' | 'anual'>('anual');
  const [processing, setProcessing] = useState(false);

  const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];

  const handleSubscribe = async () => {
    if (!user || processing) return;
    setProcessing(true);
    let redirectStarted = false;
    try {
      const plano = selectedPlan === 'mensal' ? 'pro' : 'anual';
      const res = await iniciarCheckoutMercadoPago(supabase, plano);
      if (res.error) throw new Error(res.error);
      const url = res.checkout_url;
      if (!url) throw new Error('URL de pagamento não retornada.');
      window.location.href = url;
      redirectStarted = true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro ao iniciar pagamento', description: msg, variant: 'destructive' });
    }
    if (!redirectStarted) setProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto p-0 overflow-hidden rounded-2xl border-0 bg-card">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-6 pb-8 text-center">
          <Lock size={28} className="mx-auto mb-3 opacity-80" />
          <DialogTitle className="text-xl font-bold mb-1">Visualize a estimativa completa da sua jornada</DialogTitle>
          <DialogDescription className="text-sm opacity-80 text-primary-foreground">
            Acesso PRO por {formatBRLCents(PLAN_CATALOG.pro.amountCents)} durante {getPlanDurationLabel('pro')} ou {formatBRLCents(PLAN_CATALOG.anual.amountCents)} durante {getPlanDurationLabel('anual')}. Pagamento único, sem renovação automática.
          </DialogDescription>
        </div>

        {/* Estimated value teaser */}
        {estimatedValue !== undefined && estimatedValue > 0 && (
          <div className="mx-6 -mt-4 bg-success/10 border border-success/30 rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Estimativa de horas extras (hoje)</p>
            <p className="text-2xl font-bold text-success">{formatCurrency(estimatedValue)}</p>
            <p className="text-xs text-muted-foreground mt-1">calculado com base nos seus dados</p>
            <p className="text-[10px] text-muted-foreground/70 mt-2 italic leading-relaxed">
              ⚠️ Valor estimado com base nos dados informados por você. O valor real depende da confirmação do empregador. O Hora Justa não garante recebimento.
            </p>
          </div>
        )}

        <div className="p-6 space-y-4">
          {/* Emotional phrase */}
          <p className="text-center text-sm font-medium text-warning">{randomPhrase}</p>

          {/* Plans */}
          <RadioGroup
            value={selectedPlan}
            onValueChange={(value) => {
              if (value === 'mensal' || value === 'anual') setSelectedPlan(value);
            }}
            aria-label="Escolha o período de acesso PRO"
            className="grid grid-cols-2 gap-3"
          >
            <div className={`relative rounded-xl border-2 text-center transition-all ${
              selectedPlan === 'mensal' ? 'border-accent bg-accent/10' : 'border-border bg-secondary'
            }`}>
              <RadioGroupItem
                id="paywall-plan-monthly"
                value="mensal"
                aria-label={`Mensal, ${formatBRLCents(PLAN_CATALOG.pro.amountCents)}, pagamento único por ${getPlanDurationLabel('pro')}`}
                disabled={processing}
                className="absolute left-3 top-3"
              />
              <label htmlFor="paywall-plan-monthly" className={`block p-4 pt-9 ${processing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                <span className="mb-1 block text-xs text-muted-foreground">Mensal</span>
                <span className="block text-xl font-bold">{formatBRLCents(PLAN_CATALOG.pro.amountCents)}</span>
                <span className="block text-[10px] text-muted-foreground">pagamento único · {getPlanDurationLabel('pro')}</span>
              </label>
            </div>

            <div className={`relative rounded-xl border-2 text-center transition-all ${
              selectedPlan === 'anual' ? 'border-accent bg-accent/10' : 'border-border bg-secondary'
            }`}>
              <span className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold text-accent-foreground">
                MELHOR VALOR
              </span>
              <RadioGroupItem
                id="paywall-plan-annual"
                value="anual"
                aria-label={`Anual, ${formatBRLCents(PLAN_CATALOG.anual.amountCents)}, pagamento único por ${getPlanDurationLabel('anual')}, economize ${formatBRLCents(ANNUAL_SAVINGS_CENTS)}`}
                disabled={processing}
                className="absolute left-3 top-3"
              />
              <label htmlFor="paywall-plan-annual" className={`block p-4 pt-9 ${processing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                <span className="mb-1 block text-xs text-muted-foreground">Anual</span>
                <span className="block text-xl font-bold">{formatBRLCents(PLAN_CATALOG.anual.amountCents)}</span>
                <span className="block text-[10px] text-muted-foreground">pagamento único · {getPlanDurationLabel('anual')}</span>
                <span className="mt-1 block text-[10px] font-semibold text-accent">Economize {formatBRLCents(ANNUAL_SAVINGS_CENTS)} comparado a 12 meses no mensal</span>
              </label>
            </div>
          </RadioGroup>

          {/* Benefits */}
          <div className="space-y-2">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <CheckCircle2 size={14} className="text-success shrink-0" />
                <span className="text-foreground">{b.text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Button
            onClick={handleSubscribe}
            disabled={processing}
            aria-busy={processing}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl h-12 font-semibold text-base"
          >
            {processing ? <span role="status" aria-live="polite">Abrindo checkout… aguarde</span> : 'Continuar para pagamento'}
          </Button>

          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            ⚠️ Os valores exibidos são <strong>estimativas</strong> calculadas com base nos dados informados por você (salário, percentual de hora extra, horários). O valor real pode variar. O Hora Justa é uma ferramenta de organização pessoal e <strong>não substitui</strong> holerites, registros oficiais ou orientação jurídica.
          </p>
          <p className="text-center text-xs text-muted-foreground">Você continuará no checkout do Mercado Pago. As opções de pagamento disponíveis serão exibidas lá.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaywallModal;
