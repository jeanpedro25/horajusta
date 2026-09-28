import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectDir, 'dist');
const shellPath = path.join(distDir, 'app-shell.html');
const deploymentConfig = JSON.parse(await readFile(path.join(projectDir, 'vercel.json'), 'utf8'));
const routes = [
  { path: '/', output: 'index.html', title: 'Hora Justa — Registre e acompanhe sua jornada', heading: /Registre cada jornada\. Confira cada hora\./, robots: 'index, follow', canonical: 'https://horajusta.com/', ogUrl: 'https://horajusta.com/' },
  { path: '/termos', output: 'termos/index.html', title: 'Termos de Uso | Hora Justa', heading: /^Termos de Uso$/, robots: 'noindex, follow', canonical: 'https://horajusta.com/termos', ogUrl: 'https://horajusta.com/termos' },
  { path: '/privacidade-publica', output: 'privacidade-publica/index.html', title: 'Política de Privacidade | Hora Justa', heading: /^Política de Privacidade$/, robots: 'noindex, follow', canonical: 'https://horajusta.com/privacidade-publica', ogUrl: 'https://horajusta.com/privacidade-publica' },
];
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
};

const shell = await readFile(shellPath, 'utf8');
if (!/<meta name="robots" content="noindex, nofollow"\s*\/?\s*>/i.test(shell) ||
  /rel="canonical"|property="og:(?:title|url|image)"|name="twitter:/i.test(shell)) {
  throw new Error('The Vite app-shell entry must be noindex and contain no landing canonical or social metadata.');
}
for (const [source, destination] of [
  ['/termos', '/termos/index.html'],
  ['/privacidade-publica', '/privacidade-publica/index.html'],
  ['/(.*)', '/app-shell.html'],
]) {
  if (!deploymentConfig.rewrites?.some(rule => rule.source === source && rule.destination === destination)) {
    throw new Error(`Missing Vercel rewrite ${source} -> ${destination}.`);
  }
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname); }
  catch { response.writeHead(400).end(); return; }

  let requestedFile;
  if (pathname === '/') requestedFile = path.join(distDir, 'index.html');
  else {
    const publicRoute = routes.find(route => route.path !== '/' && (pathname === route.path || pathname === `${route.path}/`));
    requestedFile = publicRoute
      ? path.join(distDir, publicRoute.output)
      : path.resolve(distDir, `.${pathname}`);
    if (requestedFile !== distDir && !requestedFile.startsWith(`${distDir}${path.sep}`)) {
      response.writeHead(400).end();
      return;
    }
    try {
      const fileStat = await stat(requestedFile);
      if (fileStat.isDirectory()) requestedFile = path.join(requestedFile, 'index.html');
      else if (!fileStat.isFile()) requestedFile = shellPath;
    } catch { requestedFile = shellPath; }
  }

  try {
    const contents = await readFile(requestedFile);
    response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(requestedFile)] ?? 'application/octet-stream' });
    response.end(request.method === 'HEAD' ? undefined : contents);
  } catch { response.writeHead(404).end(); }
});

if (process.env.VERCEL === '1') {
  console.log('Skipping Chromium prerender on Vercel; generated public HTML is validated in CI/local builds.');
  await new Promise(resolve => server.close(resolve));
  process.exit(0);
}

await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Could not start local static build server.');
const baseUrl = `http://127.0.0.1:${address.port}`;
let browser;

try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const pageErrors = [];
  const hydrationErrors = [];
  page.on('pageerror', error => pageErrors.push(`${page.url()}: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error' && /hydration|did not match|server html/i.test(message.text())) hydrationErrors.push(message.text());
  });

  for (const route of routes) {
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: route.heading }).waitFor();
    await page.waitForFunction(expectedTitle => document.title === expectedTitle, route.title);
    await page.waitForFunction(expectedRobots => document.querySelector('meta[name="robots"]')?.content === expectedRobots, route.robots);

    await page.evaluate(async () => {
      const step = Math.max(360, Math.floor(window.innerHeight * 0.7));
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }
      window.scrollTo(0, 0);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      document.getElementById('root')?.setAttribute('data-prerendered', 'true');
    });
    await page.waitForTimeout(250);

    const html = await page.locator('html').evaluate(element => `<!doctype html>\n${element.outerHTML}`);
    const outputPath = path.join(distDir, route.output);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, html, 'utf8');

    const rawResponse = await page.request.get(`${baseUrl}${route.path}`);
    const rawHtml = await rawResponse.text();
    const normalizedRawHtml = rawHtml.replace(/\s+/g, ' ');
    if (!rawResponse.ok() || !normalizedRawHtml.includes(`<title>${route.title}</title>`) ||
      !normalizedRawHtml.includes('data-prerendered="true"') ||
      !normalizedRawHtml.includes(`<meta name="robots" content="${route.robots}">`) ||
      !normalizedRawHtml.includes(`<link rel="canonical" href="${route.canonical}">`) ||
      !normalizedRawHtml.includes(`<meta property="og:url" content="${route.ogUrl}">`)) {
      throw new Error(`Generated HTML for ${route.path} failed raw-response validation.`);
    }
    console.log(`Prerendered and verified ${route.path} (${Buffer.byteLength(html)} bytes HTML)`);
  }

  for (const route of routes) {
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: route.heading }).waitFor();
    await page.waitForFunction(expectedTitle => document.title === expectedTitle, route.title);
  }

  const shellResponse = await page.request.get(`${baseUrl}/app/auth`);
  const shellHtml = await shellResponse.text();
  if (!shellResponse.ok() || !shellHtml.includes('noindex, nofollow') || shellHtml.includes('data-prerendered="true"') ||
    /rel="canonical"|property="og:(?:title|url|image)"|name="twitter:/i.test(shellHtml)) {
    throw new Error('SPA shell fallback must remain unindexed and client-rendered.');
  }
  const homeHtml = await readFile(path.join(distDir, 'index.html'), 'utf8');
  const socialImagePath = new URL(homeHtml.match(/<meta property="og:image" content="([^"]+)"/)?.[1] ?? '').pathname;
  const socialImageResponse = await page.request.get(`${baseUrl}${socialImagePath}`);
  const socialImage = await socialImageResponse.body();
  if (!socialImageResponse.ok() || !socialImageResponse.headers()['content-type']?.includes('image/jpeg') ||
    socialImage.length >= 500_000 || socialImage.subarray(0, 3).toString('hex') !== 'ffd8ff') {
    throw new Error('The prerendered deployment artifact is missing a valid, optimized JPEG social image.');
  }
  const socialDimensions = await page.evaluate(url => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error('Social image failed to decode from the built artifact.'));
    image.src = url;
  }), `${baseUrl}${socialImagePath}`);
  if (socialDimensions.width !== 1730 || socialDimensions.height !== 909 ||
    !homeHtml.includes(`property="og:image:width" content="${socialDimensions.width}"`) ||
    !homeHtml.includes(`property="og:image:height" content="${socialDimensions.height}"`)) {
    throw new Error('Social image dimensions do not match their Open Graph metadata.');
  }
  if (pageErrors.length || hydrationErrors.length) {
    throw new Error(`Browser verification failed. Runtime: ${pageErrors.join('; ')}. Hydration warnings: ${hydrationErrors.join('; ')}`);
  }
  console.log('Verified public static pages render without runtime errors and the SPA shell stays separate.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
