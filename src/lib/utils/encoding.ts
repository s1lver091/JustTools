export function toHex(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export function fromHex(hex: string): Uint8Array {
	const cleaned = hex.replace(/\s/g, '');
	if (cleaned.length % 2 !== 0) {
		throw new Error('Invalid hex string: odd number of characters');
	}
	const bytes = new Uint8Array(cleaned.length / 2);
	for (let i = 0; i < cleaned.length; i += 2) {
		const byte = parseInt(cleaned.slice(i, i + 2), 16);
		if (Number.isNaN(byte)) {
			throw new Error(`Invalid hex character at position ${i}`);
		}
		bytes[i / 2] = byte;
	}
	return bytes;
}

export function textToHex(input: string): string {
	const encoder = new TextEncoder();
	return toHex(encoder.encode(input).buffer as ArrayBuffer);
}

export function hexToText(hex: string): string {
	const bytes = fromHex(hex);
	const decoder = new TextDecoder();
	return decoder.decode(bytes);
}

export function toBase64(input: string): string {
	const encoder = new TextEncoder();
	const bytes = encoder.encode(input);
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

export function fromBase64(base64: string): string {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new TextDecoder().decode(bytes);
}

export function fromBase64Url(str: string): string {
	let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
	const pad = base64.length % 4;
	if (pad === 2) base64 += '==';
	else if (pad === 3) base64 += '=';
	return fromBase64(base64);
}

export function urlEncode(input: string): string {
	return encodeURIComponent(input);
}

export function urlDecode(input: string): string {
	return decodeURIComponent(input);
}
