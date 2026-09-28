import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Slider } from '@/components/ui/slider';
import SimulatorSection from './SimulatorSection';

class ResizeObserverMock implements ResizeObserver {
  constructor(_callback: ResizeObserverCallback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

class IntersectionObserverMock implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '0px';
  readonly thresholds = [0];

  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
  observe(_target: Element) {}
  unobserve(_target: Element) {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}

describe('landing overtime simulator accessibility', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows the estimate and the assumptions alongside the real landing-page controls', () => {
    render(
      <MemoryRouter>
        <SimulatorSection />
      </MemoryRouter>,
    );

    expect(screen.getByText('R$ 477,27')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Estimativa bruta de horas extras: R$ 477,27');
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'true');
    expect(screen.getByText('220 horas')).toBeInTheDocument();
    expect(screen.getByText(/jornada de 44 horas semanais/i)).toBeInTheDocument();
    expect(screen.getByText(/categoria e acordo ou convenção coletiva/i)).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Salário base' })).toHaveAttribute('aria-valuetext', expect.stringContaining('3.500,00'));
    expect(screen.getByRole('slider', { name: 'Horas extras no mês' })).toHaveAttribute('aria-valuetext', '20 horas');
  });

  it('exposes a meaningful accessible name and current value for each slider', () => {
    render(
      <div>
        <span id="salary-label">Salário base</span>
        <Slider aria-labelledby="salary-label" aria-valuetext="R$ 3.500,00" value={[3500]} min={1000} max={20000} step={100} />
        <span id="overtime-label">Horas extras no mês</span>
        <Slider aria-labelledby="overtime-label" aria-valuetext="20 horas" value={[20]} min={0} max={60} step={1} />
      </div>,
    );

    const salarySlider = screen.getByRole('slider', { name: 'Salário base' });
    const overtimeSlider = screen.getByRole('slider', { name: 'Horas extras no mês' });

    expect(salarySlider).toHaveAttribute('aria-valuetext', expect.stringContaining('3.500,00'));
    expect(overtimeSlider).toHaveAttribute('aria-valuetext', '20 horas');
    expect(salarySlider).toHaveAttribute('aria-valuemin', '1000');
    expect(overtimeSlider).toHaveAttribute('aria-valuemax', '60');
  });
});
