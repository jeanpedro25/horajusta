import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Activity, ArrowLeft, LayoutDashboard, LogOut,
  Menu, ShieldCheck, TrendingUp, Users, X
} from 'lucide-react';
import HoraJustaLogo from '@/components/HoraJustaLogo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const NAV = [
  { href: '#visao-geral',  label: 'Visão geral',  icon: LayoutDashboard },
  { href: '#usuarios',     label: 'Usuários',      icon: Users },
  { href: '#atividade',    label: 'Atividade',     icon: Activity },
  { href: '#crescimento',  label: 'Crescimento',   icon: TrendingUp },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const navigate   = useNavigate();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeHash, setActiveHash] = useState('#visao-geral');

  // Track active section via IntersectionObserver
  useEffect(() => {
    const sections = NAV.map(n => document.querySelector(n.href));
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.find(e => e.isIntersecting);
        if (visible) setActiveHash('#' + visible.target.id);
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );
    sections.forEach(s => s && observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/chefe/entrar');
  };

  const NavLinks = () => (
    <nav className="mt-8 space-y-1" aria-label="Administração">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = activeHash === href;
        return (
          <a
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              active
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon size={17} className={active ? 'text-cyan-300' : ''} />
            {label}
          </a>
        );
      })}
    </nav>
  );

  const SidebarBottom = () => (
    <div className="mt-auto space-y-1 border-t border-white/10 pt-4">
      <div className="mb-3 truncate rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-500">
        {user?.email}
      </div>
      <Button
        variant="ghost"
        className="w-full justify-start gap-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
        onClick={() => navigate('/app')}
      >
        <ArrowLeft size={15} /> Voltar ao app
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start gap-2 text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-300"
        onClick={handleSignOut}
      >
        <LogOut size={15} /> Sair
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/10 bg-slate-950/95 px-4 py-6 backdrop-blur-xl lg:flex">
        <HoraJustaLogo showText className="px-2 [&_span]:text-white" />
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
            <ShieldCheck size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-cyan-300">Painel Admin</p>
            <p className="truncate text-[11px] text-slate-500">Somente leitura</p>
          </div>
        </div>
        <NavLinks />
        <SidebarBottom />
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-cyan-300" />
          <span className="font-semibold">Painel do Chefe</span>
        </div>
        <button
          onClick={() => setMobileOpen(v => !v)}
          className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute left-0 top-[57px] flex h-[calc(100%-57px)] w-72 flex-col border-r border-white/10 bg-slate-950/98 px-4 py-6 backdrop-blur-xl"
            onClick={e => e.stopPropagation()}
          >
            <NavLinks />
            <SidebarBottom />
          </div>
        </div>
      )}

      <main className="lg:pl-64">{children}</main>
    </div>
  );
}
