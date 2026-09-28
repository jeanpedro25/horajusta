import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import HoraJustaLogo from '@/components/HoraJustaLogo';
import { scrollToLandingSection } from '@/lib/landing-scroll';

const LandingNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const scrollTo = (id: string) => {
    scrollToLandingSection(id);
    setMobileMenuOpen(false);
  };

  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          aria-label="Hora Justa — início"
          onClick={(event) => {
            if (location.pathname === '/') {
              event.preventDefault();
              scrollToLandingSection('landing-main');
            }
          }}
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <HoraJustaLogo size={34} showText />
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <button onClick={() => scrollTo('recursos')} className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Recursos</button>
          <button onClick={() => scrollTo('simulador')} className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Simulador</button>
          <button onClick={() => scrollTo('precos')} className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Planos</button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/auth')}
            className="flex min-h-11 items-center gap-2 rounded-lg border border-primary bg-primary px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-5 sm:text-xs sm:tracking-[0.1em]"
          >
            <span className="sm:hidden">Criar conta</span>
            <span className="hidden sm:inline">Começar grátis</span>
            <ArrowUpRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="landing-mobile-menu"
            onClick={() => setMobileMenuOpen(open => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      <div id="landing-mobile-menu" hidden={!mobileMenuOpen} className="border-t border-border/70 bg-background px-4 py-3 md:hidden">
        <div className="mx-auto flex max-w-6xl flex-col gap-1">
          <button onClick={() => scrollTo('recursos')} className="rounded-lg px-3 py-3 text-left text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Recursos</button>
          <button onClick={() => scrollTo('simulador')} className="rounded-lg px-3 py-3 text-left text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Simulador</button>
          <button onClick={() => scrollTo('precos')} className="rounded-lg px-3 py-3 text-left text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Planos e preços</button>
        </div>
      </div>
    </nav>
  );
};

export default LandingNav;
