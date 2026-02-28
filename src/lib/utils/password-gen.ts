import { getRandomChars } from './crypto-random';

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const AMBIGUOUS = '0O1lI';

export type PasswordOptions = {
	length: number;
	uppercase: boolean;
	lowercase: boolean;
	digits: boolean;
	symbols: boolean;
	excludeAmbiguous: boolean;
};

export function buildCharset(options: PasswordOptions): string {
	let charset = '';
	if (options.uppercase) charset += UPPERCASE;
	if (options.lowercase) charset += LOWERCASE;
	if (options.digits) charset += DIGITS;
	if (options.symbols) charset += SYMBOLS;
	if (options.excludeAmbiguous) {
		charset = charset
			.split('')
			.filter((c) => !AMBIGUOUS.includes(c))
			.join('');
	}
	return charset;
}

export function generatePassword(options: PasswordOptions): string {
	const charset = buildCharset(options);
	if (charset.length === 0) return '';
	return getRandomChars(charset, options.length);
}

export function calculateEntropy(charsetSize: number, length: number): number {
	if (charsetSize <= 0) return 0;
	return Math.floor(Math.log2(charsetSize) * length);
}
