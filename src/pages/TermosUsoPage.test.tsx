import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LEGAL_COPY } from '@/lib/legal-copy';
import TermosUsoPage from './TermosUsoPage';

describe('public terms page', () => {
  it('matches the one-time payment model and explicit versioned acceptance flow', () => {
    render(<MemoryRouter><TermosUsoPage /></MemoryRouter>);

    expect(screen.getByText(LEGAL_COPY.subscription)).toBeInTheDocument();
    expect(screen.getByText(/aceite destes Termos de Uso e da Política de Privacidade é solicitado e registrado no fluxo de cadastro/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/planos mensais e anuais com renovação automática|cancelamento pode ser feito diretamente no app|uso contínuo.*implica na aceitação/i);
  });

  it('names the icon-only back control for assistive technology', () => {
    render(<MemoryRouter><TermosUsoPage /></MemoryRouter>);
    expect(screen.getAllByRole('button', { name: 'Voltar' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Voltar' })[0]).toHaveAttribute('aria-label', 'Voltar');
  });
});
