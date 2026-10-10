import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CatalogValidationError } from '../src/catalog.ts';
import { loadPublishableCatalog } from './load-publishable-catalog.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultCatalog = path.resolve(scriptDir, '../public/karaoke-catalog.json');
const catalogPath = path.resolve(process.argv[2] ?? defaultCatalog);

try {
  const catalog = loadPublishableCatalog(catalogPath);
  console.log(`Catalog is valid: ${catalog.totalSongs} songs, generated at ${catalog.generatedAt}.`);
} catch (error) {
  const message =
    error instanceof CatalogValidationError ? error.message : 'Catalog validation failed.';
  console.error(message);
  process.exit(1);
}
