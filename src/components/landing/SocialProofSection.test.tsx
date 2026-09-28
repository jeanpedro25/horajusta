import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SocialProofSection from './SocialProofSection';

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const Static = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, className, id }, ref) => <div ref={ref} className={className} id={id}>{children}</div>,
  );
  return { motion: { div: Static } };
});

describe('illustrative report preview', () => {
  it('does not present the static PDF illustration as an interactive button', () => {
    render(<SocialProofSection />);

    expect(screen.getByText('Exemplo de relatório exportável em PDF')).toBeInTheDocument();
    expect(screen.getByText('PRÉVIA · DADOS ILUSTRATIVOS')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /relatório PDF/i })).not.toBeInTheDocument();
  });
});
