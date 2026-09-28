import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import HeroSection from './HeroSection';

describe('landing hero', () => {
  it('identifies the phone interface as illustrative data', () => {
    render(<MemoryRouter><HeroSection /></MemoryRouter>);

    expect(screen.getByText('Tela demonstrativa · dados fictícios')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /trabalhador usando o celular/i })).toBeInTheDocument();
    expect(screen.getByText('7 dias grátis · sem cartão')).toBeInTheDocument();
    expect(screen.getByText('Registros salvos na sua conta')).toBeInTheDocument();
    expect(screen.getByText('Sem cobrança automática')).toBeInTheDocument();
  });

  it('uses the optimized transparent WebP artwork in the hero', () => {
    render(<MemoryRouter><HeroSection /></MemoryRouter>);

    expect(screen.getByRole('img', { name: /trabalhador usando o celular/i })).toHaveAttribute(
      'src',
      '/hora-justa-trabalhador-v4.webp',
    );
  });
});
