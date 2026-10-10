# Karaoke Glam Catalog

Public song list for Karaoke Glam. Guests can search the catalog and ask the team for a song. The site does not play videos, queue songs, or send requests.

Public URL: https://epanadero.github.io/karaoke-glam-catalog/

This website is a static snapshot. It is not connected to the Karaoke Manager desktop application. Updating the desktop library does not change this site until a new export is copied here and published.

## Stack

- Vite 7
- TypeScript
- Vitest
- No runtime dependencies
- GitHub Pages, deployed by GitHub Actions

## Local development

Requires Node.js 22.18 or newer.

```bash
npm ci
npm run dev
```

The dev server opens at http://127.0.0.1:5173/karaoke-glam-catalog/

Scripts, styles, and the catalog use that base path, the same path GitHub Pages uses for this project site.

## Testing and building

```bash
npm test
npm run validate:catalog
npm run build
npm run preview
```

`npm run validate:catalog` checks `public/karaoke-catalog.json` before a build is published. `npm test` covers search, filters, pagination, safe text rendering, catalog validation, the production build, and the deployment workflow. `npm run build` writes the static site to `dist/`.

## Catalog JSON

The site loads one file, `public/karaoke-catalog.json`, once, and filters it in the browser.

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-10-09T17:50:05.760Z",
  "totalSongs": 643,
  "songs": [
    {
      "title": "Here Without You",
      "artist": "3 Doors Down"
    }
  ]
}
```

`totalSongs` must equal `songs.length`. Each song has only `title` and `artist`. Duplicate rows and empty artist strings are kept. The file must not contain ids, file paths, filenames, or other private fields.

Validation refuses a missing file, malformed JSON, an unsupported schema, a mismatched `totalSongs`, unexpected fields, or an empty catalog.

## Update the catalog

Karaoke Manager remains the source of truth. This repository only stores the exported snapshot.

1. Open Karaoke Manager.
2. Export the catalog from Settings.
3. Replace `public/karaoke-catalog.json` in this public repository with that file. Do not edit titles, artists, or order by hand.
4. Commit and push.
5. Open GitHub Actions in this public repository.
6. Run **Publish Karaoke Catalog**.
7. Verify https://epanadero.github.io/karaoke-glam-catalog/

An export that is not committed and published does not change the website.

## Publish workflow

The workflow file is `.github/workflows/publish-catalog.yml`. It runs only when started manually (`workflow_dispatch`) from the default branch.

It checks out this repository, installs dependencies with `npm ci`, validates the catalog, runs the tests, builds the site, confirms `dist/karaoke-catalog.json` matches `public/karaoke-catalog.json`, and deploys that `dist/` folder with the official GitHub Pages actions. A validation or build failure stops the deployment, so the previous site stays online.

The workflow uses `contents: read`, `pages: write`, and `id-token: write`. It does not use a personal access token or a repository secret.

## GitHub Pages

Before the first deployment:

1. Open this repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.

The site is a project page, so its files are served under `/karaoke-glam-catalog/`. No custom domain is configured.
