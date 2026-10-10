import {
  ALL_FILTER,
  DIGIT_FILTER,
  LETTERS,
  filterSongs,
  indexSongs,
  validateCatalog,
  type IndexedSong,
  type InitialFilter,
  type InitialMode,
  PAGE_SIZE,
} from './catalog.ts';
import { catalogAssetUrl } from './paths.ts';

export const LOADING_MESSAGE = 'Cargando el catálogo…';
export const ERROR_MESSAGE =
  'No se ha podido mostrar el catálogo. El archivo no está disponible o no tiene el formato esperado.';
export const EMPTY_RESULTS_MESSAGE = 'No hay canciones que coincidan con tu búsqueda.';
export const EMPTY_CATALOG_MESSAGE = 'El catálogo todavía no tiene canciones.';
export const FOOTER_MESSAGE = 'Elige tu canción y pídela al equipo de Karaoke Glam.';

export interface CatalogAppOptions {
  readonly loadCatalog?: () => Promise<unknown>;
  readonly pageSize?: number;
}

export function mountCatalogApp(root: HTMLElement, options: CatalogAppOptions = {}): Promise<void> {
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const loadCatalog =
    options.loadCatalog ??
    (async () => {
      const response = await fetch(catalogAssetUrl(import.meta.env.BASE_URL));
      if (!response.ok) {
        throw new Error(`Catalog request failed with status ${response.status}.`);
      }

      return response.json() as Promise<unknown>;
    });

  root.replaceChildren();
  root.className = 'catalog-app';
  root.dataset.state = 'loading';

  const header = document.createElement('header');
  header.className = 'masthead';
  const kicker = document.createElement('p');
  kicker.className = 'kicker';
  kicker.textContent = 'GLAM MUSIC PRESENTA';
  const heading = document.createElement('h1');
  const headingLead = document.createElement('span');
  headingLead.textContent = 'KARAOKE';
  const headingSpace = document.createElement('span');
  headingSpace.className = 'title-space';
  headingSpace.textContent = ' ';
  const headingMark = document.createElement('span');
  headingMark.textContent = 'GLAM';
  heading.append(headingLead, headingSpace, headingMark);
  const subtitle = document.createElement('p');
  subtitle.className = 'subtitle';
  subtitle.textContent = 'Tu próxima canción empieza aquí';
  header.append(kicker, heading, subtitle);

  const controls = document.createElement('section');
  controls.className = 'controls';
  controls.hidden = true;

  const searchLabel = document.createElement('label');
  searchLabel.className = 'search';
  const searchCaption = document.createElement('span');
  searchCaption.className = 'field-label';
  searchCaption.textContent = 'Encuentra tu canción';
  const search = document.createElement('input');
  search.type = 'search';
  search.id = 'catalog-search';
  search.placeholder = 'Buscar título o artista...';
  search.autocomplete = 'off';
  search.autocapitalize = 'off';
  search.spellcheck = false;
  search.enterKeyHint = 'search';
  search.setAttribute('aria-label', 'Buscar por título o artista');
  searchLabel.append(searchCaption, search);

  const modeGroup = document.createElement('div');
  modeGroup.className = 'modes';
  modeGroup.setAttribute('role', 'group');
  modeGroup.setAttribute('aria-label', 'Filtro por inicial');
  const titleMode = modeButton('Inicial de canción');
  const artistMode = modeButton('Inicial de artista');
  modeGroup.append(titleMode, artistMode);

  const letterLabel = document.createElement('p');
  letterLabel.className = 'field-label';
  letterLabel.id = 'letter-filter-label';
  letterLabel.textContent = 'Letra';
  const letters = document.createElement('div');
  letters.className = 'letters';
  letters.setAttribute('role', 'group');
  letters.setAttribute('aria-labelledby', 'letter-filter-label');

  const filters: InitialFilter[] = [ALL_FILTER, DIGIT_FILTER, ...LETTERS];
  const letterButtons = new Map<InitialFilter, HTMLButtonElement>();
  for (const filter of filters) {
    const letterButton = document.createElement('button');
    letterButton.type = 'button';
    letterButton.textContent = letterLabelFor(filter);
    letterButton.dataset.letter = filter;
    letters.append(letterButton);
    letterButtons.set(filter, letterButton);
  }

  const resultsTitle = document.createElement('h2');
  resultsTitle.className = 'results-title';
  resultsTitle.textContent = 'Canciones disponibles';
  const counts = document.createElement('p');
  counts.className = 'counts';
  counts.setAttribute('aria-live', 'polite');
  controls.append(searchLabel, modeGroup, letterLabel, letters, resultsTitle, counts);

  const message = document.createElement('p');
  message.className = 'message';
  message.setAttribute('role', 'status');
  message.textContent = LOADING_MESSAGE;

  const list = document.createElement('ul');
  list.className = 'songs';
  list.id = 'song-list';
  list.setAttribute('aria-label', 'Canciones');

  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'more';
  more.textContent = 'Cargar más';
  more.hidden = true;
  more.setAttribute('aria-controls', list.id);

  const footer = document.createElement('footer');
  footer.textContent = FOOTER_MESSAGE;

  root.append(header, controls, message, list, more, footer);

  let mode: InitialMode = 'title';
  let letter: InitialFilter = ALL_FILTER;
  let songs: IndexedSong[] = [];
  let totalSongs = 0;
  let visibleCount = pageSize;
  let ready = false;

  const apply = (): void => {
    if (!ready) {
      return;
    }

    const matches = filterSongs(songs, search.value, mode, letter);
    const visible = matches.slice(0, visibleCount);
    renderSongs(list, visible);
    counts.textContent = formatCounts(totalSongs, matches.length, visible.length);
    titleMode.setAttribute('aria-pressed', mode === 'title' ? 'true' : 'false');
    artistMode.setAttribute('aria-pressed', mode === 'artist' ? 'true' : 'false');
    for (const [value, element] of letterButtons) {
      element.setAttribute('aria-pressed', value === letter ? 'true' : 'false');
    }

    if (totalSongs === 0) {
      message.hidden = false;
      message.textContent = EMPTY_CATALOG_MESSAGE;
      more.hidden = true;
      root.dataset.state = 'empty';
      return;
    }

    if (matches.length === 0) {
      message.hidden = false;
      message.textContent = EMPTY_RESULTS_MESSAGE;
      more.hidden = true;
      root.dataset.state = 'empty-results';
      return;
    }

    message.hidden = true;
    message.textContent = '';
    more.hidden = visible.length >= matches.length;
    root.dataset.state = 'ready';
  };

  search.addEventListener('input', () => {
    visibleCount = pageSize;
    apply();
  });
  titleMode.addEventListener('click', () => {
    mode = 'title';
    visibleCount = pageSize;
    apply();
  });
  artistMode.addEventListener('click', () => {
    mode = 'artist';
    visibleCount = pageSize;
    apply();
  });
  for (const [value, element] of letterButtons) {
    element.addEventListener('click', () => {
      letter = value;
      visibleCount = pageSize;
      apply();
    });
  }
  more.addEventListener('click', () => {
    visibleCount += pageSize;
    apply();
  });

  return loadCatalog()
    .then((payload) => {
      const catalog = validateCatalog(payload);
      songs = indexSongs(catalog.songs);
      totalSongs = catalog.totalSongs;
      ready = true;
      controls.hidden = false;
      apply();
    })
    .catch((error: unknown) => {
      console.error(error);
      ready = false;
      controls.hidden = true;
      list.replaceChildren();
      more.hidden = true;
      message.hidden = false;
      message.textContent = ERROR_MESSAGE;
      root.dataset.state = 'error';
    });
}

function renderSongs(list: HTMLUListElement, songs: readonly IndexedSong[]): void {
  const fragment = document.createDocumentFragment();
  for (const song of songs) {
    const item = document.createElement('li');
    item.className = 'song';
    const copy = document.createElement('div');
    copy.className = 'song-copy';
    const title = document.createElement('p');
    title.className = 'song-title';
    title.textContent = song.title;
    const artist = document.createElement('p');
    artist.className = 'song-artist';
    artist.textContent = song.artist;
    copy.append(title, artist);
    item.append(noteIcon(), copy);
    fragment.append(item);
  }

  list.replaceChildren(fragment);
}

function formatCounts(total: number, matches: number, visible: number): string {
  const songLabel = total === 1 ? '1 canción' : `${total} canciones`;
  const resultLabel = matches === 1 ? '1 resultado' : `${matches} resultados`;
  if (visible < matches) {
    return `${songLabel} · ${resultLabel} · mostrando ${visible}`;
  }

  return `${songLabel} · ${resultLabel}`;
}

function noteIcon(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('note');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('fill', 'currentColor');
  path.setAttribute('d', 'M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z');
  svg.append(path);
  return svg;
}

function modeButton(label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  return button;
}

function letterLabelFor(filter: InitialFilter): string {
  if (filter === ALL_FILTER) {
    return 'Todas';
  }

  if (filter === DIGIT_FILTER) {
    return '0–9';
  }

  return filter;
}
