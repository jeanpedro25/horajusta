import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LEGAL_COPY } from '@/lib/legal-copy';
import { ANNUAL_SAVINGS_CENTS, formatBRLCents, PLAN_CATALOG } from '../../../supabase/functions/_shared/plan-catalog';
import PricingSection from './PricingSection';

class IntersectionObserverMock implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '0px';
  readonly thresholds = [];

  constructor(_callback: IntersectionObserverCallback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}

describe('landing pricing offer', () => {
  beforeEach(() => vi.stubGlobal('IntersectionObserver', IntersectionObserverMock));
  afterEach(() => vi.unstubAllGlobals());

  it('keeps displayed prices, durations, savings, and payment terms aligned with the checkout catalog', () => {
    render(<MemoryRouter><PricingSection /></MemoryRouter>);
    const currencyText = (expected: string) => (_content: string, element: Element | null) =>
      element?.tagName === 'SPAN' && element.textContent?.replace(/\u00a0/g, ' ') === expected.replace(/\u00a0/g, ' ');

    expect(screen.getByText(currencyText(formatBRLCents(PLAN_CATALOG.pro.amountCents)))).toBeInTheDocument();
    expect(screen.getByText(currencyText(formatBRLCents(PLAN_CATALOG.anual.amountCents)))).toBeInTheDocument();
    expect(screen.getByText(`Pagamento único · acesso por ${PLAN_CATALOG.pro.durationMonths} mês · sem renovação automática`)).toBeInTheDocument();
    expect(screen.getByText(`Pagamento único · acesso por ${PLAN_CATALOG.anual.durationMonths} meses · sem renovação automática`)).toBeInTheDocument();
    expect(screen.getByText((content, element) =>
      element?.tagName === 'SPAN' && content.startsWith('Economia de') &&
      content.replace(/\u00a0/g, ' ').includes(formatBRLCents(ANNUAL_SAVINGS_CENTS).replace(/\u00a0/g, ' ')),
    )).toBeInTheDocument();
    expect(screen.getByText(LEGAL_COPY.subscription)).toBeInTheDocument();
    expect(screen.getByText(/7 dias de acesso PRO sem informar cartão/)).toBeInTheDocument();
    expect(screen.getByText(/O teste não vira cobrança automaticamente/)).toBeInTheDocument();
    expect(screen.getByText(/sem cobrança automática ao fim do teste/)).toBeInTheDocument();
    expect(screen.getByText('Radar Trabalhista: prévia de alertas no gratuito; análise completa e estimativas no PRO')).toBeInTheDocument();
    const pageCopy = document.body.textContent ?? '';
    expect(pageCopy).not.toMatch(/recursos PRO liberados por 1 mês/i);
    expect(pageCopy).not.toMatch(/Acesso por 12 meses/);
    expect(pageCopy).not.toMatch(/Pagamento único por 12 meses, sem renovação automática/);
    expect(pageCopy).not.toMatch(/planos mensais e anuais com renovação automática/i);
    expect(pageCopy).not.toMatch(/cancelamento pode ser feito diretamente no app/i);
  });
});
