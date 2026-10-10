import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workflow = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.github/workflows/publish-catalog.yml'),
  'utf8',
);

describe('Publish Karaoke Catalog workflow', () => {
  it('publishes only the static site from the exported catalog', () => {
    expect(workflow).toContain('name: Publish Karaoke Catalog');
    expect(workflow).toContain('workflow_dispatch');
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('pages: write');
    expect(workflow).toContain('id-token: write');
    expect(workflow).toContain('name: github-pages');
    expect(workflow).toContain('cancel-in-progress: false');
    expect(workflow).toContain('actions/checkout@v4');
    expect(workflow).toContain('actions/setup-node@v4');
    expect(workflow).toContain('actions/configure-pages@v5');
    expect(workflow).toContain('actions/upload-pages-artifact@v3');
    expect(workflow).toContain('actions/deploy-pages@v4');
    expect(workflow).toContain('npm ci');
    expect(workflow).toContain('npm test');
    expect(workflow).toContain('npm run validate:catalog');
    expect(workflow).toContain('npm run build');
    expect(workflow).toContain('public/karaoke-catalog.json');
    expect(workflow).toContain('path: dist');
    expect(workflow).not.toMatch(/sqlite|better-sqlite3|userData/i);
    expect(workflow).not.toContain('contents: write');
  });
});
