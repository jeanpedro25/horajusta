import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FinalCTASection from './FinalCTASection';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('framer-motion', async () => {
  const React = await import('react');
  return {
    motion: {
      div: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
      ({ children, className, id }, ref) => <div ref={ref} className={className} id={id}>{children}</div>,
      ),
    },
  };
});

describe('FinalCTASection', () => {
  it('describes the product without implying official/legal guarantees', () => {
    render(<FinalCTASection />);

    expect(screen.getByText(/Organize seus registros, acompanhe estimativas/)).toBeInTheDocument();
    expect(screen.getByText(/Cálculos e alertas são informativos/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Criar minha conta grátis/ })).toBeInTheDocument();
  });
});
