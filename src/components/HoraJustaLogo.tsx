import React from 'react';

interface HoraJustaLogoProps {
  size?: number;
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
}

const HoraJustaLogo: React.FC<HoraJustaLogoProps> = ({
  size = 40,
  showText = false,
  showTagline = false,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src="/app-icon.svg"
        width={size}
        height={size}
        alt={showText ? '' : 'Hora Justa'}
        className="shrink-0 rounded-full object-cover"
      />

      {showText && (
        <div className="flex flex-col">
          <span className="text-lg font-bold tracking-tight leading-tight">
            <span className="text-primary">Hora </span>
            <span className="text-accent">Justa</span>
          </span>
          {showTagline && (
            <span className="text-[10px] text-muted-foreground leading-tight">
              Controle suas horas. Conheça seu valor.
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default HoraJustaLogo;
