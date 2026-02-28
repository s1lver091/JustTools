import { getRandomInt } from './crypto-random';

export type UsernameOptions = {
	addNumber: boolean;
	addSymbol: boolean;
	leetspeak: boolean;
};

function capitalize(str: string): string {
	return str[0].toUpperCase() + str.slice(1).toLowerCase();
}

function toLeetspeak(str: string): string {
	const map: Record<string, string> = {
		a: '4',
		e: '3',
		i: '1',
		o: '0',
		s: '5',
		t: '7'
	};
	return str
		.split('')
		.map((c) => map[c.toLowerCase()] ?? c)
		.join('');
}

export function generateUsername(
	adjectives: string[],
	nouns: string[],
	options: UsernameOptions
): string {
	const adj = adjectives[getRandomInt(adjectives.length)];
	const noun = nouns[getRandomInt(nouns.length)];
	let username = capitalize(adj) + capitalize(noun);

	if (options.leetspeak) {
		username = toLeetspeak(username);
	}
	if (options.addNumber) {
		username += String(getRandomInt(1000)).padStart(2, '0');
	}
	if (options.addSymbol) {
		const symbols = '_-.';
		username += symbols[getRandomInt(symbols.length)];
	}
	return username;
}
