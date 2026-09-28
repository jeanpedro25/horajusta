export function getLandingScrollBehavior(prefersReducedMotion: boolean): ScrollBehavior {
  return prefersReducedMotion ? 'auto' : 'smooth';
}

export function scrollToLandingSection(id: string): void {
  const section = document.getElementById(id);
  if (!section) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  section.scrollIntoView({ behavior: getLandingScrollBehavior(prefersReducedMotion), block: 'start' });
}
