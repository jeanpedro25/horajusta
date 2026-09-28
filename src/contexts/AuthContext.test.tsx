import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

const mocks = vi.hoisted(() => ({
  authCallback: null as ((event: string, session: unknown) => void) | null,
  maybeSingle: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
        mocks.authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      signOut: vi.fn(),
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mocks.maybeSingle }),
      }),
    }),
  },
}));

vi.mock('@/lib/client-state', () => ({
  clearAllClientState: vi.fn(),
  clearTransientClientState: vi.fn(),
}));

function AuthProbe() {
  const { profile, refreshProfile } = useAuth();
  return (
    <>
      <output data-testid="profile-name">{profile?.nome ?? 'sem perfil'}</output>
      <button type="button" onClick={() => void refreshProfile()}>Atualizar perfil</button>
    </>
  );
}

describe('AuthProvider profile refresh', () => {
  beforeEach(() => {
    mocks.authCallback = null;
    mocks.maybeSingle.mockReset();
  });

  it('preserves the last loaded profile when a refresh query fails', async () => {
    mocks.maybeSingle
      .mockResolvedValueOnce({ data: { id: 'user-1', nome: 'Ana' }, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('temporary network failure') });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    const session = { user: { id: 'user-1' } };
    mocks.authCallback?.('INITIAL_SESSION', session);

    await waitFor(() => expect(screen.getByTestId('profile-name')).toHaveTextContent('Ana'));
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar perfil' }));

    await waitFor(() => expect(mocks.maybeSingle).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('profile-name')).toHaveTextContent('Ana');
  });
});
