import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { CatalogValidationError } from '../src/catalog.ts';
import { loadPublishableCatalog } from './load-publishable-catalog.ts';

const catalogWebRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const committedCatalog = path.resolve(catalogWebRoot, 'public/karaoke-catalog.json');

describe('publishable catalog file', () => {
  it('accepts the committed catalog', () => {
    const catalog = loadPublishableCatalog(committedCatalog);
    const source = JSON.parse(readFileSync(committedCatalog, 'utf8')) as { songs: unknown[] };

    expect(catalog.schemaVersion).toBe(1);
    expect(catalog.totalSongs).toBe(source.songs.length);
    expect(catalog.totalSongs).toBeGreaterThan(0);
    expect(catalog.songs).toHaveLength(source.songs.length);
  });

  it('rejects a missing catalog', () => {
    const missing = path.join(tmpdir(), 'karaoke-catalog-missing.json');

    expect(() => loadPublishableCatalog(missing)).toThrow(CatalogValidationError);
    expect(() => loadPublishableCatalog(missing)).toThrow(/missing/i);
  });

  it('rejects an empty file', () => {
    const file = tempFile('empty.json', '');

    expect(() => loadPublishableCatalog(file)).toThrow(/empty/i);
  });

  it('rejects an empty song list', () => {
    const file = tempFile(
      'zero.json',
      JSON.stringify({
        schemaVersion: 1,
        generatedAt: '2026-10-09T17:50:05.760Z',
        totalSongs: 0,
        songs: [],
      }),
    );

    expect(() => loadPublishableCatalog(file)).toThrow(/Refusing to publish/);
  });

  it('rejects invalid JSON and an incorrect totalSongs', () => {
    expect(() => loadPublishableCatalog(tempFile('bad.json', '{'))).toThrow(/not valid JSON/);
    expect(() =>
      loadPublishableCatalog(
        tempFile(
          'count.json',
          JSON.stringify({
            schemaVersion: 1,
            generatedAt: '2026-10-09T17:50:05.760Z',
            totalSongs: 2,
            songs: [{ title: 'One', artist: 'A' }],
          }),
        ),
      ),
    ).toThrow(/totalSongs must equal/);
  });

  it('exits with an error when the catalog path is missing', () => {
    const result = spawnSync(
      process.execPath,
      ['--experimental-strip-types', 'scripts/validate-catalog.ts', path.join(tmpdir(), 'no-catalog.json')],
      { cwd: catalogWebRoot, encoding: 'utf8' },
    );

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toMatch(/missing/i);
  });
});

function tempFile(name: string, contents: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'karaoke-catalog-'));
  const file = path.join(dir, name);
  writeFileSync(file, contents);
  return file;
}
