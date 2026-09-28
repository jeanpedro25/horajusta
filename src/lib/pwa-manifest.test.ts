import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const publicDir = resolve(process.cwd(), 'public');

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

function jpegDimensions(bytes: Buffer): { width: number; height: number } | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;

    const segmentLength = bytes.readUInt16BE(offset);
    const isStartOfFrame = [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker);
    if (isStartOfFrame) {
      return {
        height: bytes.readUInt16BE(offset + 3),
        width: bytes.readUInt16BE(offset + 5),
      };
    }
    offset += segmentLength;
  }
  return null;
}

describe('PWA manifest assets', () => {
  const manifest = JSON.parse(readFileSync(resolve(publicDir, 'manifest.json'), 'utf8')) as {
    name?: string;
    short_name?: string;
    start_url?: string;
    display?: string;
    icons?: ManifestIcon[];
  };

  it('has the minimum app identity and launch properties', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe('/app');
    expect(['fullscreen', 'standalone', 'minimal-ui', 'window-controls-overlay']).toContain(manifest.display);
  });

  it('points to existing icon files whose declared MIME matches their content', () => {
    expect(manifest.icons?.length).toBeGreaterThan(0);

    for (const icon of manifest.icons ?? []) {
      expect(icon.src.startsWith('/')).toBe(true);
      const assetPath = resolve(publicDir, `.${icon.src}`);
      expect(existsSync(assetPath)).toBe(true);
      const bytes = readFileSync(assetPath);

      if (icon.type === 'image/jpeg') {
        expect(bytes.subarray(0, 3).toString('hex')).toBe('ffd8ff');
        const dimensions = jpegDimensions(bytes);
        expect(dimensions).not.toBeNull();
        expect(icon.sizes).toContain(`${dimensions?.width}x${dimensions?.height}`);
      } else if (icon.type === 'image/svg+xml') {
        const svg = bytes.toString('utf8');
        expect(svg).toMatch(/<svg\b/);
        expect(svg).toContain('viewBox=');
        expect(svg).not.toMatch(/<image\b/i);
        expect(svg).not.toMatch(/\b(?:href|src)=["'](?!#|data:)/i);
        expect(svg).toMatch(/<circle\b/);
        expect(svg).toMatch(/<path\b/);
        expect(icon.sizes).toContain('192x192');
        expect(icon.sizes).toContain('512x512');
      } else {
        throw new Error(`Unsupported PWA icon type: ${icon.type}`);
      }
    }
  });

  it('keeps the browser favicon pointed at an existing declared icon', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const favicon = html.match(/<link\s+rel="icon"\s+type="([^"]+)"\s+href="([^"]+)"/);

    expect(favicon).not.toBeNull();
    expect(manifest.icons?.some(icon => icon.src === favicon?.[2] && icon.type === favicon?.[1])).toBe(true);
  });
});
