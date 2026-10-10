/**
 * @vitest-environment jsdom
 */
import {
  EMPTY_CATALOG_MESSAGE,
  EMPTY_RESULTS_MESSAGE,
  ERROR_MESSAGE,
  FOOTER_MESSAGE,
  LOADING_MESSAGE,
  mountCatalogApp,
} from './app.ts';

const generatedAt = '2026-10-09T17:50:05.760Z';

describe('catalog website', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the brand while the catalog is loading, then the songs', async () => {
    let resolveLoad: (value: unknown) => void = () => undefined;
    const pending = new Promise<unknown>((resolve) => {
      resolveLoad = resolve;
    });
    const root = document.createElement('div');
    const done = mountCatalogApp(root, { loadCatalog: () => pending });

    expect(root.dataset.state).toBe('loading');
    expect(root.textContent).toContain('GLAM MUSIC PRESENTA');
    expect(root.textContent).toContain('KARAOKE GLAM');
    expect(root.textContent).toContain('Tu próxima canción empieza aquí');
    expect(root.textContent).toContain('Encuentra tu canción');
    expect(root.textContent).toContain('Canciones disponibles');
    expect(root.querySelector('input')?.getAttribute('placeholder')).toBe('Buscar título o artista...');
    expect(root.textContent).toContain(LOADING_MESSAGE);
    expect(root.querySelector('footer')?.textContent).toBe(FOOTER_MESSAGE);
    expect(root.querySelector('.controls')?.hasAttribute('hidden')).toBe(true);

    resolveLoad(catalog([{ title: 'Here Without You', artist: '3 Doors Down' }]));
    await done;

    expect(root.dataset.state).toBe('ready');
    expect(root.textContent).toContain('Here Without You');
    expect(root.textContent).toContain('3 Doors Down');
    expect(root.querySelector('.song .note')).not.toBeNull();
    expect(root.textContent).toContain('1 canción');
    expect(root.textContent).toContain('1 resultado');
    expect(buttonLabels(root).join(' ')).not.toMatch(/reproducir|pedir|cola|\bplay\b|queue/i);
  });

  it('shows a friendly error when the catalog cannot be loaded or is invalid', async () => {
    const failed = document.createElement('div');
    await mountCatalogApp(failed, {
      loadCatalog: () => Promise.reject(new Error('network down')),
    });

    expect(failed.dataset.state).toBe('error');
    expect(failed.textContent).toContain(ERROR_MESSAGE);
    expect(failed.textContent).not.toContain('network down');
    expect(failed.querySelectorAll('.song')).toHaveLength(0);

    const invalid = document.createElement('div');
    await mountCatalogApp(invalid, {
      loadCatalog: () => Promise.resolve({ schemaVersion: 2 }),
    });

    expect(invalid.dataset.state).toBe('error');
    expect(invalid.textContent).toContain(ERROR_MESSAGE);
    expect(invalid.textContent).toContain('KARAOKE GLAM');
  });

  it('renders titles and artists as text', async () => {
    const title = '<img src=x onerror=alert(1)>';
    const artist = '<script>alert(1)</script>';
    const root = document.createElement('div');
    await mountCatalogApp(root, {
      loadCatalog: () => Promise.resolve(catalog([{ title, artist }])),
    });

    const list = root.querySelector('.songs');
    expect(list?.querySelector('img, script')).toBeNull();
    expect(list?.innerHTML).not.toContain('<img');
    expect(list?.innerHTML).not.toContain('<script');
    expect(list?.textContent).toContain(title);
    expect(list?.textContent).toContain(artist);
  });

  it('combines search with title and artist initials and keeps duplicates', async () => {
    const root = document.createElement('div');
    await mountCatalogApp(root, {
      loadCatalog: () =>
        Promise.resolve(
          catalog([
            { title: 'Héroes', artist: 'David Bowie' },
            { title: 'Bohemian Rhapsody', artist: 'Queen' },
            { title: 'Dancing Queen', artist: 'ABBA' },
            { title: 'Dancing Queen', artist: 'ABBA' },
            { title: '1999', artist: 'Prince' },
            { title: 'Sin artista', artist: '' },
            { title: 'Ábreme', artist: 'Ñu' },
          ]),
        ),
    });

    setSearch(root, 'heroes');
    expect(songTitles(root)).toEqual(['Héroes']);

    setSearch(root, 'QUEEN');
    clickLetter(root, 'B');
    expect(songTitles(root)).toEqual(['Bohemian Rhapsody']);

    clickMode(root, 'Inicial de artista');
    clickLetter(root, 'A');
    expect(songTitles(root)).toEqual(['Dancing Queen', 'Dancing Queen']);

    setSearch(root, '');
    clickLetter(root, 'all');
    clickMode(root, 'Inicial de canción');
    clickLetter(root, '0-9');
    expect(songTitles(root)).toEqual(['1999']);

    clickLetter(root, 'all');
    expect(songTitles(root)).toContain('Sin artista');
    expect(songTitles(root)).toContain('1999');

    setSearch(root, 'sin artista');
    expect(songTitles(root)).toEqual(['Sin artista']);

    setSearch(root, '');
    clickMode(root, 'Inicial de artista');
    clickLetter(root, 'N');
    expect(songTitles(root)).toEqual(['Ábreme']);
    expect(root.textContent).toContain('Ñu');

    setSearch(root, 'zzzz-no-match');
    expect(root.dataset.state).toBe('empty-results');
    expect(root.textContent).toContain(EMPTY_RESULTS_MESSAGE);
    expect(root.textContent).toContain('0 resultados');
  });

  it('shows a friendly state when the catalog has no songs', async () => {
    const root = document.createElement('div');
    await mountCatalogApp(root, {
      loadCatalog: () =>
        Promise.resolve({
          schemaVersion: 1,
          generatedAt,
          totalSongs: 0,
          songs: [],
        }),
    });

    expect(root.dataset.state).toBe('empty');
    expect(root.textContent).toContain(EMPTY_CATALOG_MESSAGE);
    expect(root.querySelectorAll('.song')).toHaveLength(0);
  });

  it('searches the full catalog while rendering one page', async () => {
    const songs = Array.from({ length: 120 }, (_, index) => ({
      title: `Song ${index}`,
      artist: index === 119 ? 'Hidden Artist' : 'Queen',
    }));
    const root = document.createElement('div');
    await mountCatalogApp(root, {
      pageSize: 2,
      loadCatalog: () => Promise.resolve(catalog(songs)),
    });

    expect(root.querySelectorAll('.song')).toHaveLength(2);
    expect(root.textContent).toContain('120 canciones');
    expect(root.textContent).toContain('120 resultados');
    expect(root.textContent).toContain('mostrando 2');

    setSearch(root, 'song 119');
    expect(songTitles(root)).toEqual(['Song 119']);
    expect(root.textContent).toContain('Hidden Artist');
    expect(root.textContent).toContain('1 resultado');

    setSearch(root, '');
    clickText(root, 'Cargar más');
    expect(root.querySelectorAll('.song')).toHaveLength(4);
  });
});

function catalog(songs: readonly { title: string; artist: string }[]): unknown {
  return {
    schemaVersion: 1,
    generatedAt,
    totalSongs: songs.length,
    songs,
  };
}

function setSearch(root: ParentNode, value: string): void {
  const input = root.querySelector('input');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Search input is missing.');
  }

  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function clickLetter(root: ParentNode, letter: string): void {
  const button = root.querySelector(`button[data-letter="${letter}"]`);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Letter ${letter} is missing.`);
  }

  button.click();
}

function clickMode(root: ParentNode, label: string): void {
  clickText(root, label);
}

function clickText(root: ParentNode, label: string): void {
  const button = [...root.querySelectorAll('button')].find((item) => item.textContent === label);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button ${label} is missing.`);
  }

  button.click();
}

function songTitles(root: ParentNode): string[] {
  return [...root.querySelectorAll('.song-title')].map((item) => item.textContent ?? '');
}

function buttonLabels(root: ParentNode): string[] {
  return [...root.querySelectorAll('button')].map((item) => item.textContent ?? '');
}
