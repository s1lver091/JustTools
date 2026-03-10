import { base } from '$app/paths';

export type UnicodeChar = {
	char: string;
	name: string;
	category: string;
	codepoint: string;
};

const CATEGORY_ORDER = [
	'Emoji',
	'Arrows',
	'Math',
	'Currency',
	'Box Drawing',
	'Dingbats',
	'Latin Extended'
] as const;

let cache: UnicodeChar[] | null = null;

export async function loadUnicodeChars(): Promise<UnicodeChar[]> {
	if (cache) return cache;
	const response = await fetch(`${base}/data/unicode-chars.json`);
	cache = (await response.json()) as UnicodeChar[];
	return cache;
}

export function searchChars(chars: UnicodeChar[], query: string): UnicodeChar[] {
	const trimmed = query.trim();
	if (!trimmed) return chars;

	const lower = trimmed.toLowerCase();

	// Exact char match takes priority
	if ([...trimmed].length === 1) {
		const exact = chars.filter((c) => c.char === trimmed);
		if (exact.length > 0) return exact;
	}

	// U+xxxx codepoint lookup
	const cpMatch = trimmed.match(/^u\+?([0-9a-f]+)$/i);
	if (cpMatch) {
		const cp = cpMatch[1].toUpperCase();
		return chars.filter((c) => c.codepoint.toUpperCase() === cp);
	}

	// Name / keyword search
	return chars.filter((c) => c.name.toLowerCase().includes(lower));
}

export function getOrderedCategories(chars: UnicodeChar[]): string[] {
	const present = new Set(chars.map((c) => c.category));
	const result: string[] = CATEGORY_ORDER.filter((cat) => present.has(cat));
	for (const cat of present) {
		if (!result.includes(cat)) {
			result.push(cat);
		}
	}
	return result;
}
