import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import LandingNav from './LandingNav';

describe('landing mobile navigation accessibility', () => {
  it('keeps aria-controls valid and synchronizes the collapsed state', () => {
    render(<MemoryRouter><LandingNav /></MemoryRouter>);

    const openButton = screen.getByRole('button', { name: 'Abrir menu' });
    const controlledId = openButton.getAttribute('aria-controls');
    const menu = document.getElementById(controlledId ?? '');

    expect(menu).toBeInTheDocument();
    expect(menu).toHaveAttribute('hidden');
    expect(openButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(openButton);

    expect(screen.getByRole('button', { name: 'Fechar menu' })).toHaveAttribute('aria-expanded', 'true');
    expect(menu).not.toHaveAttribute('hidden');
  });

  it('exposes the brand as an accessible link to the landing home', () => {
    render(<MemoryRouter><LandingNav /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Hora Justa — início' })).toHaveAttribute('href', '/');
  });
});
