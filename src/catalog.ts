export const PAGE_SIZE = 50;

export const ALL_FILTER = 'all';
export const DIGIT_FILTER = '0-9';

export const LETTERS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
] as const;

export type LatinLetter = (typeof LETTERS)[number];
export type InitialLetter = LatinLetter | typeof DIGIT_FILTER;
export type InitialFilter = typeof ALL_FILTER | InitialLetter;
export type InitialMode = 'title' | 'artist';

export interface CatalogSong {
  readonly title: string;
  readonly artist: string;
}

export interface PublicCatalog {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly totalSongs: number;
  readonly songs: readonly CatalogSong[];
}

export interface IndexedSong {
  readonly title: string;
  readonly artist: string;
  readonly titleFolded: string;
  readonly artistFolded: string;
  readonly titleInitial: InitialLetter | '';
  readonly artistInitial: InitialLetter | '';
}

const CATALOG_KEYS = ['schemaVersion', 'generatedAt', 'totalSongs', 'songs'] as const;
const SONG_KEYS = ['title', 'artist'] as const;
const ISO_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
const APOSTROPHES = /['\u2019\u2018\u02BC\u00B4`]/g;

export class CatalogValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogValidationError';
  }
}

export function validateCatalog(value: unknown): PublicCatalog {
  if (!isRecord(value)) {
    throw new CatalogValidationError('Catalog must be an object.');
  }

  if (!hasExactKeys(value, CATALOG_KEYS)) {
    throw new CatalogValidationError('Catalog has unexpected or missing fields.');
  }

  if (value.schemaVersion !== 1) {
    throw new CatalogValidationError('schemaVersion must be 1.');
  }

  if (typeof value.generatedAt !== 'string' || !isIsoTimestamp(value.generatedAt)) {
    throw new CatalogValidationError('generatedAt must be an ISO-8601 timestamp.');
  }

  if (!Array.isArray(value.songs)) {
    throw new CatalogValidationError('songs must be an array.');
  }

  if (
    typeof value.totalSongs !== 'number' ||
    !Number.isInteger(value.totalSongs) ||
    value.totalSongs < 0
  ) {
    throw new CatalogValidationError('totalSongs must be a non-negative integer.');
  }

  if (value.totalSongs !== value.songs.length) {
    throw new CatalogValidationError('totalSongs must equal the number of songs.');
  }

  const songs = value.songs.map((song, index) => validateSong(song, index));

  return {
    schemaVersion: 1,
    generatedAt: value.generatedAt,
    totalSongs: value.totalSongs,
    songs,
  };
}

export function foldForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(APOSTROPHES, '')
    .replace(/[¿¡]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/ +/g, ' ');
}

export function initialOf(value: string): InitialLetter | '' {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return '';
  }

  const folded = trimmed.normalize('NFD').replace(/\p{M}+/gu, '');
  const point = folded.codePointAt(0);
  if (point === undefined) {
    return '';
  }

  const first = String.fromCodePoint(point);
  if (/^[0-9]$/.test(first)) {
    return DIGIT_FILTER;
  }

  const upper = first.toLocaleUpperCase('es');
  if (/^[A-Z]$/.test(upper)) {
    return upper as LatinLetter;
  }

  return '';
}

export function indexSongs(songs: readonly CatalogSong[]): IndexedSong[] {
  return songs.map((song) => ({
    title: song.title,
    artist: song.artist,
    titleFolded: foldForSearch(song.title),
    artistFolded: foldForSearch(song.artist),
    titleInitial: initialOf(song.title),
    artistInitial: initialOf(song.artist),
  }));
}

export function filterSongs(
  songs: readonly IndexedSong[],
  query: string,
  mode: InitialMode,
  letter: InitialFilter,
): IndexedSong[] {
  const foldedQuery = foldForSearch(query);

  return songs.filter((song) => {
    if (letter !== ALL_FILTER) {
      const initial = mode === 'title' ? song.titleInitial : song.artistInitial;
      if (initial !== letter) {
        return false;
      }
    }

    if (foldedQuery.length === 0) {
      return true;
    }

    return song.titleFolded.includes(foldedQuery) || song.artistFolded.includes(foldedQuery);
  });
}

function validateSong(value: unknown, index: number): CatalogSong {
  if (!isRecord(value)) {
    throw new CatalogValidationError(`Song at index ${index} must be an object.`);
  }

  if (!hasExactKeys(value, SONG_KEYS)) {
    throw new CatalogValidationError(`Song at index ${index} must contain only title and artist.`);
  }

  if (typeof value.title !== 'string') {
    throw new CatalogValidationError(`Song at index ${index} must have a title string.`);
  }

  if (typeof value.artist !== 'string') {
    throw new CatalogValidationError(`Song at index ${index} must have an artist string.`);
  }

  return {
    title: value.title,
    artist: value.artist,
  };
}

function isIsoTimestamp(value: string): boolean {
  return ISO_TIMESTAMP.test(value) && Number.isFinite(Date.parse(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}
