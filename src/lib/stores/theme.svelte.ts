import { browser } from '$app/environment';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'justtools-theme';

function getInitialTheme(): Theme {
	if (!browser) return 'system';
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
	return 'system';
}

function resolveTheme(pref: Theme): 'light' | 'dark' {
	if (!browser) return 'light';
	if (pref === 'system')
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	return pref;
}

function applyToDOM(resolved: 'light' | 'dark') {
	if (!browser) return;
	document.documentElement.classList.toggle('dark', resolved === 'dark');
}

/**
 * Reactive theme store using the Svelte 5 class-based $state pattern.
 * DOM sync is driven by $effect.root so it automatically re-runs
 * whenever #pref changes, no manual applyToDOM calls needed.
 */
class ThemeStore {
	#pref = $state<Theme>(getInitialTheme());

	constructor() {
		// $effect.root creates a long-lived effect outside any component lifetime.
		// The inner $effect tracks this.resolved (which reads #pref) and keeps
		// the <html> class in sync every time the preference changes.
		$effect.root(() => {
			$effect(() => {
				applyToDOM(this.resolved);
			});
		});
	}

	get current(): Theme {
		return this.#pref;
	}

	get resolved(): 'light' | 'dark' {
		return resolveTheme(this.#pref);
	}

	get isDark(): boolean {
		return resolveTheme(this.#pref) === 'dark';
	}

	set(value: Theme) {
		this.#pref = value;
		if (browser) localStorage.setItem(STORAGE_KEY, value);
	}

	toggle() {
		this.set(this.isDark ? 'light' : 'dark');
	}
}

export const theme = new ThemeStore();

// React to OS preference changes when the user has chosen 'system'
if (browser) {
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		if (theme.current === 'system') applyToDOM(theme.resolved);
	});
}
