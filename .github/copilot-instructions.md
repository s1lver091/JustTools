# Copilot Instructions — JustTools

JustTools is a browser-only productivity app built with SvelteKit 2 (SPA mode), Svelte 5, TypeScript (strict), Tailwind CSS v4, shadcn-svelte (Bits UI), and Vite 7. No server, no SSR, no uploads. All processing happens in the browser.

## Priorities

Every decision in this codebase must be evaluated in this order:

1. **Performance** — the app is client-only; slow code has nowhere to hide. Prefer native browser APIs, Web Workers for heavy work, lazy-loading per route, and `$state.raw` for large non-mutated data structures.
2. **Readability** — code is read far more often than it is written. Use descriptive names, keep functions short, keep nesting shallow (max 3 levels), and let the code speak for itself without explanatory comments.
3. **Maintainability** — structure code so that any file can be understood and modified in isolation. No shared mutable globals, no implicit coupling between modules, no duplication.

When any of these conflict, the higher-priority property wins.

## Tech stack versions (as of February 2026)

- Svelte 5 (runes: `$state`, `$derived`, `$effect`, `$props`)
- SvelteKit 2 with `adapter-static`, `ssr = false` on all routes
- Tailwind CSS v4 (CSS-first config via `@theme inline` in `layout.css`)
- shadcn-svelte backed by Bits UI v2
- TypeScript 5, strict mode
- Vite 7

Always consult the official documentation for the above before writing code. Do not guess API shapes or assume older Svelte 3/4 patterns still apply.

## Code style

- **Indentation:** tabs (enforced by Prettier)
- **Quotes:** single quotes in TypeScript/JavaScript; Prettier handles Svelte files
- **Trailing commas:** none
- **Print width:** 100 characters
- **Naming:**
  - Functions: `camelCase`
  - Variables and parameters: `lowerCamelCase`
  - Types and interfaces: `PascalCase`
  - Svelte components: `PascalCase.svelte`
  - Files that are not components: `kebab-case.ts`
- **Max indentation depth:** 3 levels. Refactor into smaller functions before going deeper.
- **Comments:** only when the intent cannot be expressed by the code itself. No inline commentary restating what the code does.
- **No repeated code.** Extract shared logic to `$lib/utils/` or a shared component before duplicating.

## Svelte 5 rules

- Use runes exclusively. Never use the legacy Options API (`export let`, stores from `svelte/store`, `$:`, `onMount` where `$effect` works).
- Shared reactive state lives in `*.svelte.ts` files as class-based stores. Use `$state` on class fields (public or private) — the compiler transforms them into `get`/`set` pairs on the prototype. This is the only pattern that guarantees reactivity across module boundaries. Do not export a reassignable `$state` variable directly from a module.
- `$effect` is an escape hatch for DOM manipulation and third-party library integration — not for synchronising state. Use `$derived` (or `$derived.by` for complex expressions) instead of `$effect` whenever you only need to compute a value from other state.
- Use `$effect.root(() => { $effect(() => { ... }); })` in class constructors to create long-lived effects outside the component lifecycle (e.g. syncing a store to the DOM).
- Use `$state.raw` for large arrays or objects that will be replaced wholesale rather than mutated. It skips the deep proxy and avoids unnecessary overhead.
- Spread props before explicit event handlers in component markup so the explicit handler always wins: `{...props} onclick={handler}`.
- Use `{@const X = obj.prop}` when using an object property as a component tag.
- Do not use `<svelte:component>` — pass the component class directly and use `{@const}` if needed.

## TypeScript rules

- Strict mode is on. No `any`, no `as unknown as T` casts without a comment explaining why.
- Prefer `type` over `interface` unless declaration merging is needed.
- All function parameters and return types must be explicitly typed when they are part of a public API (exported functions, store methods, component props).
- Use `import type` for type-only imports.

## Tailwind CSS v4 rules

- All CSS custom properties and `@theme inline` mappings live in `src/routes/layout.css`.
- Dark mode is driven by the `.dark` class on `<html>` via `@custom-variant dark (&:where(.dark, .dark *))`. Do not use `prefers-color-scheme` media queries in component styles.
- Colors are defined in `oklch`. Hue 25 is the brand red.
- Reference theme values in CSS using CSS variables (`var(--color-red-500)`), not the `theme()` function. The `theme()` function is deprecated in v4 in favour of CSS variables.
- Do not use `@apply` in Svelte `<style>` blocks without first adding `@reference "../../routes/layout.css"` at the top of the block, otherwise Tailwind utilities will not resolve. Prefer inline utility classes over `@apply` wherever possible.
- Do not use arbitrary values unless there is no utility equivalent.
- Tailwind utility classes are sorted automatically by `prettier-plugin-tailwindcss`. Do not sort them manually.

## Project structure rules

- Tool registry: `src/lib/tools.ts` is the single source of truth for the tool list. Adding a tool means adding one entry here and creating a matching route.
- **Before creating any UI component, check whether shadcn-svelte already provides it.** Add it with `npx shadcn-svelte@latest add <component>`. Never hand-write a component that shadcn-svelte offers (Button, Card, Input, Dialog, Tabs, Tooltip, Sheet, Badge, Separator, Label, Switch, Dropdown Menu, etc.).
- Shared UI components go in `src/lib/components/shared/` **only** when they have no shadcn-svelte equivalent (e.g. `FileDropzone`, `LoadingSpinner`, `ToolHeader`). shadcn-svelte components go in `src/lib/components/ui/` (managed by the shadcn CLI - do not edit generated files directly unless absolutely necessary).
- Web Workers go in `src/lib/workers/`. Each worker is a separate file. Workers communicate via structured messages with typed payloads.
- Svelte Actions (e.g., CodeMirror) go in `src/lib/actions/`.
- Global stores go in `src/lib/stores/` as `*.svelte.ts` files.
- Utility functions go in `src/lib/utils/` as `kebab-case.ts` files, grouped by domain.
- Every tool route must set `export const ssr = false` in its `+layout.ts` or `+page.ts`.

## Performance rules

- Heavy computation (PDF manipulation, image processing) must run in a Web Worker, not the main thread.
- Use `OffscreenCanvas` for image operations in workers.
- Lazy-load large libraries (pdf-lib, CodeMirror, FFmpeg.wasm, etc.) with dynamic `import()` inside the tool route, not at the app shell level.
- Do not import tool-specific code in `+layout.svelte`.

## What to avoid

- No `console.log` left in committed code. Use `console.error` only for genuine error reporting.
- No magic numbers. Name constants and put them at the top of the file or in a constants module.
- No barrel re-exports (`index.ts`) that import everything eagerly — this defeats code splitting.
- No direct DOM manipulation outside of Svelte Actions and the theme store.
- No `!important` in styles unless overriding a third-party component where there is no other option.
- No em dashes (`—`) anywhere in code, strings, comments, or CSS. Use a comma, period, or regular hyphen instead.
- No emoticons in code and components. Keep the codebase professional and accessible to all audiences.
- Never create a custom UI component that duplicates a shadcn-svelte component. Always use `npx shadcn-svelte@latest add <component>` first.
