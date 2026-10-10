import { readFileSync, statSync } from 'node:fs';
import { CatalogValidationError, validateCatalog, type PublicCatalog } from '../src/catalog.ts';

export function loadPublishableCatalog(filePath: string): PublicCatalog {
  let raw: string;
  try {
    const info = statSync(filePath);
    if (!info.isFile()) {
      throw new CatalogValidationError(`Catalog file is missing: ${filePath}`);
    }

    if (info.size === 0) {
      throw new CatalogValidationError(`Catalog file is empty: ${filePath}`);
    }

    raw = readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error instanceof CatalogValidationError) {
      throw error;
    }

    throw new CatalogValidationError(`Catalog file is missing: ${filePath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CatalogValidationError('Catalog file is not valid JSON.');
  }

  const catalog = validateCatalog(parsed);
  if (catalog.totalSongs === 0) {
    throw new CatalogValidationError('Catalog is empty. Refusing to publish.');
  }

  return catalog;
}
