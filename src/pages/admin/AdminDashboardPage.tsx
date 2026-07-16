import { useDeferredValue, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, CalendarClock, CheckCircle2, Search, ShieldCheck, Users, WalletCards } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAdminDashboard, getAdminUsers } from '@/lib/admin';

const PAGE_SIZE = 15;

const numberFormatter = new Intl.NumberFormat('pt-BR');
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const fullDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

function formatDate(value: string | null) {
  if (!value) return 'Sem registro';
  return fullDate.format(new Date(value));
}

function planLabel(plan: string | null) {
  if (plan === 'anual') return 'PRO Anual';
  if (plan === 'pro') return 'PRO Mensal';
  return 'Free';
}

export default function AdminDashboardPage() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [page, setPage] = useState(0);

  const dashboard = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getAdminDashboard,
    staleTime: 60_000,
  });
  const users = useQuery({
    queryKey: ['admin-users', deferredSearch, page],
    queryFn: () => getAdminUsers(deferredSearch, PAGE_SIZE, page * PAGE_SIZE),
    staleTime: 30_000,
  });

  const metrics = dashboard.data;
  const totalUsers = metrics?.totalUsers ?? 0;
  const totalPages = Math.max(1, Math.ceil(Number(users.data?.[0]?.total_count ?? 0) / PAGE_SIZE));
  const onboardingRate = totalUsers ? Math.round(((metrics?.completedOnboarding ?? 0) / totalUsers) * 100) : 0;
  const paidRate = totalUsers ? Math.round(((metrics?.paidUsers ?? 0) / totalUsers) * 100) : 0;

  return (
    <AdminLayout>
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <section id="visao-geral" className="scroll-mt-24">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                <ShieldCheck size={15} /> Operação Hora Justa
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Painel do Chefe</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Acompanhe crescimento, utilização e planos sem expor dados trabalhistas sensíveis.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-400">
              Atualização sob demanda · somente leitura
            </div>
          </div>

          {dashboard.isError ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
              Não foi possível carregar os indicadores. {dashboard.error.message}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Usuários cadastrados', value: metrics?.totalUsers, detail: `+${metrics?.newUsers30d ?? 0} nos últimos 30 dias`, icon: Users, color: 'text-cyan-300 bg-cyan-400/10' },
                { label: 'Ativos em 30 dias', value: metrics?.activeUsers30d, detail: `${metrics?.pointRecords30d ?? 0} marcações no período`, icon: Activity, color: 'text-emerald-300 bg-emerald-400/10' },
                { label: 'Planos ativos', value: metrics?.paidUsers, detail: `${paidRate}% da base cadastrada`, icon: WalletCards, color: 'text-violet-300 bg-violet-400/10' },
                { label: 'Vencem em 7 dias', value: metrics?.expiring7d, detail: 'Acompanhar retenção', icon: CalendarClock, color: 'text-amber-300 bg-amber-400/10' },
              ].map(({ label, value, detail, icon: Icon, color }) => (
                <article key={label} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-black/10">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-400">{label}</p>
                      <p className="mt-2 text-3xl font-black tabular-nums">{dashboard.isPending ? '—' : numberFormatter.format(value ?? 0)}</p>
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}><Icon size={19} /></div>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">{detail}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="atividade" className="mt-6 grid scroll-mt-24 gap-6 xl:grid-cols-[1.6fr_1fr]">
          <article className="min-w-0 rounded-2xl border border-white/10 bg-slate-900/70 p-5 sm:p-6">
            <div className="mb-6">
              <h2 className="font-bold">Usuários ativos por dia</h2>
              <p className="mt-1 text-xs text-slate-500">Pessoas com marcações nos últimos 14 dias</p>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics?.activity ?? []} margin={{ left: -20, right: 8 }}>
                  <defs>
                    <linearGradient id="adminActivity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(value: string) => shortDate.format(new Date(`${value}T12:00:00`))} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }} labelStyle={{ color: '#94a3b8' }} />
                  <Area type="monotone" dataKey="users" name="Usuários" stroke="#22d3ee" strokeWidth={2.5} fill="url(#adminActivity)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 sm:p-6">
            <h2 className="font-bold">Distribuição de planos</h2>
            <p className="mt-1 text-xs text-slate-500">Situação atual dos perfis</p>
            <div className="mt-8 space-y-6">
              {[
                { label: 'Free', value: metrics?.plans.free ?? 0, color: 'bg-slate-400' },
                { label: 'PRO Mensal', value: metrics?.plans.monthly ?? 0, color: 'bg-cyan-400' },
                { label: 'PRO Anual', value: metrics?.plans.annual ?? 0, color: 'bg-violet-400' },
              ].map(item => {
                const percentage = totalUsers ? Math.round((item.value / totalUsers) * 100) : 0;
                return (
                  <div key={item.label}>
                    <div className="mb-2 flex justify-between text-xs">
                      <span className="text-slate-300">{item.label}</span>
                      <span className="tabular-nums text-slate-500">{item.value} · {percentage}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/5">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 flex items-center gap-3 rounded-xl border border-emerald-400/10 bg-emerald-400/5 p-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
              <div>
                <p className="text-xs font-semibold text-emerald-200">Onboarding concluído</p>
                <p className="text-[11px] text-slate-500">{onboardingRate}% da base</p>
              </div>
            </div>
          </article>
        </section>

        <section id="usuarios" className="mt-6 scroll-mt-24 rounded-2xl border border-white/10 bg-slate-900/70">
          <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="font-bold">Usuários recentes</h2>
              <p className="mt-1 text-xs text-slate-500">Dados de conta e plano, sem informações salariais</p>
            </div>
            <label className="relative block w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={search}
                onChange={event => { setSearch(event.target.value); setPage(0); }}
                placeholder="Buscar nome ou e-mail"
                className="border-white/10 bg-slate-950 pl-9 text-slate-100 placeholder:text-slate-600"
              />
            </label>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 font-semibold">Usuário</th>
                  <th className="px-6 py-4 font-semibold">Plano</th>
                  <th className="px-6 py-4 font-semibold">Cadastro</th>
                  <th className="px-6 py-4 font-semibold">Última atividade</th>
                  <th className="px-6 py-4 text-right font-semibold">Onboarding</th>
                </tr>
              </thead>
              <tbody>
                {(users.data ?? []).map(item => (
                  <tr key={item.id} className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.025]">
                    <td className="px-6 py-4"><p className="font-medium text-slate-200">{item.name || 'Sem nome'}</p><p className="mt-0.5 text-xs text-slate-500">{item.email}</p></td>
                    <td className="px-6 py-4"><Badge variant="outline" className={item.plan === 'anual' ? 'border-violet-400/20 text-violet-300' : item.plan === 'pro' ? 'border-cyan-400/20 text-cyan-300' : 'border-white/10 text-slate-400'}>{planLabel(item.plan)}</Badge></td>
                    <td className="px-6 py-4 text-xs text-slate-400">{formatDate(item.created_at)}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{formatDate(item.last_activity)}</td>
                    <td className="px-6 py-4 text-right">{item.onboarding_complete ? <span className="text-xs text-emerald-300">Concluído</span> : <span className="text-xs text-amber-300">Pendente</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-white/5 md:hidden">
            {(users.data ?? []).map(item => (
              <article key={item.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="truncate font-medium">{item.name || 'Sem nome'}</p><p className="truncate text-xs text-slate-500">{item.email}</p></div>
                  <Badge variant="outline" className="shrink-0 border-white/10 text-slate-300">{planLabel(item.plan)}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><p className="text-slate-600">Cadastro</p><p className="mt-1 text-slate-400">{formatDate(item.created_at)}</p></div><div><p className="text-slate-600">Última atividade</p><p className="mt-1 text-slate-400">{formatDate(item.last_activity)}</p></div></div>
              </article>
            ))}
          </div>

          {!users.isPending && users.data?.length === 0 && <p className="p-10 text-center text-sm text-slate-500">Nenhum usuário encontrado.</p>}
          {users.isPending && <p className="p-10 text-center text-sm text-slate-500">Carregando usuários...</p>}

          <div className="flex items-center justify-between border-t border-white/10 px-5 py-4 text-xs text-slate-500 sm:px-6">
            <span>Página {page + 1} de {totalPages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="border-white/10 bg-transparent text-slate-300 hover:bg-white/5" disabled={page === 0} onClick={() => setPage(current => current - 1)}>Anterior</Button>
              <Button size="sm" variant="outline" className="border-white/10 bg-transparent text-slate-300 hover:bg-white/5" disabled={page + 1 >= totalPages} onClick={() => setPage(current => current + 1)}>Próxima</Button>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
