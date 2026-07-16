import React from 'react';
import { useNavigate } from 'react-router-dom';
import HoraJustaLogo from '@/components/HoraJustaLogo';

const LandingFooter: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="border-t border-border bg-card px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
          <div>
            <HoraJustaLogo size={30} showText />
            <p className="mt-3 max-w-sm text-xs leading-5 text-muted-foreground">Ferramenta de organização pessoal de jornada, banco de horas e estimativas.</p>
          </div>
          <div className="flex flex-wrap gap-x-7 gap-y-3 text-sm">
            <button onClick={() => navigate('/auth')} className="font-semibold text-foreground hover:text-primary">Entrar</button>
            <button onClick={() => navigate('/termos')} className="text-muted-foreground hover:text-primary">Termos de uso</button>
            <button onClick={() => navigate('/privacidade-publica')} className="text-muted-foreground hover:text-primary">Privacidade</button>
          </div>
        </div>
        <div className="mt-9 flex flex-col justify-between gap-3 border-t border-border pt-6 text-xs leading-5 text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Hora Justa.</p>
          <p className="max-w-2xl md:text-right">Os registros são de responsabilidade do usuário. Valores são estimativas baseadas nos dados informados e não substituem documentos oficiais.</p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
