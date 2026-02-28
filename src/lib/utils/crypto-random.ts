/**
 * Cryptographically secure random number utilities.
 * Uses crypto.getRandomValues() exclusively - never Math.random().
 */

/** Returns a cryptographically secure random integer in [0, max). */
export function getRandomInt(max: number): number {
	const array = new Uint32Array(1);
	crypto.getRandomValues(array);
	return array[0] % max;
}

/** Returns a string of `length` random characters chosen from `charset`. */
export function getRandomChars(charset: string, length: number): string {
	let result = '';
	for (let i = 0; i < length; i++) {
		result += charset[getRandomInt(charset.length)];
	}
	return result;
}
