/** Project-site base path for https://epanadero.github.io/karaoke-glam-catalog/ */
export const GITHUB_PAGES_BASE = '/karaoke-glam-catalog/';

export function catalogAssetUrl(base: string): string {
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return `${normalized}karaoke-catalog.json`;
}
