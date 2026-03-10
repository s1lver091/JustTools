export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	downloadUrl(url, filename);
	URL.revokeObjectURL(url);
}

export function downloadText(content: string, filename: string, mimeType = 'text/plain'): void {
	downloadBlob(new Blob([content], { type: mimeType }), filename);
}

export function downloadUrl(url: string, filename: string): void {
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
}
