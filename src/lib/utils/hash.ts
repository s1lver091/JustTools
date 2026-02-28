import { toHex } from './encoding';

export type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-512';

const ALL_ALGORITHMS: HashAlgorithm[] = ['SHA-1', 'SHA-256', 'SHA-512'];

export async function hashBuffer(buffer: ArrayBuffer, algorithm: HashAlgorithm): Promise<string> {
	const digest = await crypto.subtle.digest(algorithm, buffer);
	return toHex(digest);
}

export async function hashText(text: string, algorithm: HashAlgorithm): Promise<string> {
	const encoder = new TextEncoder();
	const buffer = encoder.encode(text).buffer as ArrayBuffer;
	return hashBuffer(buffer, algorithm);
}

export async function hashAllAlgorithms(
	input: string | ArrayBuffer
): Promise<Record<HashAlgorithm, string>> {
	const buffer =
		typeof input === 'string'
			? (new TextEncoder().encode(input).buffer as ArrayBuffer)
			: input;

	const results = await Promise.all(
		ALL_ALGORITHMS.map(async (alg) => [alg, await hashBuffer(buffer, alg)] as const)
	);

	return Object.fromEntries(results) as Record<HashAlgorithm, string>;
}
