import {
  ALL_FILTER,
  CatalogValidationError,
  DIGIT_FILTER,
  filterSongs,
  foldForSearch,
  indexSongs,
  initialOf,
  validateCatalog,
  type CatalogSong,
} from './catalog.ts';
import { catalogAssetUrl, GITHUB_PAGES_BASE } from './paths.ts';

const generatedAt = '2026-10-09T17:50:05.760Z';

describe('catalog validation', () => {
  it('accepts a valid catalog and keeps duplicate rows', () => {
    const songs = [
      { title: 'Dancing Queen', artist: 'ABBA' },
      { title: 'Dancing Queen', artist: 'ABBA' },
    ];
    const catalog = validateCatalog(catalogOf(songs));

    expect(catalog.schemaVersion).toBe(1);
    expect(catalog.generatedAt).toBe(generatedAt);
    expect(catalog.totalSongs).toBe(2);
    expect(catalog.songs).toEqual(songs);
    expect(catalog.songs[0]).not.toBe(songs[0]);
  });

  it('does not repair title and artist', () => {
    const song = { title: 'Queen', artist: 'Bohemian Rhapsody' };

    expect(validateCatalog(catalogOf([song])).songs).toEqual([song]);
  });

  it('accepts an empty song list as data and still reports zero songs', () => {
    const catalog = validateCatalog({
      schemaVersion: 1,
      generatedAt,
      totalSongs: 0,
      songs: [],
    });

    expect(catalog.totalSongs).toBe(0);
    expect(catalog.songs).toEqual([]);
  });

  it('rejects an incorrect totalSongs', () => {
    expect(() =>
      validateCatalog({
        schemaVersion: 1,
        generatedAt,
        totalSongs: 2,
        songs: [{ title: 'One', artist: 'A' }],
      }),
    ).toThrow(/totalSongs must equal/);
  });

  it.each([
    ['a missing catalog body', null],
    ['an array', []],
    ['a wrong schema version', { ...validBody(), schemaVersion: 2 }],
    ['a string schema version', { ...validBody(), schemaVersion: '1' }],
    ['a date without a time', { ...validBody(), generatedAt: '2026-10-09' }],
    ['an impossible timestamp', { ...validBody(), generatedAt: '2026-13-01T00:00:00.000Z' }],
    ['a fractional total', { ...validBody(), totalSongs: 1.5 }],
    ['a negative total', { ...validBody(), totalSongs: -1, songs: [] }],
    ['songs that are not an array', { ...validBody(), songs: 'no', totalSongs: 0 }],
    ['a song that is not an object', { ...validBody(), songs: [null] }],
    ['a missing artist', { ...validBody(), songs: [{ title: 'Only' }] }],
    ['a numeric title', { ...validBody(), songs: [{ title: 1, artist: 'A' }] }],
    [
      'a private file path',
      { ...validBody(), songs: [{ title: 'A', artist: 'B', filePath: 'C:\\secret.mp4' }] },
    ],
  ])('rejects %s', (_label, value) => {
    expect(() => validateCatalog(value)).toThrow(CatalogValidationError);
  });
});

describe('search and alphabetical filters', () => {
  const songs = indexSongs([
    { title: 'Héroes', artist: 'David Bowie' },
    { title: 'Corazón', artist: 'Alejandro Sanz' },
    { title: 'Niño', artist: 'Nino Bravo' },
    { title: "What's Up", artist: '4 Non Blondes' },
    { title: '¿Qué será?', artist: 'José José' },
    { title: 'Here Without You', artist: '3 Doors Down' },
    { title: 'Bohemian Rhapsody', artist: 'Queen' },
    { title: 'Dancing Queen', artist: 'ABBA' },
    { title: 'Dancing Queen', artist: 'ABBA' },
    { title: '1999', artist: 'Prince' },
    { title: 'Sin artista', artist: '' },
    { title: '  Ábreme', artist: 'Ñu' },
  ]);

  it('matches titles and artists without case or accents', () => {
    expect(titles(filterSongs(songs, 'heroes', 'title', ALL_FILTER))).toEqual(['Héroes']);
    expect(titles(filterSongs(songs, 'CORAZON', 'title', ALL_FILTER))).toEqual(['Corazón']);
    expect(titles(filterSongs(songs, 'nino', 'title', ALL_FILTER))).toEqual(['Niño']);
    expect(titles(filterSongs(songs, '  queen  ', 'artist', ALL_FILTER))).toEqual([
      'Bohemian Rhapsody',
      'Dancing Queen',
      'Dancing Queen',
    ]);
    expect(titles(filterSongs(songs, 'without', 'title', ALL_FILTER))).toEqual(['Here Without You']);
    expect(titles(filterSongs(songs, 'doors', 'artist', ALL_FILTER))).toEqual(['Here Without You']);
    expect(titles(filterSongs(songs, 'whats', 'title', ALL_FILTER))).toEqual(["What's Up"]);
    expect(titles(filterSongs(songs, 'que sera', 'title', ALL_FILTER))).toEqual(['¿Qué será?']);
    expect(filterSongs(songs, 'jose', 'artist', ALL_FILTER)[0]?.artist).toBe('José José');
    expect(filterSongs(songs, 'heroes', 'title', ALL_FILTER)[0]?.title).toBe('Héroes');
  });

  it('combines the search with the title or artist initial', () => {
    expect(initialOf('Héroes')).toBe('H');
    expect(initialOf('  Ábreme')).toBe('A');
    expect(initialOf('Ñu')).toBe('N');
    expect(initialOf('1999')).toBe(DIGIT_FILTER);
    expect(initialOf('   ')).toBe('');
    expect(foldForSearch(" ¿Qué será? ")).toBe('que sera');

    expect(titles(filterSongs(songs, 'heroes', 'title', 'H'))).toEqual(['Héroes']);
    expect(titles(filterSongs(songs, 'heroes', 'title', 'B'))).toEqual([]);
    expect(titles(filterSongs(songs, '', 'title', 'B'))).toEqual(['Bohemian Rhapsody']);
    expect(titles(filterSongs(songs, '', 'artist', 'Q'))).toEqual(['Bohemian Rhapsody']);
    expect(titles(filterSongs(songs, 'queen', 'artist', 'Q'))).toEqual(['Bohemian Rhapsody']);
    expect(titles(filterSongs(songs, 'queen', 'artist', 'A'))).toEqual([
      'Dancing Queen',
      'Dancing Queen',
    ]);
    expect(titles(filterSongs(songs, '', 'title', DIGIT_FILTER))).toEqual(['1999']);
    expect(titles(filterSongs(songs, '', 'title', ALL_FILTER))).toContain('1999');
    expect(titles(filterSongs(songs, '', 'title', ALL_FILTER))).toContain('Sin artista');
    expect(titles(filterSongs(songs, 'sin artista', 'title', ALL_FILTER))).toEqual(['Sin artista']);
    expect(titles(filterSongs(songs, '', 'artist', 'S'))).not.toContain('Sin artista');
    expect(titles(filterSongs(songs, '', 'artist', 'N'))).toEqual(['Niño', '  Ábreme']);
    expect(filterSongs(songs, 'abreme', 'title', 'A')[0]?.artist).toBe('Ñu');
    expect(filterSongs(songs, 'abreme', 'title', 'A')[0]?.title).toBe('  Ábreme');
  });

  it('keeps every duplicate and does not change the source rows', () => {
    const source: CatalogSong[] = [
      { title: 'Dancing Queen', artist: 'ABBA' },
      { title: 'Dancing Queen', artist: 'ABBA' },
    ];
    const indexed = indexSongs(source);

    expect(filterSongs(indexed, 'dancing', 'title', ALL_FILTER)).toHaveLength(2);
    expect(source).toEqual([
      { title: 'Dancing Queen', artist: 'ABBA' },
      { title: 'Dancing Queen', artist: 'ABBA' },
    ]);
    expect(indexed.map((song) => song.title)).toEqual(['Dancing Queen', 'Dancing Queen']);
  });

  it('filters a large catalog across the full list', () => {
    const many = Array.from({ length: 5000 }, (_, index) => ({
      title: index === 4999 ? 'Zulu Final' : index % 2 === 0 ? `Alpha ${index}` : `Zulu ${index}`,
      artist: index === 10 ? 'Ñu' : 'Queen',
    }));
    const indexed = indexSongs(many);
    const started = performance.now();
    const byTitle = filterSongs(indexed, '', 'title', 'A');
    const combined = filterSongs(indexed, 'zulu', 'title', 'Z');
    const byArtist = filterSongs(indexed, 'nu', 'artist', 'N');
    const elapsed = performance.now() - started;

    expect(byTitle).toHaveLength(2500);
    expect(combined).toHaveLength(2500);
    expect(combined.some((song) => song.title === 'Zulu Final')).toBe(true);
    expect(byArtist.map((song) => song.artist)).toEqual(['Ñu']);
    expect(elapsed).toBeLessThan(250);
  });
});

describe('GitHub Pages base path', () => {
  it('loads the catalog under /karaoke-glam-catalog/', () => {
    expect(GITHUB_PAGES_BASE).toBe('/karaoke-glam-catalog/');
    expect(catalogAssetUrl(GITHUB_PAGES_BASE)).toBe('/karaoke-glam-catalog/karaoke-catalog.json');
    expect(catalogAssetUrl('/karaoke-glam-catalog')).toBe('/karaoke-glam-catalog/karaoke-catalog.json');
    expect(catalogAssetUrl(GITHUB_PAGES_BASE)).not.toBe('/karaoke-catalog.json');
  });
});

function catalogOf(songs: readonly CatalogSong[]): unknown {
  return {
    schemaVersion: 1,
    generatedAt,
    totalSongs: songs.length,
    songs,
  };
}

function validBody(): {
  schemaVersion: number;
  generatedAt: string;
  totalSongs: number;
  songs: CatalogSong[];
} {
  return {
    schemaVersion: 1,
    generatedAt,
    totalSongs: 1,
    songs: [{ title: 'Here Without You', artist: '3 Doors Down' }],
  };
}

function titles(songs: readonly { title: string }[]): string[] {
  return songs.map((song) => song.title);
}
