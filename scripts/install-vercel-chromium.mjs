import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (process.env.VERCEL !== '1') {
  console.log('Skipping Vercel Chromium install outside Vercel.');
  process.exit(0);
}

const playwrightCli = fileURLToPath(import.meta.resolve('@playwright/test/cli'));
execFileSync(process.execPath, [playwrightCli, 'install', 'chromium', '--only-shell'], {
  stdio: 'inherit',
});
