import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AceiteTermosPage from './AceiteTermosPage';

const mocks = vi.hoisted(() => ({
  refreshProfile: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-test' }, refreshProfile: mocks.refreshProfile }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: vi.fn() },
}));

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

describe('legal acceptance controls', () => {
  it('keeps document navigation links outside the checkbox label', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/aceite-termos']}>
        <AceiteTermosPage />
      </MemoryRouter>,
    );

    const checkbox = screen.getByRole('checkbox', { name: /Li e concordo com os documentos/ });
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '/termos');
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade-publica');

    for (const label of container.querySelectorAll('label')) {
      expect(label.querySelector('a, button')).toBeNull();
    }
  });
});
