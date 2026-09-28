import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

test('mobile landing keeps the offer readable and navigation usable', async ({ page }) => {
  const pageErrors: string[] = [];
  const privateModuleRequests: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('request', request => {
    if (/\/src\/(?:PrivateApp|contexts\/AuthContext)\.tsx/.test(new URL(request.url()).pathname)) {
      privateModuleRequests.push(request.url());
    }
  });

  await page.goto('/');

  await expect(page).toHaveTitle(/Hora Justa — Registre e acompanhe sua jornada/);
  const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
  expect(metaDescription).toContain('sem cartão nem cobrança automática');
  expect(await page.locator('meta[property="og:description"]').getAttribute('content')).toBe(metaDescription);
  expect(await page.locator('meta[name="twitter:description"]').getAttribute('content')).toBe(metaDescription);
  await expect(page.getByRole('heading', { name: 'Registre cada jornada. Confira cada hora.' })).toBeVisible();
  const hero = page.locator('main section').first();
  await expect(hero.getByText('7 dias grátis · sem cartão')).toBeVisible();
  await expect(hero.getByText('Sem cobrança automática')).toBeVisible();
  const heroImage = page.getByRole('img', { name: /trabalhador usando o celular/i });
  await expect(heroImage).toBeVisible();
  await expect.poll(() => heroImage.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const heroImageResponse = await page.request.get(new URL('/hora-justa-trabalhador-v4.webp', page.url()).href);
  expect(heroImageResponse.ok()).toBe(true);
  expect(heroImageResponse.headers()['content-type']).toContain('image/webp');
  expect((await heroImageResponse.body()).byteLength).toBeLessThan(300_000);
  expect(privateModuleRequests).toEqual([]);

  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await expect(page.getByRole('button', { name: 'Fechar menu' })).toHaveAttribute('aria-expanded', 'true');

  const mobileMenu = page.locator('#landing-mobile-menu');
  await mobileMenu.getByRole('button', { name: 'Planos e preços' }).click();
  await expect(mobileMenu).toBeHidden();

  const pricing = page.locator('#precos');
  await expect(pricing).toBeInViewport({ ratio: 0.2 });
  await expect(pricing.getByText('Pagamento único · acesso por 1 mês · sem renovação automática')).toBeVisible();
  await expect(pricing.getByText('Pagamento único · acesso por 12 meses · sem renovação automática')).toBeVisible();
  await expect(pricing.getByRole('button', { name: 'Testar e escolher mensal' })).toBeVisible();
  await expect(pricing.getByRole('button', { name: 'Testar e escolher anual' })).toBeVisible();
  await expect(pricing.getByText('Acesso por 12 meses', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Cálculos e alertas são informativos e dependem dos dados/)).toBeVisible();

  const overtimeSlider = page.getByRole('slider', { name: 'Horas extras no mês' });
  await overtimeSlider.scrollIntoViewIfNeeded();
  const track = overtimeSlider.locator('..');
  const trackBox = await track.boundingBox();
  expect(trackBox).not.toBeNull();
  const thumbBox = await overtimeSlider.boundingBox();
  expect(thumbBox).not.toBeNull();
  const hoursBeforeTouch = Number(await overtimeSlider.getAttribute('aria-valuenow'));
  const touchSession = await page.context().newCDPSession(page);
  const touchY = trackBox!.y + trackBox!.height / 2;
  await touchSession.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ id: 1, x: thumbBox!.x + thumbBox!.width / 2, y: thumbBox!.y + thumbBox!.height / 2 }],
  });
  await touchSession.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ id: 1, x: trackBox!.x + trackBox!.width * 0.75, y: touchY }],
  });
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await touchSession.detach();
  await expect.poll(async () => Number(await overtimeSlider.getAttribute('aria-valuenow'))).toBeGreaterThan(hoursBeforeTouch);
  const hoursAfterTouch = Number(await overtimeSlider.getAttribute('aria-valuenow'));
  await overtimeSlider.focus();
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => Number(await overtimeSlider.getAttribute('aria-valuenow'))).toBe(hoursAfterTouch - 1);
  await expect(page.getByText(/^Estimativa bruta de horas extras: R\$\s*\d/)).toBeVisible();

  await page.getByRole('link', { name: 'Hora Justa — início' }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(horizontalOverflow).toBe(false);

  const ogImageUrl = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(ogImageUrl).toBe('https://horajusta.com/og-image-v3.jpg');
  expect(await page.locator('meta[name="twitter:image"]').getAttribute('content')).toBe(ogImageUrl);
  expect(await page.locator('meta[name="twitter:card"]').getAttribute('content')).toBe('summary_large_image');
  const imageAlt = await page.locator('meta[property="og:image:alt"]').getAttribute('content');
  expect(imageAlt).toBeTruthy();
  expect(await page.locator('meta[name="twitter:image:alt"]').getAttribute('content')).toBe(imageAlt);
  expect(await page.locator('meta[property="og:image:type"]').getAttribute('content')).toBe('image/jpeg');
  const canonicalUrl = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canonicalUrl).toBe('https://horajusta.com/');
  expect(await page.locator('meta[property="og:url"]').getAttribute('content')).toBe(canonicalUrl);
  const ogImagePath = new URL(ogImageUrl!).pathname;
  const localOgImageUrl = new URL(ogImagePath, page.url()).href;
  const ogImageResponse = await page.request.get(localOgImageUrl);
  expect(ogImageResponse.ok()).toBe(true);
  expect(ogImageResponse.headers()['content-type']).toContain('image/jpeg');
  const ogImage = await ogImageResponse.body();
  expect(ogImage.subarray(0, 3).toString('hex')).toBe('ffd8ff');
  expect(ogImage.byteLength).toBeLessThan(500_000);
  const decodedOgDimensions = await page.evaluate(url => new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('OG image failed to decode'));
    image.src = url;
  }), localOgImageUrl);
  expect(decodedOgDimensions.width).toBe(Number(await page.locator('meta[property="og:image:width"]').getAttribute('content')));
  expect(decodedOgDimensions.height).toBe(Number(await page.locator('meta[property="og:image:height"]').getAttribute('content')));

  const appIconResponse = await page.request.get(new URL('/app-icon.svg', page.url()).href);
  expect(appIconResponse.ok()).toBe(true);
  const appIcon = await appIconResponse.text();
  expect(appIcon).not.toMatch(/<image\b|(?:href|xlink:href)=["']https?:/i);

  const appleTouchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  expect(appleTouchIcon).toBe('/logo.jpg');
  const appleIconResponse = await page.request.get(new URL(appleTouchIcon!, page.url()).href);
  expect(appleIconResponse.ok()).toBe(true);
  expect(appleIconResponse.headers()['content-type']).toContain('image/jpeg');
  expect((await appleIconResponse.body()).subarray(0, 3).toString('hex')).toBe('ffd8ff');

  const manifestResponse = await page.request.get(new URL('/manifest.json', page.url()).href);
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json() as { icons: Array<{ src: string; type: string }> };
  expect(manifest.icons).toContainEqual(expect.objectContaining({ src: '/app-icon.svg', type: 'image/svg+xml' }));
  expect(manifest.icons).toContainEqual(expect.objectContaining({ src: '/logo.jpg', type: 'image/jpeg' }));

  const robotsResponse = await page.request.get(new URL('/robots.txt', page.url()).href);
  expect(robotsResponse.ok()).toBe(true);
  const robots = await robotsResponse.text();
  expect(robots).toContain('Disallow: /app');
  expect(robots).toContain('Disallow: /auth');
  expect(robots).toContain('Sitemap: https://horajusta.com/sitemap.xml');
  const sitemapResponse = await page.request.get(new URL('/sitemap.xml', page.url()).href);
  expect(sitemapResponse.ok()).toBe(true);
  expect(await sitemapResponse.text()).toContain('<loc>https://horajusta.com/</loc>');
  expect(pageErrors).toEqual([]);

  const pageHeight = await page.locator('body').evaluate(element => element.scrollHeight);
  for (let top = 0; top < pageHeight; top += 520) {
    await page.evaluate(scrollTop => window.scrollTo(0, scrollTop), top);
    await page.waitForTimeout(80);
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await mkdir('test-results', { recursive: true });
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: 'test-results/landing-mobile-scrolled.png', fullPage: true });
});

test('desktop landing reveals the sales sections as the visitor scrolls', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  // Wait for the client-rendered landing before asserting the browser's first Tab stop.
  await expect(page.getByRole('heading', { name: 'Registre cada jornada. Confira cada hora.' })).toBeVisible();

  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Pular para o conteúdo principal' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('#landing-main')).toBeFocused();

  const pageHeight = await page.locator('body').evaluate(element => element.scrollHeight);
  for (let top = 0; top < pageHeight; top += 650) {
    await page.evaluate(scrollTop => window.scrollTo(0, scrollTop), top);
    await page.waitForTimeout(90);
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);

  await expect(page.getByRole('heading', { name: /Já trabalha há meses\? Reconstrua o caminho\./ })).toBeVisible();
  await expect(page.locator('#recursos').getByRole('heading', { name: /visão completa da sua vida de trabalho/i })).toBeVisible();
  await expect(page.locator('#simulador').getByRole('heading', { name: /Faça uma estimativa antes de conferir o pagamento/i })).toBeVisible();
  await expect(page.locator('#precos').getByRole('heading', { name: /Ative o PRO para enxergar o quadro completo/i })).toBeVisible();
  await expect(page.getByText(/Prévia demonstrativa, com dados fictícios\./)).toBeVisible();
  await expect(page.getByText('Exemplo ilustrativo: sequência entre 8 e 14 de julho de 2025.')).toBeVisible();
  await expect(page.getByText('Exemplo: julho/2025')).toBeVisible();
  await expect(page.getByText('Exemplo de relatório exportável em PDF')).toBeVisible();
  await expect(page.getByRole('button', { name: /relatório PDF/i })).toHaveCount(0);
  await expect(page.locator('#precos').getByText('7 dias grátis · sem cartão')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Criar minha conta grátis' })).toBeVisible();
  const contrastRatios = await page.evaluate(() => {
    const samples = [
      'Informe a data de admissão e os horários habituais.',
      'Cadastre períodos diferentes para representar mudanças de escala ou turno.',
      'Valor bruto das horas extras informadas',
      'Divisor considerado',
      'Pagamento único · acesso por 12 meses · sem renovação automática',
      'Prévia do Radar · dados ilustrativos',
      'Foram encontrados 2 dias que merecem revisão no período selecionado.',
      'Resultado estimativo. Não representa valor líquido ou direito reconhecido.',
    ];
    const parse = (value: string) => {
      const match = value.match(/[\d.]+/g)?.map(Number) ?? [];
      return match.length >= 3 ? [match[0], match[1], match[2], match[3] ?? 1] as [number, number, number, number] : null;
    };
    const composite = (front: [number, number, number, number], back: [number, number, number, number]) => {
      const alpha = front[3] + back[3] * (1 - front[3]);
      if (alpha === 0) return [0, 0, 0, 0] as [number, number, number, number];
      return [0, 1, 2].map(index => (front[index] * front[3] + back[index] * back[3] * (1 - front[3])) / alpha).concat(alpha) as [number, number, number, number];
    };
    const luminance = ([r, g, b]: [number, number, number, number]) => {
      const linear = (channel: number) => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
    };
    return samples.map(sample => {
      const element = Array.from(document.querySelectorAll<HTMLElement>('p, span')).find(node => node.textContent?.trim().startsWith(sample));
      if (!element) return { sample, ratio: 0 };
      const foreground = parse(getComputedStyle(element).color);
      if (!foreground) return { sample, ratio: 0 };
      const layers: [number, number, number, number][] = [];
      let parent = element.parentElement;
      let background: [number, number, number, number] = [255, 255, 255, 1];
      while (parent) {
        const color = parse(getComputedStyle(parent).backgroundColor);
        if (color && color[3] > 0) {
          if (color[3] === 1) {
            background = color;
            break;
          }
          layers.push(color);
        }
        parent = parent.parentElement;
      }
      for (const layer of layers.reverse()) background = composite(layer, background);
      const renderedForeground = composite(foreground, background);
      const lighter = Math.max(luminance(renderedForeground), luminance(background));
      const darker = Math.min(luminance(renderedForeground), luminance(background));
      return { sample, ratio: (lighter + 0.05) / (darker + 0.05) };
    });
  });
  expect(contrastRatios).toHaveLength(8);
  expect(contrastRatios.filter(sample => sample.ratio < 4.5)).toEqual([]);
  await expect(page.getByRole('button', { name: 'Testar e escolher mensal' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Testar e escolher anual' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(pageErrors).toEqual([]);

  await mkdir('test-results', { recursive: true });
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: 'test-results/landing-desktop-scrolled.png', fullPage: true });

  await page.getByRole('button', { name: 'Termos de uso' }).click();
  await expect(page.getByRole('heading', { name: 'Termos de Uso' })).toBeVisible();
  await expect(page).toHaveTitle('Termos de Uso | Hora Justa');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://horajusta.com/termos');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  await page.getByRole('button', { name: 'Voltar' }).first().click();
  await expect(page).toHaveURL(/\/#landing-main$/);
  await expect(page).toHaveTitle(/Hora Justa — Registre e acompanhe sua jornada/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://horajusta.com/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
  await page.getByRole('button', { name: 'Privacidade' }).click();
  await expect(page.getByRole('heading', { name: 'Política de Privacidade' })).toBeVisible();
  await expect(page).toHaveTitle('Política de Privacidade | Hora Justa');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://horajusta.com/privacidade-publica');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
});

test('signup carries the free-trial terms through the landing CTA without starting checkout', async ({ page }) => {
  const checkoutRequests: string[] = [];
  const privateModuleRequests: string[] = [];
  page.on('request', request => {
    if (request.url().includes('/functions/v1/create-payment')) checkoutRequests.push(request.url());
    if (/\/src\/(?:PrivateApp|contexts\/AuthContext)\.tsx/.test(new URL(request.url()).pathname)) {
      privateModuleRequests.push(request.url());
    }
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Começar grátis' }).click();
  await expect(page).toHaveURL(/\/auth$/);
  await expect.poll(() => privateModuleRequests.some(url => url.includes('/src/PrivateApp.tsx'))).toBe(true);
  await page.getByRole('tab', { name: 'Criar conta' }).click();

  await expect(page.getByText('7 dias grátis para testar o PRO · sem cartão')).toBeVisible();
  await expect(page.getByText(/O período começa quando sua conta é criada\. Não há cobrança automática/)).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Senha')).toBeVisible();
  expect(checkoutRequests).toEqual([]);
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/auth-signup-mobile.png', fullPage: true });
});
