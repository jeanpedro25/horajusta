import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import PrivacidadePublicaPage from './PrivacidadePublicaPage';

describe('public privacy policy', () => {
  it('discloses processors, sensitive attachments, and payment-ledger retention limits', () => {
    render(
      <MemoryRouter>
        <PrivacidadePublicaPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/usa Supabase.*Vercel.*Mercado Pago/i)).toBeInTheDocument();
    expect(screen.getByText(/Atestados e outros anexos podem conter dados pessoais sensíveis/i)).toBeInTheDocument();
    expect(screen.getByText(/referência externa e o payload bruto recebido do Mercado Pago não são apagados automaticamente/i)).toBeInTheDocument();
    expect(screen.getByText(/prazos precisam ser definidos na versão final desta política/i)).toBeInTheDocument();
  });

  it('names the icon-only back control for assistive technology', () => {
    render(<MemoryRouter><PrivacidadePublicaPage /></MemoryRouter>);
    expect(screen.getAllByRole('button', { name: 'Voltar' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Voltar' })[0]).toHaveAttribute('aria-label', 'Voltar');
  });
});
