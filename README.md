# JustTools

A collection of everyday productivity tools that run entirely in your browser. No servers, no uploads, no accounts. Your files never leave your machine.

**Live demo:** https://s1lver091.github.io/JustTools/

## Why this exists

I was tired of using services like ilovepdf, smallpdf, and similar tools. They require you to upload your files to their servers, they are often paywalled, and most importantly they handle data you may not want to share with anyone. A PDF can contain contracts, medical records, financial documents, things that have no business sitting on a random company's server.

So I built my own. Starting from a simple PDF editor, the idea grew: if you can do it for PDFs, you can do it for everything. I kept adding tools, and I plan to keep adding more.

This is my first open source project. I am experimenting and learning as I go, with some AI assistance for certain parts of the development.

## Core idea

Everything here is open source and runs locally. You can use the hosted version at the link above, or clone the repo and run it on your own machine. Either way, no data is sent anywhere.

**Client-only:** all processing happens in your browser via JavaScript, Web Workers, Canvas API, and WebAssembly where needed.
**No backend:** there is no server, no database, no API.
**No telemetry:** no analytics, no tracking, no cookies.
**Self-hostable:** clone, `npm install`, `npm run build`, done.

## Tools

### PDF Editor
Merge, split, reorder, rotate, delete pages, compress, convert, and annotate PDFs. Powered by pdf-lib and PDF.js, both running entirely in the browser.

### Markdown Editor
Side-by-side Markdown editor and live preview. Supports GitHub Flavored Markdown, syntax highlighting in code blocks, and export to PDF or HTML. Built on CodeMirror 6 and marked.

### Image Editor
Crop, resize, rotate, compress, and convert images. Lightroom-style adjustments (brightness, contrast, saturation, temperature) via WebGL shaders. EXIF viewer and remover. Everything runs on Canvas API and OffscreenCanvas in Web Workers.

### Local Network File Share
Peer-to-peer file transfer between two browsers on the same network. No server involved at any point. Connection is established via manual WebRTC offer/answer exchange: paste a code, get a code back, files transfer directly browser-to-browser.

## Running locally

```sh
git clone https://github.com/s1lver091/JustTools.git
cd JustTools
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

To build for production:

```sh
npm run build
npm run preview
```

## Tech stack

**SvelteKit 2** with adapter-static (SPA mode, no SSR), **Svelte 5** with runes, **Tailwind CSS v4**, **shadcn-svelte** (Bits UI), **TypeScript** strict mode, **Vite 7**.

## Contributing

Issues and pull requests are welcome. The project is structured so that each tool is an independent route. Adding a new tool means adding one entry to `src/lib/tools.ts` and creating a matching route under `src/routes/tools/`.

## License

MIT