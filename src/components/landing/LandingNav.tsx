import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import HoraJustaLogo from '@/components/HoraJustaLogo';

const LandingNav: React.FC = () => {
  const navigate = useNavigate();
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between px-4 sm:px-6">
        <HoraJustaLogo size={34} showText />
        <div className="hidden items-center gap-8 md:flex">
          <button onClick={() => scrollTo('problema')} className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-primary">Por que registrar</button>
          <button onClick={() => scrollTo('simulador')} className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-primary">Simulador</button>
          <button onClick={() => scrollTo('precos')} className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-primary">Planos</button>
        </div>
        <button
          type="button"
          onClick={() => navigate('/auth')}
          className="flex min-h-11 items-center gap-2 rounded-lg border border-primary bg-primary px-4 text-xs font-bold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-primary/90 sm:px-5"
        >
          <span className="hidden sm:inline">Acessar app</span>
          <span className="sm:hidden">Entrar</span>
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
};

export default LandingNav;
