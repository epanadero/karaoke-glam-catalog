import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const catalogWebRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('production build', () => {
  it('publishes the catalog under the GitHub Pages base path', async () => {
    await build({ root: catalogWebRoot, logLevel: 'error' });

    const source = readFileSync(path.resolve(catalogWebRoot, 'public/karaoke-catalog.json'));
    const builtCatalog = readFileSync(path.resolve(catalogWebRoot, 'dist/karaoke-catalog.json'));
    expect(Buffer.compare(source, builtCatalog)).toBe(0);
    expect(builtCatalog.length).toBeGreaterThan(0);

    const html = readFileSync(path.resolve(catalogWebRoot, 'dist/index.html'), 'utf8');
    expect(html).toMatch(/src="\/karaoke-glam-catalog\/assets\/[^"]+\.js"/);
    expect(html).toMatch(/href="\/karaoke-glam-catalog\/assets\/[^"]+\.css"/);
    expect(html).not.toMatch(/(?:src|href)="\/assets\//);
    expect(html).not.toContain('"/karaoke-catalog.json"');

    const javascript = readdirSync(path.resolve(catalogWebRoot, 'dist/assets'))
      .filter((name) => name.endsWith('.js'))
      .map((name) => readFileSync(path.resolve(catalogWebRoot, 'dist/assets', name), 'utf8'))
      .join('\n');
    expect(javascript).toContain('/karaoke-glam-catalog/');
    expect(javascript).toContain('karaoke-catalog.json');
    expect(javascript).not.toMatch(/["'`]\/karaoke-catalog\.json["'`]/);
  }, 60_000);
});
