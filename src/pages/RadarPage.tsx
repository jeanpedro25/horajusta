import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import {
  ShieldAlert, AlertTriangle, ChevronDown, ChevronUp,
  ArrowLeft, BookOpen, Zap, Clock, CheckCircle2, TrendingUp, Calendar,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import {
  fetchBancoHorasEntries, summarizeBancoHoras,
  type BancoHorasEntry,
} from '@/lib/banco-horas';
import { calcularJornada, getCargaDiaria, type Marcacao, type TipoJornada, type TipoMarcacao } from '@/lib/jornada';
import { getCicloQuery } from '@/lib/ciclo-folha';
import { usePlano } from '@/hooks/usePlano';
import { useEffect } from 'react';
import { analisarRadarTrabalhista, calcularAjusteSaldoJornada, RADAR_ISENCAO_RODAPE, type AlertaRadar, type NivelAlerta, type RadarDay } from '@/lib/radar-trabalhista';

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface RadarDaySummary extends RadarDay {
  marcacoes: Marcacao[];
}

function isTipoMarcacao(value: string): value is TipoMarcacao {
  return value === 'entrada' || value === 'saida_intervalo' || value === 'volta_intervalo' || value === 'saida_final';
}

function toMarcacao(row: Tables<'marcacoes_ponto'>): Marcacao {
  const tipo = row.tipo;
  if (!isTipoMarcacao(tipo)) {
    throw new Error(`Tipo de marcação desconhecido: ${tipo}`);
  }
  return {
    ...row,
    tipo,
    origem: row.origem ?? 'manual',
    created_at: row.created_at ?? '',
  };
}

function classifyOrigin(marks: Marcacao[]): 'real' | 'reconstituido' | 'manual' {
  if (!marks.length) return 'manual';
  const origens = marks.map(m => m.origem || 'manual');
  if (origens.every((o) => o === 'importacao_automatica')) return 'reconstituido';
  if (origens.some((o: string) => o === 'botao')) return 'real';
  return 'manual';
}

function fmtData(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtHM(min: number) {
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.round(Math.abs(min) % 60);
  return `${h}h${m > 0 ? ` ${m}min` : ''}`;
}
function diffMeses(d1: Date, d2: Date) {
  return Math.max(0, (d2.getFullYear() - d1.getFullYear()) * 12 + d2.getMonth() - d1.getMonth());
}

const nivelCfg: Record<NivelAlerta, { bg: string; border: string; textTitle: string; badge: string; badgeText: string; dot: string }> = {
  alto:  { bg: 'bg-red-50 dark:bg-red-950/30',    border: 'border-red-200 dark:border-red-800',     textTitle: 'text-red-700 dark:text-red-300',      badge: 'bg-red-500',    badgeText: 'ATENÇÃO PRIORITÁRIA', dot: 'bg-red-500' },
  medio: { bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800', textTitle: 'text-orange-700 dark:text-orange-300', badge: 'bg-orange-400', badgeText: 'VERIFICAR', dot: 'bg-orange-400' },
  baixo: { bg: 'bg-blue-50 dark:bg-blue-950/30',   border: 'border-blue-200 dark:border-blue-800',   textTitle: 'text-blue-700 dark:text-blue-300',     badge: 'bg-blue-400',   badgeText: 'INFORMATIVO', dot: 'bg-blue-400' },
};

// Motor importado via lib

// ─── Card de Alerta ───────────────────────────────────────────────────────────

const AlertaCard: React.FC<{ alerta: AlertaRadar; isPro: boolean; idx: number }> = ({ alerta, isPro, idx }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const cfg = nivelCfg[alerta.nivel];
  const bloqueado = !isPro && idx >= 2;

  if (bloqueado) {
    return (
      <div className="relative rounded-2xl border border-border overflow-hidden">
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[3px] z-10 flex flex-col items-center justify-center gap-2">
          <Zap size={20} className="text-accent" />
          <p className="text-xs font-bold text-accent">PRO — Desbloquear alerta</p>
          <button onClick={() => navigate('/planos')}
            className="text-[11px] bg-accent text-accent-foreground px-4 py-1.5 rounded-full font-bold">
            Ver planos →
          </button>
        </div>
        <div className="opacity-20 pointer-events-none p-4">
          <div className="flex gap-2 items-start">
            <span className="text-xl">{alerta.emoji}</span>
            <div>
              <p className="font-bold text-sm">{alerta.titulo}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">{alerta.narrativa}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border ${cfg.bg} ${cfg.border} overflow-hidden`}>
      <button onClick={() => setOpen(!open)} className="w-full p-4 text-left">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">{alerta.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={`text-sm font-bold leading-tight ${cfg.textTitle}`}>{alerta.titulo}</p>
              <span className={`text-[9px] font-black text-white px-2 py-0.5 rounded-full shrink-0 ${cfg.badge}`}>
                {cfg.badgeText}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{alerta.periodo}</p>
          </div>
          <div className="shrink-0 mt-0.5">
            {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
          </div>
        </div>
      </button>

      {open && (
        <div className={`px-4 pb-5 border-t ${cfg.border} space-y-4`}>
          {/* Narrativa */}
          <div className="pt-4">
            <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wide mb-1.5">📋 O que foi identificado</p>
            <p className="text-sm text-foreground/85 leading-relaxed">{alerta.narrativa}</p>
          </div>

          {/* Ocorrências */}
          {alerta.ocorrencias && alerta.ocorrencias.length > 0 && (
            <div className={`rounded-xl p-3 ${cfg.bg} border ${cfg.border}`}>
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-2">📆 Registros identificados</p>
              <div className="space-y-1">
                {alerta.ocorrencias.map((oc, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} mt-1.5 shrink-0`} />
                    <p className="text-xs text-foreground/80">{oc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recomendação */}
          <div className="bg-white/50 dark:bg-white/5 rounded-xl p-3 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1.5">✅ Recomendação</p>
            <p className="text-xs text-foreground/80 leading-relaxed">{alerta.recomendacao}</p>
          </div>

          {/* Rodapé */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] text-muted-foreground/60 italic flex-1">{alerta.clt}</p>
            {alerta.valorEstimado && alerta.valorEstimado > 0 && (
              <div className="bg-accent/10 border border-accent/20 rounded-lg px-3 py-1.5 shrink-0">
                <p className="text-[9px] text-muted-foreground">Estimativa</p>
                <p className="text-sm font-black text-accent">
                  ~R$ {alerta.valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────

const RadarPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const plano = usePlano();
  const p = profile;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [days, setDays] = useState<RadarDaySummary[]>([]);
  const [bancoEntries, setBancoEntries] = useState<BancoHorasEntry[]>([]);
  const [saldoFinal, setSaldoFinal] = useState(0);

  const salario = profile?.salario_base ?? 0;
  const percentual = profile?.hora_extra_percentual ?? 50;
  const tipoJornada: TipoJornada = p?.tipo_jornada === 'escala' || p?.tipo_jornada === 'turno'
    ? p.tipo_jornada
    : 'jornada_fixa';
  const carga = getCargaDiaria(tipoJornada, p?.escala_tipo || null, p?.carga_horaria_diaria ?? 8);

  useEffect(() => {
    if (!user) return;
    const carregar = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const diaFechamento = p?.dia_fechamento_folha ?? 0;
        const { start, end } = getCicloQuery(diaFechamento);

        // Marcações
        const { data: marcData, error: marcError } = await supabase
          .from('marcacoes_ponto').select('*').eq('user_id', user.id)
          .is('deleted_at', null).gte('data', start).lte('data', end)
          .order('horario', { ascending: true });
        if (marcError) throw marcError;

        // Banco de horas
        const bh = await fetchBancoHorasEntries(user.id);
        setBancoEntries(bh);

        // Compensações
        const { data: compData, error: compError } = await supabase.from('compensacoes_banco_horas')
          .select('minutos').eq('user_id', user.id);
        if (compError) throw compError;
        const totalComp = (compData || []).reduce((sum, compensation) => sum + compensation.minutos, 0);

        // Férias
        const { data: ferData, error: feriasError } = await supabase.from('ferias').select('*')
          .eq('user_id', user.id).in('status', ['ativa', 'agendada', 'concluida']);
        if (feriasError) throw feriasError;

        // Build simple day summaries from marcacoes for radar
        const dayMap = new Map<string, Marcacao[]>();
        (marcData || []).map(toMarcacao).forEach((m) => {
          if (!dayMap.has(m.data)) dayMap.set(m.data, []);
          dayMap.get(m.data)!.push(m);
        });

        const cargaMin = carga * 60;

        // Feriados
        const { data: feriadosLocais, error: feriadosLocaisError } = await supabase
          .from('feriados_locais').select('data, nome, recorrente').eq('user_id', user.id);
        if (feriadosLocaisError) throw feriadosLocaisError;
        const { getFeriadosNoPeriodo } = await import('@/lib/feriados');
        const feriadoMap = getFeriadosNoPeriodo(start, end, feriadosLocais ?? []);

        // Férias set
        const feriasSet = new Set<string>();
        (ferData || []).forEach((ferias) => {
          const d = new Date(ferias.data_inicio + 'T12:00:00');
          const ef = new Date(ferias.data_fim + 'T12:00:00');
          while (d <= ef) { feriasSet.add(d.toISOString().split('T')[0]); d.setDate(d.getDate() + 1); }
        });

        const summaries: RadarDaySummary[] = [];
        const cur = new Date(start + 'T12:00:00');
        const endD = new Date(end + 'T12:00:00');
        const hj = new Date().toISOString().split('T')[0];
        while (cur <= endD && cur.toISOString().split('T')[0] <= hj) {
          const ds = cur.toISOString().split('T')[0];
          const marks = dayMap.get(ds) || [];
          const feriado = feriadoMap.get(ds);
          const eFerias = feriasSet.has(ds);
          const dow = cur.getDay();
          const ehDia = dow >= 1 && dow <= (p?.dias_trabalhados_semana ?? 5);

          if (feriado) {
            const j = marks.length > 0 ? calcularJornada(marks, cargaMin) : null;
            const ro = marks.length > 0 ? classifyOrigin(marks) : null;
            summaries.push({
              data: ds, totalMin: j?.totalTrabalhado || 0, extraMin: j?.totalTrabalhado || 0, intervaloMin: j?.totalIntervalo || 0,
              origem: 'feriado', feriadoNome: feriado, marcacoes: marks, ehDiaTrabalho: true, registroOrigem: ro, devendoMin: 0,
            });
          } else if (eFerias) {
            summaries.push({ data: ds, totalMin: 0, extraMin: 0, intervaloMin: 0, origem: 'ferias', feriadoNome: null, marcacoes: [], ehDiaTrabalho: false, registroOrigem: null, devendoMin: 0 });
          } else if (marks.length > 0) {
            const j = calcularJornada(marks, cargaMin);
            const ro = classifyOrigin(marks);
            summaries.push({
              data: ds, totalMin: j.totalTrabalhado, extraMin: ehDia ? j.horaExtraMin : j.totalTrabalhado, intervaloMin: j.totalIntervalo,
              origem: 'real', feriadoNome: null, marcacoes: marks, ehDiaTrabalho: ehDia, registroOrigem: ro, devendoMin: ehDia ? j.devendoMin : 0,
            });
          } else {
            summaries.push({ data: ds, totalMin: 0, extraMin: 0, intervaloMin: 0, origem: ehDia ? 'pendente' : 'fds', feriadoNome: null, marcacoes: [], ehDiaTrabalho: ehDia, registroOrigem: null, devendoMin: 0 });
          }
          cur.setDate(cur.getDate() + 1);
        }

        setDays(summaries);

        // Saldo banco horas
        const bhSum = summarizeBancoHoras(bh, salario, percentual);
        const ajusteJornada = calcularAjusteSaldoJornada(summaries);
        const saldo = (p?.banco_horas_saldo_inicial ?? 0) + bhSum.saldo - totalComp + ajusteJornada;
        setSaldoFinal(saldo);
      } catch (error) {
        console.error('Falha ao carregar dados do Radar Trabalhista', error);
        setLoadError(true);
      }
      setLoading(false);
    };
    carregar();
  }, [user, carga, salario, percentual, p?.banco_horas_saldo_inicial, p?.dia_fechamento_folha, p?.dias_trabalhados_semana, reloadNonce]);

  const alertas = useMemo(() => {
    if (loading || loadError || days.length === 0) return [];
    return analisarRadarTrabalhista({
      days,
      bancoSaldoMin: saldoFinal,
      bancoDataPrimeiro: bancoEntries.length > 0 ? bancoEntries.filter(e => e.tipo === 'acumulo').sort((a, b) => a.data.localeCompare(b.data))[0]?.data : null,
      created_at: p.created_at,
      data_admissao: p.data_admissao || p.historico_inicio,
      salario,
      percentualHE: percentual,
      cargaHoras: carga,
      excluirReconstituidos: true,
    });
  }, [days, saldoFinal, bancoEntries, salario, percentual, carga, p, loading, loadError]);

  const totalAlto = alertas.filter(a => a.nivel === 'alto').length;
  const totalMedio = alertas.filter(a => a.nivel === 'medio').length;
  const alertasBloqueados = !plano.podeUsarPro ? Math.max(0, alertas.length - 2) : 0;

  return (
    <div className="app-with-bottom-nav min-h-screen bg-background">
      {/* Header especial */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/app')} className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
          <ArrowLeft size={16} className="text-white" />
        </button>
        <div className="flex-1">
          <p className="text-white/60 text-[10px] uppercase font-semibold tracking-wider">Análise CLT</p>
          <p className="text-white font-black text-base leading-tight">Radar Trabalhista</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
          <ShieldAlert size={18} className="text-orange-400" />
        </div>
      </div>

      <div className="px-4 pt-4 pb-6 max-w-lg mx-auto space-y-4">

        {/* Hero card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-5 shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-500/5 rounded-full translate-y-8 -translate-x-8" />

          <p className="text-orange-400 text-[10px] font-black uppercase tracking-widest mb-1">🛡️ Proteção CLT</p>
          <p className="text-white text-xl font-black leading-tight mb-3">
            Identificamos padrões<br />que merecem sua atenção
          </p>
          <p className="text-slate-300 text-[11px] leading-relaxed italic mb-4">
            "Com base nos dados informados, foram identificados padrões que podem indicar necessidade de revisão da jornada, conforme diretrizes da CLT."
          </p>

          {loading ? (
            <div className="flex items-center gap-2 text-white/60">
              <div className="w-4 h-4 border-2 border-white/20 border-t-orange-400 rounded-full animate-spin" />
              <p className="text-xs">Analisando seus registros...</p>
            </div>
          ) : loadError ? (
            <div className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/30 rounded-xl px-3 py-1.5">
              <AlertTriangle size={12} className="text-amber-300" />
              <span className="text-[11px] text-amber-200 font-bold">Não foi possível analisar agora</span>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {totalAlto > 0 && (
                <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/30 rounded-xl px-3 py-1.5">
                  <ShieldAlert size={12} className="text-red-400" />
                  <span className="text-[11px] text-red-300 font-black">{totalAlto} ALTO</span>
                </div>
              )}
              {totalMedio > 0 && (
                <div className="flex items-center gap-1.5 bg-orange-500/20 border border-orange-500/30 rounded-xl px-3 py-1.5">
                  <AlertTriangle size={12} className="text-orange-400" />
                  <span className="text-[11px] text-orange-300 font-black">{totalMedio} MÉDIO</span>
                </div>
              )}
              {alertas.length === 0 && !loading && (
                <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl px-3 py-1.5">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  <span className="text-[11px] text-emerald-300 font-bold">Sem alertas</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Alertas */}
        {loading ? (
          <div className="rounded-2xl border border-border p-8 text-center">
            <div className="w-10 h-10 border-4 border-border border-t-accent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Analisando seus registros de trabalho...</p>
          </div>
        ) : loadError ? (
          <div role="alert" className="rounded-3xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-6 text-center space-y-3">
            <div className="text-3xl">⚠️</div>
            <p className="font-black text-amber-800 dark:text-amber-200">Não foi possível analisar seus registros</p>
            <p className="text-xs text-amber-700 dark:text-amber-300">Confira sua conexão e tente novamente. Não interpretamos uma falha de carregamento como ausência de alertas.</p>
            <button type="button" onClick={() => setReloadNonce((value) => value + 1)} className="rounded-lg bg-amber-700 px-4 py-2 text-xs font-bold text-white hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Tentar novamente</button>
          </div>
        ) : alertas.length === 0 ? (
          <div className="rounded-3xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-6 text-center space-y-2">
            <div className="text-4xl mx-auto">✅</div>
            <p className="font-black text-emerald-700 dark:text-emerald-300">Nenhum alerta identificado neste período</p>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
              A análise não encontrou alertas nos registros disponíveis. Isso não confirma conformidade da jornada nem substitui uma avaliação profissional.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alertas.map((a, i) => (
              <AlertaCard key={a.id} alerta={a} isPro={plano.podeUsarPro} idx={i} />
            ))}
            {alertasBloqueados > 0 && (
              <div className="flex items-center gap-2 p-4 rounded-2xl bg-muted/50 border border-dashed border-accent/30">
                <Zap size={16} className="text-accent shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-accent">{alertasBloqueados} alerta{alertasBloqueados > 1 ? 's' : ''} oculto{alertasBloqueados > 1 ? 's' : ''}</p>
                  <p className="text-xs text-muted-foreground">Assine o plano PRO para ver todos</p>
                </div>
                <button onClick={() => navigate('/planos')} className="text-xs bg-accent text-accent-foreground px-3 py-1.5 rounded-full font-bold">PRO</button>
              </div>
            )}
          </div>
        )}

        {/* Aviso legal */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4">
          <div className="flex items-start gap-2">
            <BookOpen size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">⚖️ Aviso Legal</p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 leading-relaxed">
                {RADAR_ISENCAO_RODAPE} A análise considera apenas registros reais ou manuais; pontos gerados por importação/reconstrução automática não entram no cálculo. Não há certificação de fatos nem conclusão sobre o empregador. Para validação oficial, consulte profissional habilitado.
              </p>
            </div>
          </div>
        </div>

      </div>
      <BottomNav />
    </div>
  );
};

export default RadarPage;
