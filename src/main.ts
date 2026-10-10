import './style.css';
import { mountCatalogApp } from './app.ts';

const root = document.querySelector('#app');
if (!(root instanceof HTMLElement)) {
  throw new Error('Catalog root #app is missing.');
}

void mountCatalogApp(root);
