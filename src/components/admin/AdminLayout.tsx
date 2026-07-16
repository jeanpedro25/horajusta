import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, LayoutDashboard, LogOut, ShieldCheck, Users } from 'lucide-react';
import HoraJustaLogo from '@/components/HoraJustaLogo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/10 bg-slate-950/95 px-4 py-6 backdrop-blur-xl lg:flex">
        <HoraJustaLogo showText className="px-2 [&_span]:text-white" />
        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
            <ShieldCheck size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-cyan-300">Ambiente seguro</p>
            <p className="truncate text-[11px] text-slate-500">Acesso somente leitura</p>
          </div>
        </div>
        <nav className="mt-8 space-y-1" aria-label="Administração">
          <a href="#visao-geral" className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-3 text-sm font-semibold text-white">
            <LayoutDashboard size={18} className="text-cyan-300" /> Visão geral
          </a>
          <a href="#usuarios" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white">
            <Users size={18} /> Usuários
          </a>
          <a href="#atividade" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white">
            <Activity size={18} /> Atividade
          </a>
        </nav>
        <div className="mt-auto space-y-2 border-t border-white/10 pt-4">
          <p className="truncate px-3 text-xs text-slate-500">{user?.email}</p>
          <Button variant="ghost" className="w-full justify-start text-slate-400 hover:bg-white/5 hover:text-white" onClick={() => navigate('/app')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao aplicativo
          </Button>
          <Button variant="ghost" className="w-full justify-start text-slate-400 hover:bg-red-500/10 hover:text-red-300" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-cyan-300" />
          <span className="font-semibold">Painel do Chefe</span>
        </div>
        <Button size="sm" variant="ghost" className="text-slate-300" onClick={() => navigate('/app')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> App
        </Button>
      </header>

      <main className="lg:pl-64">{children}</main>
    </div>
  );
}
