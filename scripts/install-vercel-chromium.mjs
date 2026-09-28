if (process.env.VERCEL !== '1') {
  console.log('Skipping Vercel Chromium install outside Vercel.');
  process.exit(0);
}

console.log('Skipping Chromium prerender on Vercel; generated public HTML is validated in CI/local builds.');
