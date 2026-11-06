import project from '@/data/project.json';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

describe('project.json', () => {
  it('has the homescreen copy', () => {
    expect(project.hero.headline).toBe('A Symphony Of Leisure');
    expect(project.hero.cta.label).toBe('Experience Now');
    expect(project.hero.cta.href).toMatch(/^\//);
  });
  it('points to local webp/svg assets only', () => {
    for (const p of [project.hero.background, project.brand.partnerLogo, project.brand.projectLogo])
      expect(p).toMatch(/^\/.+\.(webp|svg)$/);
  });
});

describe('assets', () => {
  it('has no jpg/jpeg/png in public/', () => {
    const walk = (d: string): string[] =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(d, e.name)) : [e.name]);
    expect(walk(join(process.cwd(), 'public')).filter((f) => /\.(jpe?g|png)$/i.test(f))).toEqual([]);
  });
  it('disables prod source maps and sets security headers', () => {
    const cfg = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8');
    expect(cfg).toContain('productionBrowserSourceMaps: false');
    for (const h of ['Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy'])
      expect(cfg).toContain(h);
  });
});
