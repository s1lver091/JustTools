import { getRandomInt, getRandomChars } from './crypto-random';

export type PassphraseOptions = {
	wordCount: number;
	separator: string;
	capitalize: boolean;
	addNumber: boolean;
};

export function generatePassphrase(wordlist: string[], options: PassphraseOptions): string {
	if (wordlist.length === 0) return '';
	const picked: string[] = [];
	for (let i = 0; i < options.wordCount; i++) {
		let word = wordlist[getRandomInt(wordlist.length)];
		if (options.capitalize) word = word[0].toUpperCase() + word.slice(1);
		picked.push(word);
	}
	let result = picked.join(options.separator);
	if (options.addNumber) {
		const numDigits = 2 + getRandomInt(3);
		result += options.separator + getRandomChars('0123456789', numDigits);
	}
	return result;
}
